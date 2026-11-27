---
id: REQ-20261123-008
feature: MCP图片可读
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 2
tags: [feat, integration]
depends_on: []
author: AI
document_type: design
---

# 设计：MCP 工具返回图片与文档附图可被 AI 读取

**关联**：事件 `#78`（收口跟踪）；口径与 `REQ-20261123-006`（用户上传图片）保持一致
**版本**：v2 —— 按 `design-review.md` v1 修 **B1~B3 / S1 / W1~W6**，并新增 §2.3「现实覆盖率」（抽样发现）
**证据基础**：`../2026-11-23-AI对话图片输入/demo/verify/verify-report.md`（真实上游实测）+ §2.3 真实 KB 抽样

**默认假设**：单机部署、单次分析串行取图、单张 KB 图多数 < 1MB。

---

## 1. 目标与非目标

**目标**：让模型在读知识库文档时，能真正看到其中图片的像素内容，而不是只看到 `![](assets/x.png)` 这串字符。

**非目标**：
- 图片生成 / 出图（沿用 V1 的 D9）
- 把图片嵌进前端对话渲染（展示层另议）
- 本地 OCR 文本抽取（图片按原样交给视觉模型）
- **首批覆盖 `ki_get_module_info` + `ki_event_get`**（Q2 已拍板）；`ki_search` 的清单不做（见 §11 P2）
- **不做工具图片总开关**（Q1 已拍板）：成本由 D6 上限与 D5 预算口径兜底；**也不要**复用 `supportsImages` —— 那是用户上传侧语义，混用会让两件事无法独立关闭
- **前端不渲染工具图片**（Q3 已拍板）：时间线显示「图片×N」占位文案即可
- **不做除 SVG 外的格式转换**（GIF/BMP/ICO/AVIF 仍按不支持处理，不会转码）

---

## 2. 现状

### 2.1 链路现状

```
ki_get_module_info / ki_search / ki_event_get
  └─ content: [{ type:'text', text: JSON.stringify(result) }]     ← 唯一形态，无 image content
       ▼
serializeToolResponse：JSON.stringify → 按 10000 字符二分截断      ← tool-response.ts:32
       ▼
messages.push({ role:'tool', content: 文本 })                      ← tool-loop.ts:956
       ▼
模型：只看到路径字符串
```

### 2.2 已验证前提（真实上游实测，非推断）

| # | 结论 |
|---|---|
| C1 | 上游支持 `content` 数组 + `data:` URI，模型能准确读图 |
| **C2** | **`role:'tool'` 消息可直接承载 `image_url`，且模型确实读取**（回答中主动说明"颜色名来自结果中附带的图片"）⇒ 不需要把图挪到 user 消息，**不触碰**「上游 messages 末条恒为本轮 user」不变量 |
| C3 | `image_tokens` 只随**像素尺寸**变化，与文件体积无关（1024² 的 6KB 与 71KB 同为 652） |
| C5 | `data:image/svg+xml` 被上游硬拒（400 `UnidentifiedImageError`） |

### 2.3 现实覆盖率（2026-11-23 抽样，30 个 assets 目录）

| Scope | 图片形态 | 结论 |
|---|---|---|
| `consul` | **1370 个 `.svg`，仅 1 个 `.png`** | 必须靠 SVG 栅格化（§3.2）才有图可读 |
| `ai-docs` | 有 `.png`，且带子目录（`assets/image/知识库录入/xxx.png`） | 可用，但 ref 含多级子目录 |

**引用形态抽样**（`grep` 实测）：

```
./assets/learning-path-overview.svg     ← 带 ./ 前缀（多数）
assets/x.png                            ← 裸相对
../assets/04-global-health-check.svg    ← 跨父级
images/a.png                            ← 子目录
```

