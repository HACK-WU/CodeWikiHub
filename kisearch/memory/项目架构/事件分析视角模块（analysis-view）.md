---
groupPath: 项目架构
relation: 事件分析视角模块（analysis-view）
exportedAt: "2026-11-20T07:06:18.571Z"
---
事件 AI 分析结论按事件类型切换「视角」的实现落点，2026-11-20 实施（REQ-20261120-002）。

- 单一真源：`src/lib/events/analysis-view.ts` —— `AnalysisView`（fault/perf/change/generic）、`ANALYSIS_VIEWS`、`BASE_KIND_LABELS`（中性词=故障词表）、`VIEW_LABELS`（**部分映射**，缺项回退中性）、`PROFILES`（name/skeleton/emphasize/flag/rail/wide/summaryGuide/locateGuide）、`inferAnalysisView(typeId)`、`viewProfile`、`resolveKindLabel`。
- 推断口径：内置按 **id**（et_1 fault / et_2 perf / et_3 change）；**缺 typeId → fault**（历史行为不变）；有 id 但不在表 → generic。
- 生成侧：`src/lib/events/analysis-runner.ts` 的 `buildOutputTail(view)` 按视角生成第 5/6 条（JSON 示例 + chain 写法）与一句话口径；第 0 条声明「本节是输出格式的唯一权威」，压住用户提示词里的旧顺序句；第 1~4、7 条（防注入/禁臆造/空 candidates 合法/confidence/反引号路径）逐字保留。
- 消费侧：`conclusion-chain.ts` 的 `chainToLines(chain, view)`（追问上下文）、前端 `web/src/lib/analysisView.ts`（渲染副本，`viewRender` 给 emphasize/flag/rail/wide）+ `ConclusionChain.tsx`（`is-emph`/`is-flat`/`is-wide`）+ `governance.css`。
- 新增一个视角要改 5 处：后端 `analysis-view.ts`（VIEW_LABELS + PROFILES）、前端 `analysisView.ts`（VIEW_LABELS + RENDER）、必要时 `prompt-config.ts` 不加（顺序不在这里）。两处 `VIEW_LABELS` 由 `test/governance-contract.test.ts` ⑥ 逐字比对，漏改必红。
- 验证：`test/events/analysis-view.test.ts` 18 例 + `node scripts/run-tests.mjs test/events`。