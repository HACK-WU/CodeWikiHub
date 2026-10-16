# Agent 演进专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/Agent 演进专家/`
- **入口路由**：`/agent-evolution/*`（`canActivate: [authGuard, NgxPermissionsGuard]`）
- **职责**：「Agent 演进专家」是 Xpert 前端的**演进治理工作台**：把「学习信号 → 改进提案 → 候选版本 → 评估与审批 → 发布（安装/影子/金丝雀/生产）→ 效果与回滚」这条闭环在一个页面族里读出来、点下去。它由三层构成——**壳**（`AgentEvolutionComponent`，5 个 tab + 目标选择 + 4s 轮询）、**门面**（`AgentEvolutionFacade`，一次 `load()` 聚合 17 路数据并派生上下文 computed 族）、**数据源**（`AgentEvolutionApiService`，`API_AGENT_EVOLUTION =
- **覆盖目录**：
  - `apps/cloud/src/app/features/agent-evolution（18 非 spec / 9 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 要改 **`/agent-evolution/*` 的路由、tab、副标题、目标选择或夹具开关**——先看 [routes.ts](file://apps/cloud/src/app/features/agent-evolution/routes.ts) 与 [agent-evolution.component.ts](file://apps/cloud/src/app/fea
  - 页面**数据不刷新 / 刷新错位**（组织切换、目标切换、夹具开关后列表未变）——看门面的 computed 依赖链与 `#scopeRevision` / `#loadRevision`。
  - 出现**「数据源不可用」横幅或 Retry 按钮**——`facade.providerError()` 语义与恢复路径。
  - 要**新增/修改一个演进接口调用**——`AgentEvolutionApiService` 是唯一出口，基址常量 `API_AGENT_EVOLUTION`。
  - 要判断**某个变更/发布记录当前处于哪一步、为什么卡住**——`changeDetailPresentation` 的 `steps` / `blockedBy` / `reasons` / `result`。
  - 要动**审批门、角色路径与「还差几人」**——`evolutionApprovalGatePresentation` 与 `AISPermissionsEnum` 中的 `EVOLUTION_MANAGE`（`@xpert-ai/contracts` 的 `AIPermissionsEnum`）。
- **测试状态**：9 spec = 8 PASS / 1 FAIL（环境级 @xpert-ai/store 缺依赖；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
