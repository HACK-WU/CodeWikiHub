---
id: REQ-20261016-002
feature: 总览当前知识库嵌入模型与维度面板
document_type: review
status: 已确认
created: 2026-10-16
updated: 2026-10-16
version: 1
tags: [feat, ux]
author: AI
---

# 🎯 新增功能质疑报告：总览「嵌入模型 / 向量维度」面板

- **质疑对象**：REQ-20261016-002 代码变更（新增功能类，`strategies/feature.md`）
- **调用方式**：auto-review 判定为复杂场景（9 文件）后自动接力
- **证据基线**：`tsc`（src/web）0 错 · web 单测 316/316 · 隔离实例 API 23/23 · 真实页面走查 35/35

## 📋 需求确认（阶段 0）

| 项 | 内容 |
|----|------|
| 功能目标 | 在总览「当前知识库」卡片以两个小面板呈现**当前配置**的 embedding 模型名与维度 |
| 输入 | `config.embedding.{model,dimension,provider,baseURL}`（经 `/api/vector/status`） |
| 输出 | 6 个小面板 + 维度一致性角标 |
| 来源 | 用户原话（口头）+ 用户拍板 D1–D7（书面记录：`requirement.md` §7） |
| 隐性需求 | 旧后端回退、加载态、请求失败态、长文本不破版、不引入额外请求/自动轮询 |
| 理解偏差 | ⚠️ 有 1 处，已在下文 #4 修正（文档称"不写快照文件"，实现会写） |

## 📊 变更概述（阶段 1）

- **变更类型**：新增功能（含 1 处 hook 抽取重构 + 1 处文案纠错）
- **变更文件**：`src/lib/vector-dimension-snapshot.ts`、`src/lib/config.ts`（注释）、`web/src/api/tasksApi.ts`、`web/src/lib/hooks.ts`、`web/src/layouts/AppShell.tsx`、`web/src/lib/vectorDimensionCopy.ts`、`web/src/pages/DashboardPage.tsx`、`web/src/styles/ki.css`、`web/test/vector-dimension-copy.test.mjs`

## 🔍 质疑详情

### 质疑 #1：hook 多观察者把"进总览"放大成一次取数（甚至一次 refresh POST）—— 成立，已修

- 🏷️ **类型**：兼容性 / 行为影响（阶段 4.4）+ 性能风险（5.3）
- 📍 **涉及**：`web/src/lib/hooks.ts::useVectorDimensionStatus`（新）vs `AppShell.tsx:226-241`（旧内联）
- ❓ **质疑点**：抽 hook 后该 query **多了一个观察者**（总览页）。旧实现里 AppShell 的观察者一次挂载后长期在树（切路由不重挂），故"进总览"从不取数；新实现下总览页每次挂载都是新观察者，而 `staleTime: 0` ⇒ `refetchOnMount` 默认为 true ⇒ **每次进入总览都补一次 GET**。更严重的是：当快照 `unknown` 且已过期时，queryFn 会走 **POST `/vector/status/refresh`**，而该 operation 在 coordinator 里按缺省 **`write`** 入队（`mcp-http-api.ts:495-531` 未传 kind）⇒ 长导入期间反复进出总览会**堆积刷新请求**，与"守 #4：不引入自动轮询/重试"的口径相悖。
- 🔍 **验证方法**：页面走查 G 段实测——修复前 `G4 delta=1`；修复（`refetchOnMount: false`）后 `delta=0`，且 `G1 首屏 GET 恰好 1 次`（AppShell 首挂无数据仍照常取数）。
- ⚠️ **风险**：功能影响 = 用户在长导入期间来回切页，会看到刷新请求排队（连带 zvec 探测），且这些请求与用户操作无关。
- 📊 **置信度**：高（改动前后均实测到计数差异）
- 💡 **建议**：`refetchOnMount: false`（已实施）。它不影响任何既有触发：首挂无数据照常取数、任务完成后 `invalidate` 照常重取、手动「重新检查」照常生效。

### 质疑 #2：健康项"正名 + 删建议"是搭车变更，借主变更光环逃过授权 —— 成立，需用户确认

