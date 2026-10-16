---
groupPath: 专题记忆/前端专题
relation: Agent 编排 Studio 专家
exportedAt: "2026-10-16T03:52:14.870Z"
---
**Agent 编排 Studio 专家**（Xpert 前端 · Agent 可视化编排画布）

- 模块：apps/cloud/src/app/features/xpert/studio（168 个非 spec .ts / 16850 行；Angular 17 + @foblex/flow）
- 入口路由：/xpert/x/:id/agents（features-routing → features/xpert/routes → xpert/xpert/routes 的 :id/agents）
- 能力：可视化编排（34 类节点）、草稿自动保存（1s 去抖）与撤销重做、版本发布、执行可视化（预览调试 / 状态检查器 / 检查点重跑）、Copilot 辅助编排、画布复用（知识库流水线复用 XpertStudioComponent）
- 专家资产位置：.module-experts/前端专题/Agent 编排 Studio 专家/
- 契约层：C0-使用总览 / C1-能力契约 / C2-使用流程 / C4-数据流向与消费 / C5-关键决策
- 实现层：implementation/01-架构 至 07-运维（05-接口含 24 条真实接口；06-测试含实测结论）
- 何时用：改画布/节点/配置面板、查草稿与版本机制、排查执行可视化、复用画布嵌入到其他页面、查编排相关前端接口
- 测试状态：部分可跑（9 spec = 6 PASS / 3 FAIL；2 个环境级缺依赖 + 1 个真实断言失败，见 test/known-failures.md）
- 资产基线：commit c07bb83d（2026-10-14）
- 发现入口：.module-experts/INDEX.md 与 前端专题/T0-专题总览.md