**落点事实**：导入侧把 `./assets/x.svg` 复制到 `{group}/assets/assets/x.svg`（**双层 assets**）。这与 `/api/asset` 的 `path.join(assetsDir, decoded)` 恰好自洽 —— `./assets/x.svg` 归一化后为 `assets/x.svg`，拼出 `assets/assets/x.svg` ✓。而 `../assets/…` 归一化后仍在 assetsDir 之外，被双锚点拦下（403）⇒ **预期**这类引用在页面上也落为占位块（前端 `rewriteAssetSrc` 原样透传、后端 403；**页面表现未实测，属推断**，见 §11 P6）。

> ⇒ 设计必须按"归一化后的相对路径**原样拼接**"，不能取 basename，也不能假设单层 assets。

---

## 3. 方案

```
① 工具返回体附加结构化图片清单（只给元数据）
   ki_get_module_info → { ok, content, revision, totalLines,
                          images: [ { index, ref, mime, width?, height?, bytes, supported, reason? } ] }
   └─ 正文 `![](assets/x.png)` 原样保留
   └─ 解析复用 `extractImageRefs(mdText)`（import.ts:576，已覆盖 md + <img>、跳过代码围栏）

② 模型按需取图
   ki_get_image(group, ref)            ← scope 由 run(scope,args) 注入，不进 schema（B1）
     → 返回判别形状 { kind:'images', text, images:[{mimeType,data,ref,bytes,width?,height?}] }

③ tool-loop 在**序列化之前**分流（B2）
   ├─ text  → serializeToolResponse → tool 消息的 text part + tool_end.response（只放文本）
   └─ images → 转 image_url parts，**追加到同一条 tool 消息的 content 数组**
   结果形状：{ role:'tool', tool_call_id, content:[ {type:'text',…}, {type:'image_url',…} ] }

④ 旧图降级（B3）：每轮 push 新 tool 消息**之前**，把更早的图片 part 换成 `[图片×N（已省略）]`
   └─ 跨用户轮次天然满足：conv.messages 只存字符串，历史轮次的图不会重建 → 无需额外逻辑

⑤ 取字节：resolveAssetImage(scope, group, ref)
   = 归一化 ref → 双锚点校验（复用 /api/asset，mcp-http-api.ts:2184-2200）→ readFileSync → base64
   └─ 进程内读文件，不依赖 127.0.0.1 可达性
```

### 3.1 调用时序（先于上限定义）

```
模型 round N
  ├─ 调 ki_get_module_info(group,relation)
  │    └─ 返回正文 + images 清单（含 3 张 PNG、supported 全 true）
  ├─ 判断需要看第 2 张 → 调 ki_get_image(group, ref#2)
  │    ├─ submitScoped('ki_get_image', scope, …) 排队 + withTimeout
  │    ├─ resolveAssetImage → 校验 → 读字节 → { kind:'images', … }
  │    └─ tool-loop: ① 降级更早的图 ② push [text, image_url]
  └─ 下一轮上游请求带上该图 → 模型作答

模型 round N+1（同一生成内）
  ├─ 若还要看第 3 张 → 再调一次（受单次 ≤3 张约束）
  └─ 若已够 → 直接作答（不再取图）
```

**被拒时的出路**：超出单次张数 → 返回 `IMAGE_QUERY_LIMIT` 并说明"可分批再取"，模型可再发一次请求；不做静默截断。

### 3.2 SVG 栅格化（规格，2026-11-23 拍板）

```
输入：assets 下的 .svg（走 §6.4 归一化 + 双锚点校验后的本地文件，≤4MB）
处理：new Resvg(svgText, { fitTo:{mode:'width', value:1568},
                           font:{loadSystemFonts:true}, background:'white' })
        .render().asPng()
输出：PNG（实测 1568×743 / 150KB / 704 image_tokens）
缓存：key = (scope, group, ref, mtimeMs, size)，LRU 上限 50 张 / 200MB
线程：worker_threads 单线程串行（render 是同步 CPU 调用，见下"性能"）
```