- 🏷️ **类型**：搭车变更（范围 + 光环质疑）
- 📍 **涉及**：`web/src/pages/DashboardPage.tsx:70-78`
- ❓ **质疑点**：用户拍板的是 D3「面板给值、健康项只报结论」。实现时进一步做了两件用户未逐条看过的事：① 行名「向量集合维度」→「嵌入服务维度」；② 删掉 fail 分支的 `ki restore … --rebuild-vector` 建议。虽属纠错（见下），但它**不在用户逐条确认的清单里**，且改的是既有可见文案。
- 🔍 **验证方法**：对照 `requirement.md` §7 D3 事实纠正 + 用户原始批复（"其他确认"仅确认 D1/D3 选项）。
- ⚠️ **风险**：若用户认为旧行名更熟悉，属"已上线文案被静默改写"。
- 📊 **置信度**：高
- 💡 **建议**：不阻塞放行，但在交付说明中**显著列出**，并把纠错理由写进文档（已写入 §7「D3 事实纠正」）。纠错的代码依据：该行数据源是 doctor 三合一 probe（`config=N, 实际=M`，比较**上游返回维度 vs 配置维度**，`health-check.ts:196-214`），`/api/health` 又传 `checkCollectionDimensions:false`（`mcp-http-api.ts:748`）⇒ 旧行名"向量集合维度"与 pass 文案"集合维度一致"**声称了该数据源无法建立的事实**，且 fail 分支让用户去重建向量（修不了"上游维度不符"这一成因）。

### 质疑 #3：空串模型名会渲染成空白单元格而非「—」—— 成立，已修

- 🏷️ **类型**：边界条件（阶段 3.1 字符串边界）
- 📍 **涉及**：`DashboardPage.tsx` 模型面板
- ❓ **质疑点**：原实现 `embeddingStatus?.model ?? '—'`——`??` 只兜 null/undefined，若后端回 `""`（理论上被 `config.ts:629-639` 的合并兜底排除，但契约上未禁止）则渲染空白格，与"兜底显示「—」"的验收项不符。
- 🔍 **验证方法**：读 `config.ts` 合并逻辑 + 代码审查；已改为 `|| '—'`。
- ⚠️ **风险**：用户看到空面板、以为是加载中。
- 📊 **置信度**：中（触发条件在现配置下不可达）
- 💡 **建议**：已修（`||`）。

### 质疑 #4：需求文档 R3 写"不写入快照文件"，实现会写入 —— 成立（文档），已订正

- 🏷️ **类型**：需求理解偏差 / 文档一致性
- 📍 **涉及**：`requirement.md` §3.1 R3 vs `vector-dimension-snapshot.ts::writeSnapshot`
- ❓ **质疑点**：实现把 `model/provider/baseURL` 放进了 `VectorDimensionSnapshot`，而 `writeSnapshot` 序列化整个对象 ⇒ **三个字段会写入 `<dataDir>/.vector-status/<sha>.json`**（与 `configured` 同款：写进去、读时恒以 config 覆盖）。文档却写"不写入快照文件"，会让后来者以为文件 schema 未变。
- 🔍 **验证方法**：真实实例 POST refresh 后 `cat /root/.ki-data/.vector-status/$(sha256('k8s')).json` ⇒ 实测含 `"model":"qwen3.7-text-embedding-flash","provider":"dashscope","baseURL":"https://maas.qianwenaiapi.com/compatible-mode/v1"`。
- ⚠️ **风险**：文档失真 → 后续维护者可能基于错误前提改文件 schema 兼容逻辑。
- 📊 **置信度**：高
- 💡 **建议**：已订正文档为"读路径从 config 活读、快照文件里的同名值不参与判定"。

### 质疑 #5：新增字段的端到端贯通（贯通两问）—— 不成立（无断链）

- 🏷️ **类型**：数据守恒·贯通
- ❓ **质疑点**：新增的三个字段有人生产、有人消费、沿途每一跳都接住了吗？
- 🔍 **验证方法（逐跳）**：
  1. **生产**：`configuredIdentity(config)` 在 4 个产出口（读成功/读兜底/刷新成功/刷新兜底）全部展开 ✓
  2. **传输**：HTTP `GET /api/vector/status`（`mcp-http-api.ts:492`）与 `POST /vector/status/refresh`（`:509`，含 R8 降级 `{...outcome.value, state:'unknown'}`）✓；同源 daemon RPC `:847/:854` 走同一对函数 ⇒ 自动带上 ✓
  3. **消费**：`tasksApi.VectorDimensionStatus`（可选字段）→ `useVectorDimensionStatus` → 总览面板 ✓
  4. **落点**：面板文本 + `title` + 角标 ✓（页面走查 B1/B3）
- 📊 **置信度**：高（隔离实例 23/23 + 真实 curl 实测）

