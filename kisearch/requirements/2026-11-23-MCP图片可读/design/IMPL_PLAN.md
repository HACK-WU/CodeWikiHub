---
id: REQ-20261123-008
feature: MCP图片可读
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 1
tags: [feat, integration]
depends_on: []
author: AI
document_type: design
---

# 实施计划：MCP 图片可读（REQ-20261123-008）

**设计基线**：`DESIGN.md` v3（设计评审 v3 ✅ 通过）
**关联**：事件 `#78`；口径同源 `REQ-20261123-006`（用户上传图片）

---

## 1. 结论（先看这四条）

| 项 | 判定 |
|---|---|
| **窗口策略** | **单窗口串行**。`tool-loop` / 契约 / 工具注册表 / 分析链路四处耦合度高，并行改必然冲突；只有 B5（分析链路）与 B6（对外 MCP）在 B2 完成后有并行空间，但收益不足以抵消合并成本 |
| **批次** | **B0~B7 共 8 批**，每批独立可验证、可回退 |
| **行为变更节奏** | B0/B1 零行为变更（纯新增与只读字段），**风险最低**；B2 起才有模型可见的变化，因此 B0/B1 可先落地验一遍地基 |
| **可否回退** | 可。新增工具可裁剪、清单字段可忽略、`kind` 分流在无 `kind` 时零变化 ⇒ 任一时刻删掉后两批即回到现状 |

---

## 2. 前置条件

| 项 | 状态 | 说明 |
|---|---|---|
| 新增依赖 `@resvg/resvg-js` | 已实测可装可用 | native binding，与既有 `@zvec/zvec` 同类；安装后需确认打包/发布链路带上平台二进制 |
| 上游视觉能力 | 已实测 | `deepseek-v4.1-flash-1017` 支持 parts + tool 消息图片 |
| 中文字体 | 已确认 | 服务器有 Noto CJK，栅格化中文正常 |
| 真实测试样本 | 已定位 | PNG：`ai-docs` 的 `apm-rum/docs/llm/example/assets/codex-agent-interaction.png`；SVG：`consul/consul` 的 `learning-path-overview.svg`（期望读出 4 阶段 12 课） |
| `extractImageRefs` / `getAssetsDir` / 双锚点校验 | 现成可复用 | `src/lib/import.ts:576`、`src/lib/scope.ts:128`、`src/lib/mcp-http-api.ts:2184-2200` |

---

## 3. 批次表

### B0 地基：取图内核（零行为变更）

| 项 | 内容 |
|---|---|
| 目标 | 把"校验 + 归一化 + 预检 + 读字节"做成独立可测内核，不接任何工具 |
| 改动 | 新建 `src/lib/asset-image.ts` |
| 关键函数 | `normalizeImageRef(raw): {rel,ok,reason}` · `preflight(filePath,mime): boolean` · `resolveAssetImage(scope,group,ref): Promise<Buffer>` · `resolveAssetImages(scope,group,refs[])` |
| 规则 | 按 DESIGN §6.4 六步 + 预检步骤 7；双锚点校验从 `mcp-http-api.ts` 抽出共享（**不要复制一份**） |
| 验收 | 单测：6 种 ref 形态（`./assets/x` / `assets/x` / `../assets/x` / `images/a` / `http://` / 不存在）+ 预检失败 + 越界；`tsc` 通过；**产品行为零变化**（既有用例全绿） |
| 依赖 | 无 |

### B1 清单：`images[]` 字段（只读，可能被模型看到但无害）

| 项 | 内容 |
|---|---|
| 目标 | 读文档类工具返回结构化图片清单（**`ki_get_module_info` + `ki_event_get`**，Q2 已拍板） |
| 改动 | `src/lib/mcp-tools/get-module-info.ts`（及其 execute 层）；`src/lib/mcp-tools/event-get.ts`（或其次层执行函数） |
| 关键点 | 正文不改；清单按 §6.1 字段；`supported` 由后缀 + 预检共同决定；**缺省不影响既有返回体的其它字段**（`revision` / `totalLines` 必须仍在，`serializeToolResponse` 的截断语义要复核）。两处共用同一个"正文 → 清单"函数，不要各写一份 |
| 验收 | 单测：清单字段完整、空文档无 `images` 字段（不出现 `images: []`）、两处工具产出同一形状；真机：`ki_get_module_info` 与 `ki_event_get`（挑一个参考文档带图的事件）各返回一次含清单；**模型行为不变**（尚无取图能力） |
| 依赖 | B0 |

### B2 取图 + 对话注入（位图，模型第一次真正看图）