| 参数 | 取值 | 依据 |
|---|---|---|
| 最大宽 | **1568** | 上游尺寸拐点（1568² = 994 tokens 封顶）；实测 1568 宽 → 704 tokens |
| 背景 | 白 | SVG 常无背景，透明 PNG 送模型可能被当黑底 |
| 字体 | `loadSystemFonts: true`（默认） | 实测服务器 Noto CJK 生效、中文正确；显式 `fontDirs` 或指定字体文件**不提速**（见下）。⚠️ **字体 fallback 会改变字宽**：SVG 常声明 `PingFang SC` / 微软雅黑，服务器用 Noto 渲染，长文本可能溢出/重叠 —— 实测 `learning-path-overview.svg` 的故事卡第 2–3 行出现叠印（模型在端到端里主动指出了这一点）。这是**我们的渲染产物**而非原文缺陷；若成为问题，出路是部署机装同名字体或显式 `fontFiles` 指定 |
| 超时 | 10s | 最复杂样本 2.5s，留 4× 余量 |
| 失败 | `IMAGE_RENDER_FAILED` + 原始错误摘要 | fail-loud，**不返回空白图**（否则模型会基于空图作答） |

**性能实测**（同进程连续调用，排除冷启动）：

| 样本 | 输出 | 耗时 |
|---|---|---|
| 纯色块 3 段 | 240×120 | 38~46ms |
| Consul 学习路径（35 个 `<text>` + 图形） | 1568×743 | 2284~2495ms |
| 同上，收窄 `fontDirs` 到 noto 目录 | 1568×743 | 2277ms |
| 同上，`loadSystemFonts:false` + 指定 `NotoSansCJK` | 1568×743 | 2363ms |

⇒ **耗时任 SVG 复杂度而非输出尺寸**，字体配置优化无收益。因此**必须放 worker_threads** —— 一次取图会同步占用主线程 2.3~2.5s，若在主线程执行会卡住 daemon 的所有并发请求。

**最坏耗时（给模型与用户的心理预期）**：一次取 3 张复杂信息图 ≈ 7.5s（串行 worker）；命中缓存则为 0ms。整次调用上限 20s（§6.2），超时按 `IMAGE_RENDER_FAILED` 返回。

**安全**：resvg 不执行脚本、**不加载任何外部资源**；仍只对**已通过双锚点校验的本地文件**渲染。

> **已实测（2026-11-23）**：分别构造含 `<image href="file:///etc/passwd">` 与 `<image href="../../../../etc/passwd">` 的 SVG，渲染输出与"不含 image"版本**字节完全相同**（506 = 506 = 506）⇒ 外链与相对路径穿越均未被读取。故不需要额外的 `resourcesDir` 隔离。

**并发与缓存**：

- key = `(scope, group, ref, mtimeMs, size)` —— 文档重导覆盖 assets 会产生新 key，**旧 key 不主动清理，靠 LRU 淘汰**
- **in-flight 去重**：同一 key 并发请求复用同一个 Promise，否则两个任务会把同一张图渲两遍（白付 2.5s × 2）
- LRU 淘汰只淘汰**已完成**的条目，正在渲染的条目跳过
- 上限：50 张 / 200MB（内存）。**可选**：落磁盘缓存 `{dataDir}/cache/raster/{hash}.png` 避免 daemon 重启后重渲（G4，非本期必做）

**worker 生命周期**（与既有 `@zvec/zvec` 的 worker 用法对齐，不另造一套）：

| 情形 | 行为 |
|---|---|
| worker 崩溃 / 意外退出 | 标记失效 → 下一次请求重建；在途任务以 `IMAGE_RENDER_FAILED` 返回，不重排（避免雪崩） |
| 队列满（上限 8） | 返回 `IMAGE_QUERY_LIMIT`（排队等待会让模型侧的 10s 超时先触发，反而更难诊断） |
| daemon 关闭 | `worker.terminate()`，等待 ≤2s，不阻塞退出 |