### 质疑 #6：`refreshVectorDimensionSnapshot` 的 6 处"调用后忽略返回值"是否受新字段影响（异常归宿）—— 不成立

- 🏷️ **类型**：数据守恒·异常归宿
- ❓ **质疑点**：`restore.ts:496/527/585`、`import.ts:168/242`、`daemon-rpc.ts:474/483`、`mcp-http-api.ts:1826/1858/2074/2188` 都是 `try { await refresh(...) } catch { /* 诊断不阻断 */ }` —— 新增字段会不会改变这些点的行为？
- 🔍 **验证方法**：新增字段只是**多写 3 个键**，无返回值消费变化；catch 分支同样带标识（隔离实例 E 段：以必然失败调用驱动 catch ⇒ state=unknown 且三字段齐备）。这些调用点原有的"失败不阻断"语义未被触碰。
- 📊 **置信度**：高

### 质疑 #7：快照文件 schema 扩展的双向兼容 —— 不成立

- 🏷️ **类型**：数据兼容（阶段 4.3）
- ❓ **质疑点**：新旧 daemon 混跑、旧文件新读、新文件旧读会怎样？
- 🔍 **验证方法**：① 新读旧文件：读路径只信 `persisted/indexCompleteness/checkedAt`，其余从 config 活读 ✓（隔离实例 B/C 段：文件里写 STALE 模型名与 STALE provider/baseURL，响应仍为当前配置值）；② 旧读新文件：旧校验只查 `scope/configured/persisted/checkedAt`，忽略未知键 ✓（代码直读）；③ 后端 `vector-client.VectorDimensionStatus`（另一套同名接口）**未改动** ⇒ CLI / daemon client 无影响。
- 📊 **置信度**：高

### 质疑 #8：体验质量（阶段 5.5）

**正向**：认知负担 ✅ 降低（不用翻 config.yaml / 不用记 `ki doctor` 输出）；反馈及时性 ✅（角标即一致性结论）；操作流畅度 ✅（进总览即可见，无额外点击）。
**负向**：错误可理解性 ✅（旧后端「—」、未确认态有 `title` 说明）；恢复路径 ⚠️——角标本身不可点，恢复入口在顶栏 banner 的「重新检查」（存在但不在角标上）；防呆 ✅（不把未知渲染成一致）；故意作恶 ✅（超长模型名省略 + title、窄屏不溢出、请求失败不崩溃）。
**结论**：⚠️ 体验一般偏良好；关键问题 = 角标无就地恢复入口（低风险，且 banner 已提供）。→ 记为「可选处理」，不纳入本次。

## 🌍 全局回扣质疑

| 全局质疑 | 回扣结论 | 证据/说明 |
|----------|----------|-----------|
| 目标回扣 | ✅ 成立 | 业务目标一句话：**"不打开配置文件即可确认当前 embedding 配置，并知道它与集合是否一致"**。变更同时给出配置值（模型/维度）与一致性结论（角标），未停在"显示一个数字"的局部症状 |
| 位置回扣 | ✅ 成立 | 调用链 `总览面板 → useVectorDimensionStatus → GET /api/vector/status → readVectorDimensionSnapshot → config.embedding`；顶栏 banner 共用同一条查询（同一缓存）⇒ 两处结论天然一致、不会互相矛盾。放大风险（多观察者带来的取数/刷新放大）已在 #1 消解并加回归锁 |
| 判据回扣 | ✅ 全部成立 | ① 顶栏维度告警行为不变（banner 代码未动 + 页面走查全绿）② `/api/import/config` 契约不变（只取 configured/persisted）③ 快照 TTL / unknown 语义不变（隔离实例 A/C/D/E）④ 不新增接口、不新增自动轮询（首屏 GET=1、全程 POST refresh=0，G1/G2/G5） |

## 📊 质疑总结

### 🎯 裁决结论

⚠️ **修复成立质疑后可放行** —— #1（已修 + 回归锁）、#3（已修）、#4（已订正文档）；#2 不阻塞放行但**必须向用户明示**；#5–#7 经逐跳取证不成立；#8 记录为可选优化。
**复验**：修复后 web 单测 316/316、`tsc` 0 错、`vite build` exit 0、隔离实例 23/23、页面走查 **35/35**（含 G4 新回归锁 delta=0）。

### 💥 缺陷 → 功能影响翻译

