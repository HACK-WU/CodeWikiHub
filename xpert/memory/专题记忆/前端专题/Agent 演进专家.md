---
groupPath: 专题记忆/前端专题
relation: Agent 演进专家
exportedAt: "2026-10-16T03:52:14.870Z"
---
**Agent 演进专家**（Xpert 前端 · 演进工作台域）

- 模块：features/agent-evolution（18 非 spec .ts / 9 spec）：facade/api.service/types/chart-theme/component + 子页 changes/detail/evaluation/learning/overview/release/targets/shared
- 入口路由：/agent-evolution/*
- 核心契约：AgentEvolutionFacade（lifecycleRecords/contextLifecycleRecords(computed)/changes/dashboard/eventPage/candidatePage/releasePage/loading/synchronizing/providerError）；AgentEvolutionApiService（API_AGENT_EVOLUTION：/changes、/changes/:id/evaluations|decisions|publication）；types（Evolution* 类型 + EMPTY_* 空态）
- 排查入口：门面 providerError（数据源不可用态）；变更/发布的版本上下文是理解数据的钥匙
- 专家资产位置：.module-experts/前端专题/Agent 演进专家/
- 契约层：C0 / C1；实现层：implementation/01-架构（含测试状态）
- 测试状态：基本可跑（2026-10-15 实测 9 spec = 8 PASS / 1 FAIL 环境级 @xpert-ai/store）
- 资产基线：commit c07bb83d（2026-10-15）