**与清单的关系**：SVG 从 `supported:false` 变为 `supported:true`；取图返回需标注来源格式与渲染尺寸，便于模型判断成本：

```ts
{ mimeType:'image/png', data, ref,
  sourceFormat:'image/svg+xml', rendered:{ width:1568, height:743 } }
```

GIF / BMP / ICO / AVIF 仍在白名单外（**不做转码**）。

---

## 4. 设计决策

| # | 决策 | 理由 | 否决的备选及原因 |
|---|---|---|---|
| **D1** | 清单只给元数据，字节按需取 | 自动附带会把无关图拖进上下文：1024²=652 tokens，每次检索都付固定开销 | 工具直接内联：每读一篇文档就拖图，token 与延迟线性上升 |
| **D2** | 取图做成独立工具 `ki_get_image` | 语义干净、可单独限流与核算、可单独做格式校验 | 给读文档工具加 `with_images:"1,3"`：语义混杂，与分页参数交织 |
| **D3** | **尺寸在取图时给**；清单阶段只给 bytes、不解析图片头 | token 只跟像素走（C3），但清单要尺寸就得写 PNG IHDR / JPEG SOF 解析器 —— 为一次列表付这个成本不值得，尺寸随取图结果一起回即可 | 清单阶段给尺寸：需新增头部解析器 + 边界处理（损坏图、非标准 SOF），收益与成本不匹配 |
| **D4** | 字节层只放行 **PNG / JPEG / WebP** | SVG 实测被上游 400（C5）；导入白名单比模型能吃的宽 | 照搬 `ASSET_EXTENSIONS`：会让模型收到 400 或空图 |
| **D5** | 图片**不进** `maxToolResponseChars` 字符预算 | base64 按字符计会瞬间撞穿 10000 | 计入字符预算：一张图吃光整个工具结果预算 |
| **D6** | 单次调用取 **1~3 张**（`refs` 数组，与 §6.2 签名一致）；单张 ≤4MB；**同一次生成内**累计 ≤6 张 | MCP 通道 JSON-RPC 响应随 base64 膨胀（5 张 1MB ≈ 6.7MB）；累计上限避免模型被单次拒绝打断。「累计」= 同一次生成（一次用户提问触发的工具循环）内所有取图之和，跨用户轮次清零 | 只做单张：模型看多图需多轮往返，体验差；不限累计：一次分析可能读 5 篇文档各取 3 张 |
| **D7** | 引用缺失/不支持时在清单里标 `supported:false` + `reason`，**不静默丢** | 模型应知道"这篇文档有 2 张图，其中 1 张不可用" | 静默过滤：模型会以为文档本来没图 |
| **D8** | 清单不另做 system 块，随工具结果自然出现 | 避免恒定预算占用 | 另发 system 块：占用随文档数增长 |
| **D9** | **SVG 走服务端栅格化**（2026-11-23 拍板）：`@resvg/resvg-js` 渲染 PNG，最大宽 1568，结果按 `(scope,group,ref,mtime,size)` 缓存；渲染放 `worker_threads` 单线程串行 | 实测：服务器有 Noto CJK，中文渲染正确、模型完整读出图内文字（4 阶段 12 课）；1568 宽 → 704 image_tokens。不栅格化则该类库 1370 张图全不可读 | **sharp**：依赖 libvips 系统库，比 native/WASM 更重；**不栅格化**：等于放弃 SVG 库；**`<text>` 抽取**：零依赖但丢布局与连线关系，只能表达"图里有哪些字" |

| **D10** | **不加工具图片总开关；前端不渲染工具图片**（2026-11-23 拍板） | 成本已由 D6（单次 ≤3 / 累计 ≤6）与 D5（不进字符预算）约束住；开关要多出配置项 + 校验 + 设置 UI + docs 四处，且与 `supportsImages`（用户上传侧）语义易混、难以独立关闭 | 加开关：四处改动换一个"可关"能力，当前成本风险不足以支撑；前端渲染：需改消息渲染 + 安全白名单 + 缩略图交互，属独立需求面 |