| 项 | 内容 |
|---|---|
| 目标 | `ki_get_image` 可取出 PNG/JPEG/WebP，模型能在对话中读到 |
| 改动 | 新建 `src/lib/mcp-tools/get-image.ts`；`src/lib/chat/mcp-tool-registry.ts`（注册 entry）；`src/lib/chat/retrieval/tool-loop.ts`（`kind==='images'` 分流 + parts 注入）；`src/lib/chat/retrieval/tool-loop.ts:544-560`（`computeContextChars` 兼容数组） |
| 关键点 | ① `specs` 只有 `group`+`refs`（**无 scope**）② 判别 `=== 'images'` 精确比较 ③ `tool_end.response` 只放文本 + `[图片×N]` ④ 图片 part 追加到**同一条** tool 消息 |
| 验收 | 单测：分流（base64 不进 `response` / 不进字符预算）；**`kind` 误判回归**（喂 `kind:'wiki'/'token'/'event'` 走原路径）；`refs` 顺序与入参一致；真机：读 `ai-docs` 那张 PNG → 模型回答体现图内信息；用量条数字与改造前同一量级 |
| 依赖 | B0、B1 |

### B3 SVG 栅格化

| 项 | 内容 |
|---|---|
| 目标 | 1369/1370 的 SVG 库有图可读 |
| 改动 | `package.json`（`@resvg/resvg-js`）；新建 `src/lib/svg-raster.ts` + `src/lib/svg-raster.worker.ts`；`asset-image.ts` 接栅格化分支；清单把 `.svg` 标 `supported:true` |
| 关键点 | 最大宽 1568 / 白底 / `loadSystemFonts:true` / 单张 10s、整次 20s；**worker 生命周期**（崩溃重建、在途不重排、队列上限 8、关闭 terminate ≤2s）；**缓存**（key 含 mtime+size、in-flight 去重、LRU 50 张/200MB、只淘汰已完成） |
| 验收 | 单测：同 SVG 二次命中缓存（0ms 渲染）、输出宽 ≤1568、畸形 SVG → `IMAGE_RENDER_FAILED`；真机：`consul` 读 `learning-path-overview.svg` → 模型读出 4 阶段 12 课；**并发 3 个取图时 `/api/healthz` 不被阻塞**。已知限制：字体 fallback（Noto↔PingFang）会让长文本溢出重叠，属渲染产物 |
| 依赖 | B2 |

### B4 预算与降级收口

| 项 | 内容 |
|---|---|
| 目标 | 成本可控、异常可读 |
| 改动 | `tool-loop.ts`（`demoteOldImages`、单次 ≤3 / 累计 ≤6 计数）；错误码注册 |
| 关键点 | 旧图降级在**每轮 push 新 tool 消息之前**；"累计"= 同一次生成内，跨用户轮次清零；6 个错误码文案（`IMAGE_NOT_FOUND` / `FORMAT_UNSUPPORTED` / `TOO_LARGE` / `QUERY_LIMIT` / `RENDER_FAILED` / `READ_FAILED`） |
| 验收 | 单测：3 条带图 tool 消息只留最后 1 条；第 4 张被拒且文案可读；真机：一次生成内取 2 次图，第 2 轮 `prompt_tokens` 不因重复图线性增长 |
| 依赖 | B2（如需覆盖 SVG 场景则依赖 B3） |

### B5 分析链路（独立实现，非"同款"）

| 项 | 内容 |
|---|---|
| 目标 | 事件 AI 分析读文档时也能看到附图 |
| 改动 | `src/lib/events/analysis-runner.ts`（`:1566` 调用点、`:1598-1602` tool 消息构造、`:1611` 展示口径） |
| 关键点 | ① analysis 侧 entry 是 `run(args)`（scope 在闭包）② tool 消息现为 `<kb_doc>\n{text}\n</kb_doc>` 字符串拼接 → 改 `[{type:'text',text:'<kb_doc>…</kb_doc>'},{type:'image_url',…}]` ③ `response` 展示截断必须**排除图片** ④ 保留"最近 1 次带图结果"策略 |
| 验收 | 真机：挑一个参考文档带图的事件跑一次分析，过程区能看到图片步骤、结论体现图内信息；分析落盘的 `response` 不含 base64（体积不暴涨） |
| 依赖 | B2 |

### B6 对外 MCP 透传

| 项 | 内容 |
|---|---|
| 目标 | 外部 MCP 客户端（CodeBuddy / Claude Desktop）也能看到图 |
| 改动 | `src/lib/mcp-http-api.ts`（工具调用出口）、`ki_get_image` 的对外 schema（**可含 scope**） |
| 验收 | 真机：用 CodeBuddy 调 `ki_get_image` → 客户端渲染出图片（若客户端不渲染则记录实测结论，不当作缺陷） |
| 依赖 | B2 |

### B7 收口