| 质疑 | 预期功能行为 | 实际功能行为 | 功能影响 |
|------|--------------|--------------|----------|
| #1 | 用户来回切换页面时，后台不因切页产生额外请求 | 每次进总览补一次取数；快照过期时还会发起排队型 refresh | 🟡 长导入期间反复进出总览，会在队列里堆积与用户操作无关的刷新请求（界面本身仍可用） |
| #2 | 面板新增不改变健康检查既有可见文案 | 健康检查那行被改名并去掉了一条既有建议 | 🟡 用户可能发现"熟悉的健康项改了名"（纠错性质，但需明示） |
| #3 | 无模型名时面板统一显示「—」 | 极端情况下渲染空白格 | 🟢 视觉缺省不一致（现配置下不可达） |
| #4 | 文档与实现一致 | 文档称不写快照文件，实际写入 | 🟢 后续维护者可能基于错误前提改动文件兼容逻辑 |

### 统计

- **总质疑数**：8（成立 4 —— #1/#2/#3/#4；不成立 4 —— #5/#6/#7/#8）
- **高风险**：0
- **中风险**：2（#1 #2）
- **低风险**：2（#3 #4）

## 🎯 行动建议

### 必须处理（对应 🔴 功能影响）

1. **无 🔴 项** —— 未发现会破坏既有功能或数据一致性的问题。

### 建议处理（对应 🟡 功能影响或健壮性）

1. `refetchOnMount: false` 并加回归锁（G4 delta=0）—— 否则长导入期间切页会堆积 refresh 请求（#1）【已实施】
2. 交付说明显著列出健康项改名与删除 rebuild 建议的理由，供用户否决（#2）【已在本报告与需求 §7 记录，待用户确认】

### 可选处理

1. 角标补就地恢复入口（点击重新检查）—— 目前恢复入口只在顶栏 banner（#8）
2. 统一维度值的两条通路（health 走 doctor 文本正则 `config=(\d+)`、面板走结构化字段）—— 正则在 doctor 文案改动时会静默失效（需求 §10 顺带发现 1）

---

## 🔁 第二轮质疑（diff 增量 · 2026-10-16，auto-review/code-review 阶段 7 触发）

首轮结论落地后 diff 已变化（按「同一变更 = diff 内容未变」的定义，去重不适用），故对 4 处增量单独再质疑：

| 增量 | 质疑点 | 验证方法与证据 | 结论 |
|------|--------|----------------|------|
| Δ1 `refetchOnMount:false` | 会不会把「应用启动时快照 unknown+过期 → 自动补一次 refresh」也阻断掉？ | 无数据时挂载必然取数（该选项只影响"有数据时的重取"）；证据：页面走查 **G1 首屏 GET=1**（若被阻断会是 0）、G5 全程 POST=0、G4 站内切回 delta=0；`invalidate`（任务完成）与手动「重新检查」路径不经过该选项 | ✅ 质疑不成立（行为与改动前等价） |
| Δ2 `?? '—'` → `\|\| '—'` | `\|\|` 会把合法 falsy 值误判成缺省吗？ | model 契约上恒为非空字符串（`config.ts:629-639` 兜底 `DEFAULT_EMBEDDING.model`），非空字符串不受 `\|\|` 影响 | ✅ 质疑不成立 |
| Δ3 需求文档 R3 表述订正 | 订正后是否与实测一致？ | 真实实例 `POST refresh` 后 `cat` 快照文件 ⇒ 含 `"model":"qwen3.7-text-embedding-flash"`（与订正后表述一致） | ✅ 一致 |
| Δ4 新增 `test/vector-dimension-snapshot.test.ts` | **测试是否会把真实用户环境拖进来？** | ★ **质疑成立**：`refreshVectorDimensionSnapshot` 内部的 `getVectorDimensionStatus` 会 `loadConfig()` 读**真实** `~/.ki/config.yaml`；若用户恰好存在同名 scope 的集合，`scopeCollectionExists` 为真 ⇒ `withEngine` 打开**真实向量库**（可能撞 daemon 锁，异常虽被 catch 吞掉但已触碰真实数据） | ⚠️ **已修**：`before` 把 `KI_CONFIG_PATH` 指向临时配置（dataDir / vectorDir 均在临时目录），并新增硬断言测试 ⓪「库内部 `loadConfig().dataDir === 临时目录`」；`after` 恢复原环境变量；测试 **7/7** 通过 |

**第二轮裁决**：✅ **无新增阻塞项** —— 唯一成立的 Δ4 已就地修复并以测试 ⓪ 锁定（这是"修复自身引入新风险"的典型，也说明增量轮不可省）。