---

## 5. 成本模型（base64 的两笔账）

| 账 | 由什么决定 | 实测 |
|---|---|---|
| **上下文 token** | 解码后的**像素尺寸**，与 base64 长度无关 | 1024²=652、1568²=994、240×120=202、512²=184；2 张=404（线性累加） |
| **传输字节 / 内存** | 原图 × 4/3 | 4MB 图 → 5.3MB 请求体；进程内峰值 ≈ 9MB/张（buffer + base64 串），3 张 ≈ 27MB |

**乘数效应**：上游无状态 ⇒ 每轮请求都重传。故

```
token ≈ image_tokens × 该图出现在后续请求中的轮数
带宽  ≈ 图片字节 × 同上轮数
```

⇒ 与 REQ-006 同口径：**同一生成内只保留最近 1 次带图结果**（工具调用粒度）；**用户轮次**因 `conv.messages` 只存字符串而天然不重复（§3 ④）。

**用量条口径（必须改）**：`computeContextChars`（`tool-loop.ts:544-560`）现为 `m.content.length` —— content 数组化后 `length` 返回**元素个数**（如 2），会**严重少算**。改为：字符串取 `length`；数组只累加 `type==='text'` 的字符；图片 part 不参与（与 REQ-006 的 Q-D 一致）。该函数被 `projectNextContextChars` 复用，改一处两处生效。

---

## 6. 接口设计

### 6.1 工具清单字段（新增可选）

```ts
interface ToolImageRef {
  index: number;      // 1-based，正文出现顺序
  ref: string;        // 归一化后的相对路径，如 "assets/x.png" 或 "assets/assets/x.svg"
  mime?: string;      // 由后缀推定（不读文件头）
  bytes?: number;     // stat 得到
  // ⚠ 刻意不给 width/height：清单不解析图片头（见 §6.4「尺寸来源」），
  //   尺寸由 ki_get_image 成功返回时附带。D3 的"给尺寸"由取图阶段满足，不在清单阶段
  supported: boolean; // 白名单 + 可解析，二者皆满足为 true
  reason?: string;    // supported:false 时的可读原因（格式不支持 / 引用越界 / 文件缺失）
}

// 出现在 ki_get_module_info（首批）；ki_event_get / ki_search 见 §11
images?: ToolImageRef[];
```

### 6.2 取图工具（两侧签名必须分开 —— B1）

**对话 / 分析侧**（`ChatMcpToolEntry`，scope 由运行时注入）

```ts
// mcp-tool-registry.ts 的 ChatMcpToolEntry
{
  name: 'ki_get_image',
  readOnly: true,                       // 只读，不触发写闸
  def: {
    type: 'function',
    function: {
      name: 'ki_get_image',
      description: '读取知识库文档中某张图片的像素内容（按 ki_get_module_info 返回的 images[].ref 传参）',
      parameters: {
        type: 'object',
        properties: {
          group: { type: 'string', description: '文档所属 Group' },
          refs:  {
            type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3,
            description: 'images[].ref 原样传回，1~3 张（与 D6 单次上限一致；返回 images[] 与入参同序）',
          },
        },
        required: ['group', 'refs'],
        // ⚠ 刻意不含 scope：scope 由 daemon 注入（mcp-tool-registry.ts:73-74 / N23 禁止跨 scope）
      },
    },
  },
  specs: [
    { key: 'group', type: 'string', required: true },
    { key: 'refs',  type: 'stringArray', required: true, maxItems: 3 },
  ],
  run: (scope, a) => submitScoped('ki_get_image', scope, () =>
    // 整次调用统一超时 20s（= 单张 10s 上限 × 3 + 余量），不是"每张 10s 累加无上限"
    withTimeout(resolveAssetImages(scope, a.group, a.refs), RASTER_TOTAL_TIMEOUT_MS, 'ki_get_image')),
}
```