| 项 | 内容 |
|---|---|
| 目标 | 文档、回归、记忆 |
| 内容 | ① `docs/` 补"AI 能读哪些图"的用户视角说明（**不写源码路径与内部判据**，遵守 docs 约定）② 全量回归 + `tsc` + `web` build ③ 检查是否有既有用例因 tool 消息 shape 变化而失效 ④ 更新 `kisearch-memory` 与 AGENTS.md |
| 验收 | 全量绿、无新增 tsc 错、build 通过；假绿必须用 stash 基线对齐 |
| 依赖 | B0~B6 |

---

## 4. 依赖与可并行窗口

```
B0 ──► B1 ──► B2 ──┬─► B3 ──┐
                   ├─► B4 ──┼─► B7
                   ├─► B5 ──┤
                   └─► B6 ──┘

可并行（若开多窗口）：B3 / B5 / B6 三者互不重叠
  · B3 触 package.json + svg-raster*（新建）
  · B5 只触 analysis-runner.ts
  · B6 只触 mcp-http-api.ts
  ⚠ 但 B4 与 B2 同改 tool-loop.ts，不得并行
```

**推荐仍串行**：B3 引入 worker 生命周期，是最容易与其他改动互相影响的一块；串行的调试成本低于合并冲突。

---

## 5. 每批必过的门禁

| 门 | 要求 |
|---|---|
| 类型 | `npx tsc --noEmit`（两端）无**新增**错误（既有错要给出基线对比） |
| 单测 | 本批新增用例全绿；**受影响既有用例必须有解释**（shape 变更导致失效的要同批迁移，不许跳过） |
| 真机 | B2/B3/B4/B5/B6 每批至少 1 次真实调用（用 §2 的已知样本） |
| 回归 | 触及 `tool-loop` / `chat-contract` 的批次，必须跑 chat 相关全量；触及分析链路的跑 events 相关全量 |
| 提交 | **每批结束先报结果，不自动 git commit**（等你点头） |

---

## 6. 风险与回退

| 风险 | 触发信号 | 处置 |
|---|---|---|
| `tool-loop` 的 messages 数组被污染（parts 混入历史） | 第 2 轮请求 `prompt_tokens` 线性增长 | B4 的 `demoteOldImages` 未生效 → 优先查那里；临时回退：不注入图片，只给清单 |
| `computeContextChars` 少算 | 用量条百分比明显低于改造前 | 按 §5 口径改；临时回退：图片 part 按固定 1 字符计 |
| worker 卡死/泄漏 | `ps` 里 worker 数增长、取图超时 | 按 §3.2 生命周期表处理；临时回退：栅格化改在主线程 + 缓存（牺牲并发） |
| 栅格化内存峰值 | 3 张 1568 图同时渲染 RSS 上涨 | 队列上限降到 1；LRU 上限下调 |
| 上游对 tool 图片的行为不一致（换模型） | 400 / 图被忽略 | `supportsImages` 手填开关 + 取图失败文案可读；**不自动探测** |
| 既有用例因 tool 消息变数组而红 | B2 后测试大面积失败 | 先确认是断言过时还是语义变化；断言过时同批迁移，语义变化停下来问 |

**总回退**：删 `ki_get_image` 注册 + 清单字段（工具侧）即恢复现状；对话侧 `kind` 分流在无 `kind` 时零变化。

---

## 7. 已拍板（2026-11-23）

| # | 结论 | 对计划的影响 |
|---|---|---|
| Q1 | **不做工具图片总开关** | 不新增 `llm.toolImages` 一类配置。成本由 D6（单次 ≤3 / 累计 ≤6）与 D5（图片不进字符预算）兜底；B4 因此不含"开关分支"用例，也**不要**顺手加开关（避免与 `supportsImages`（用户上传侧）语义混淆） |
| Q2 | **首批纳入 `ki_event_get`** | B1 改动面 +1（`src/lib/mcp-tools/event-get.ts` 或其次层执行函数同样附加 `images[]`）；验收加一条"事件参考文档带图"的用例。`ki_search` 仍不做（见 §8） |
| Q3 | **接受前端「图片×N」文案** | 前端**零改动**。B4 只需断言 `tool_end.response` 仅含文本 + 占位；B7 不安排任何前端任务 |

---

## 8. 本计划不做

- 用户上传图片（REQ-20261123-006，独立需求）
- **工具图片总开关**（Q1 已拍板不做）
- **前端图片渲染**（Q3 接受「图片×N」占位文案）
- `ki_search` 的图片清单（首批不做）
- GIF/BMP/ICO/AVIF 转码
- 图片 OCR / 文本抽取
- 栅格化结果的持久化缓存（G4，可选优化）
- P6（`../assets` 引用在页面上的表现）—— 待单独查实
