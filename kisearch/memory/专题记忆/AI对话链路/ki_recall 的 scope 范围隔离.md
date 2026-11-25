---
groupPath: 专题记忆/AI对话链路
relation: ki_recall 的 scope 范围隔离
exportedAt: "2026-11-25T03:11:53.589Z"
---
`ki_recall` 的检索范围**只来自调用方传入的 scope**，进入内部循环后模型无法扩大——只能在其中缩小。

机制（四道）：
1. 工具层把 `pre.physicalTargets` 注入 `makeRecallToolRunner({ targets })`，循环内没有改集合的入口；
2. `ki_search` 的 function schema **没有 scope 参数**，执行时固定 `targets.join(',')`（一次检索多库）；
3. `ki_get_module_info` / `ki_group_list` / `ki_tag_list` 虽有 `scope` 参数，但 `pickScope()` 只认 targets 内的名字，**传 targets 之外 → 静默回落 `targets[0]`**（不报错）；
4. `ki_scope_list` 返回的是本次 targets，不是全库清单，模型也无从发现别的库名。

口径细节：
- 视图名只用于**回显**（`targets`）；检索与可见性判定都在展开后的 `physicalTargets` 上（视图直接当库查会让命中全被当“已不存在”丢弃）；
- 预算：`MAX_SCOPE_INPUT=8`（schema 允许）→ `MAX_TARGETS=6`（点名上限，超出进 skipped{truncated}）→ `MAX_PHYSICAL=12`（展开后物理库上限）；
- 点名却不存在 / 无权 → 工具层直接报错（不降级），这是与“模型传错 scope”两回事。

⚠️ 已知静默点：`pickScope` 回落而非报错。好处是模型不会因写错库名卡住；代价是它以为查了 A 库、实际查 targets[0]，表现为“文档读不到 / 读成同名另一篇”。与 fail-loud 偏好相反，是否改报错待拍板。

- 位置: `src/lib/recall/tool-runner.ts`（pickScope）、`src/lib/recall/targets.ts`、`src/lib/recall/types.ts`、`src/lib/recall/run-recall.ts`（TOOL_DEFS）