**对外 MCP server 侧**（另一层 schema，可含 scope，与既有对外工具一致）
`ki_get_image(scope?, group, ref)` → `resolveScope(loadConfig(), scope)` 兜底，返回 `content:[{type:'image',data,mimeType}]`。

### 6.3 工具返回值判别形状（B2）

```ts
/** 图片类结果的判别形状：tool-loop 在序列化前分流，避免 base64 进文本预算 */
interface ToolImageResult {
  kind: 'images';
  text: string;                       // 人类/模型可读摘要，如 "已读取 1 张图片（image/png 1024×768）"
  images: Array<{
    mimeType: string; data: string; ref: string; bytes: number;
    width?: number; height?: number;   // 尺寸在这一层给（D3），读头失败则省略，不影响取图
  }>;
}
```

- `tool-loop`：`result.kind === 'images'` → `text` 走 `serializeToolResponse` 作 text part；`images` 转 `image_url` part 追加同条消息（与入参 `refs` 同序）
- `tool_end.response`（前端展示 / 落盘）：**只放文本 + `[图片×N]`**，绝不带 base64
- **判别必须精确比较** `=== 'images'`。**禁止** `'kind' in result` 或 `typeof result.kind === 'string'` —— 既有 `ki_lifecycle_list` 返回 `kind:'wiki'|'temp'|'event'`（`src/lib/mcp-tools/lifecycle-list.ts:20-22`），宽松判断会把生命周期工具的结果误判为图片结果、**把正文丢掉**。回归用例见 §9
- 兼容性：普通对象（含 `kind:'wiki'` / `kind:'token'` 等）走原路径零变化

### 6.4 ref 归一化规则（S1，按 §2.3 抽样事实）

```
1. 去查询串 / 锚点；URL 解码失败按原样
2. 以 "./" 开头 → strip；"../" 或绝对路径 → 直接 supported:false（reason: 引用越界）
3. path.posix.normalize()，**不做 basename 截断**（要保住 assets/assets 双层与 assets/image/xx 子目录）
4. 拼接：resolve(assetsDir, rel) 必须仍在 assetsDir 内（复用 /api/asset 双锚点校验）
5. 文件不存在 → stat 一次；不存在则 supported:false（reason: 文件缺失）
6. 后缀分流：`.png/.jpg/.jpeg/.webp` → 直传；`.svg` → 走栅格化（§3.2）；其余 → supported:false（reason: 格式不支持）
7. **廉价预检（N4）**：读文件头 **512 字节**，位图校验魔数（PNG `89 50 4E 47` / JPEG `FF D8 FF` / WebP `RIFF…WEBP`），SVG 校验含 `<svg` 根元素 → 不通过则 supported:false（reason: 文件疑似损坏）。目的是避免"清单标 true、取图才失败"让模型白扑空一轮
```

**尺寸来源**：清单**不解析图片头**（避免为一次列表写 PNG IHDR / JPEG SOF 解析器）。位图尺寸在 `ki_get_image` 成功时附带；SVG 的尺寸取栅格化后的 `rendered{width,height}`。读头失败则省略，不影响取图。

---

