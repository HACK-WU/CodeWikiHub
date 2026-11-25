---
groupPath: 专题记忆/AI对话链路
relation: 批 3-C：分析链路只读工具自选 scope（authScopes 注入）
exportedAt: "2026-11-25T06:11:26.162Z"
---
2026-11-25 批 3-C：**事件 AI 分析**的只读工具也支持模型自选 scope，写工具保持锁定（Q5）。

**开关口径（关键）**：`buildKbReadToolEntries(scope, config, deps, opts)` 第 4 参 `opts.authScopes`。
- **有该键**（含显式 `null` = 本机不限权）→ 开启自选；
- **不传**（旧调用 / 单测）→ 保持「只能查事件所在库」，避免无鉴权入口白拿自由换库。

**鉴权与范围**：复用 `resolveRecallTargets`（存在 + 授权 + 视图展开）；失败回可行动错误、**不回落**。视图需本身在授权名单（生产 `ctx.authScopes` 已合并 viewGrants）且成员全含。

**五个只读工具都加了 `scope`**：ki_search（多库一次查 `physical.join(',')`）、ki_get_module_info（视图展开后逐个试，最多 5 个）、ki_group_list / ki_tag_list（取首个物理库）、ki_get_image（同读正文，逐个试）。写工具（`buildKbWriteToolEntries`）**不加**（单测锁住）。

**排队互斥**：`runScopedRead(toolName, effScope, fn)` 改为按**实际生效 scope** 入队（`OperationCoordinator.submit` 的 `[effScope]`）——沿用装配期单值会让换了库的调用与同库写操作不再互斥。

**上下文注入**：`buildRuntimeEnv` 新增 `extraLines` 参，分析把 `kbScopeEnv` 传入 —— 开启时写明「默认范围 + 五个工具可传 scope 换库/视图 + 写工具锁事件库」，未开启时明说「本次不允许换库」（避免模型白试）。

**authScopes 传递链**：`governance-http` 的 analyze / ask 两处 → `startEventAnalysis(...,{authScopes})` → `executeAnalysisBackground(input.authScopes)` → `buildKbReadToolEntries`；追问侧 `AskEventAnalysisArgs.authScopes` → `buildAskToolEntries(...,scopeOpts)`。

**测试**：新增 `test/events/analysis-scope-switch.test.ts` 9 例（默认库 / 传了真传到执行层 / 视图展开多库 / 读正文逐个试 / 不可用报错且不执行 / 无权拒绝 / 未注入则锁定 / 写工具无 scope），全绿。

**未做**：未跑真实分析的整链路真机（一次分析成本高）；`buildWriteWarnings` 仍按事件库单值判定（写工具未放开，故未改）。