## 7. 异常与降级

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 引用文件不存在 | 清单 `supported:false, reason:'文件缺失'`；取图返 `IMAGE_NOT_FOUND` | 是（模型可见可读文案） |
| 格式不支持（GIF/BMP/ICO/AVIF） | 清单 `supported:false, reason:'格式不支持'`；取图返 `IMAGE_FORMAT_UNSUPPORTED` | 是 |
| SVG 栅格化失败（渲染异常 / 超 10s） | `IMAGE_RENDER_FAILED` + 原始错误摘要。清单阶段已做 512 字节预检（§6.4 步骤 7）能滤掉明显损坏的文件，但"能解析头部但渲染失败"只有取图时才知道 —— 失败信息必须足够可读 | 是 |
| 文件疑似损坏（预检不通过） | 清单直接 `supported:false, reason:'文件疑似损坏'`，不必等取图 | 是 |
| 引用越界（`../`、绝对路径） | 清单 `supported:false, reason:'引用越界'` | 是 |
| 单张 > 4MB | 清单 `supported:false` + bytes；取图返 `IMAGE_TOO_LARGE` | 是 |
| 单次 > 3 张 / 累计 > 6 张 | `IMAGE_QUERY_LIMIT`，提示分批 | 是 |
| 外链 http(s) 图 | `supported:false`（不代理，避免 SSRF 与不稳定源） | 是 |
| 读文件 EACCES / EISDIR | **向上抛**（fail-loud，不伪装成"不存在"） | 是（错误码 `IMAGE_READ_FAILED`） |
| KB 图被删 / 文档重导覆盖 | 下次取图自然 `IMAGE_NOT_FOUND`，不缓存 | 是 |

---

## 8. 改动面

| 层 | 位置 | 改动 |
|---|---|---|
| 图片清单 | `src/lib/mcp-tools/get-module-info.ts` | 正文 → `extractImageRefs` → 按 §6.4 归一化 → 附加 `images[]` |
| 取图内核 | 新建 `src/lib/asset-image.ts` | 双锚点校验（抽自 `mcp-http-api.ts:2184-2200`）+ 白名单 + 读字节 + 读宽高 |
| **新增依赖** | `package.json` | `@resvg/resvg-js`（native binding，与既有 `@zvec/zvec` 同类风险，不是新的分发模式） |
| **栅格化** | 新建 `src/lib/svg-raster.ts` + `src/lib/svg-raster.worker.ts` | worker_threads 单线程串行 + 10s 超时 + 参数见 §3.2 |
| **渲染缓存** | 新建 `src/lib/raster-cache.ts`（或并入 asset-image） | key `(scope,group,ref,mtimeMs,size)`，LRU 50 张 / 200MB |
| 新工具 | 新建 `src/lib/mcp-tools/get-image.ts` + `chat/mcp-tool-registry.ts` 注册 | 见 §6.2 |
| 对话分流 | `src/lib/chat/retrieval/tool-loop.ts:954-956` | `kind==='images'` 分流；tool 消息 content 支持 parts |
| 旧图降级 | `src/lib/chat/retrieval/tool-loop.ts` | 每轮 push 前 `demoteOldImages(messages)` |
| 上下文计数 | `src/lib/chat/retrieval/tool-loop.ts:544-560` | 兼容数组 content（§5） |
| **分析链路（独立实现，不能"同款改一下"）** | `src/lib/events/analysis-runner.ts` | ① analysis 侧 entry 是 `run(args)`、scope 在闭包（`:1566`）② tool 消息现为 `<kb_doc>\n{text}\n</kb_doc>` **字符串拼接**（`:1598-1602`），改 parts 需重排标签包裹 ③ `:1611` `response: serialized.text.slice(0,2000)` 须排除图片 |
| 契约 | `src/lib/chat/chat-contract.ts` + `web/src/api/chatContract.ts` | 本期前端不显示工具图片则不动；若动需同步双份（有 parity 测试） |
| 对外 MCP | `src/lib/mcp-http-api.ts` | 透传 image content |

---

## 9. 验证策略

| 层 | 用例 |
|---|---|
| 单元 | ref 归一化表驱动：`./assets/x.svg` / `assets/x.png` / `../assets/x.svg` / `images/a.png` / http 外链 / 不存在 —— 6 种形态各一条 |
| 单元 | `kind==='images'` 分流：base64 不进 `response`、不进字符预算；普通对象零变化（回归） |
| **单元** | **`kind` 误判回归**：给判别函数喂 `{kind:'wiki',...}` / `{kind:'token',...}` / `{kind:'event',...}`，必须走**原序列化路径**（防止实施时写成宽松判断把生命周期工具正文丢掉） |
| 单元 | `refs` 多张：传 2 个 ref → 返回 `images` 2 条且**顺序与入参一致**；传 4 个 → 参数校验拒绝（maxItems 3） |
| 单元 | `demoteOldImages`：3 条带图 tool 消息 → 只留最后 1 条；纯文本消息不受影响 |
| 单元 | `computeContextChars` 数组 content：只累加 text part，图片 part 不计 |
| 契约 | 清单字段完整（8 个）、4 个错误码文案可达 |
| **真机** | 在 `ai-docs` scope 挑一篇带 PNG 的文档（样本已知：`apm-rum/docs/llm/example/assets/codex-agent-interaction.png`）→ 问图中内容 → 模型回答须体现图内信息 |
| 单元 | 栅格化：同一 SVG 连渲 2 次，第 2 次命中缓存（0ms 渲染）；畸形 SVG → `IMAGE_RENDER_FAILED` |
| 单元 | 栅格化输出受最大宽约束：任意 viewBox 输出宽 ≤1568 |
| 真机 | `consul` scope（全 SVG）→ 取一张图 → 模型须能读出图内中文（样本：`consul/consul` 的 `learning-path-overview.svg`，期望读出 4 阶段 12 课） |
| 真机 | 并发 3 个取图请求 → daemon 其它请求（如 `/api/healthz`）不被阻塞（验证 worker 隔离生效） |
| 断言 | 一次 3 张图后，第 2 轮请求的 prompt_tokens 不因重复图片线性增长 |

---

## 10. 与 REQ-20261123-006 的口径一致性

| 口径 | REQ-006（用户上传图） | 本设计（工具/KB 图） |
|---|---|---|
| 预处理 | 不预处理，原图直传 | 不预处理（同一原则） |
| mime 白名单 | PNG/JPEG/WebP；**SVG 拒收**（提示用户转 PNG 再传） | PNG/JPEG/WebP + **SVG 服务端栅格化后按 PNG 送**。差异理由：用户上传的 SVG 可以让他自己转（成本在用户侧、一次交互），而 KB 里的 SVG 是既有资产、用户无法干预，只能服务端转 |
| 图片进字符预算 | 否 | 否 |
| 历史图片 | 只带最近 1 轮（用户轮次） | 只带最近 1 次带图结果（**工具调用粒度**）；用户轮次天然满足 |
| 失效处理 | 发送前 fail-loud | 清单标 `supported:false` + 取图报错 |

---

## 11. 待拍板 / 未验证

| # | 事项 | 影响 | 建议 |
|---|---|---|---|
| ~~P1~~ | ~~SVG 栅格化~~ | **已拍板（2026-11-23）：做**，方案与实测见 §3.2 / D9 | 定性为"必做"，不再是可选项 |
| ~~P2~~ | ~~首批是否含 `ki_event_get` / `ki_search`~~ | **已拍板（2026-11-23）：`ki_event_get` 纳入首批；`ki_search` 不做**（搜索命中是片段，片段可能落在图引用中间，解析价值低） | — |
| P3 | 单次/累计张数上限（D6 的 3 / 6） | 模型体验 vs 成本 | 真机观察后再调 |
| P4 | 分析链路多篇文档各带图时的裁剪 | 分析可能读 5 篇文档 | 同"最近 1 次带图结果" |
| P5 | 外部 MCP 客户端是否渲染 `{type:'image'}` | 影响对外能力宣称 | 用 CodeBuddy 实测一次 |
| P6 | `../assets/…` 引用的图**页面上也显示不出来**（双锚点 403） | 属既有缺陷，非本设计引入 | 建议另报事件，不在本需求内修 |
