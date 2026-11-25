# 事件治理专家 · agent.md

- **一句话职责**：管理事件的创建、阶段流转、AI 分析与追问、参考文档与回收站，并把这些能力同时暴露给 HTTP 治理路由与 MCP 事件工具。
- **负责的模块**：src/lib/governance-*.ts + src/lib/events/ + src/event-types.ts + src/lib/mcp-tools/event-*.ts
- **何时找这个专家**：- 排查事件列表 / 详情 / 阶段流转异常
- 改造 AI 分析或追问链路
- 新增事件 MCP 工具或治理路由
- 定位回收站与参考文档数据丢失
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑；⚠️ test/events 不在 npm run test:all 默认扫描范围，必须显式带目录参数；位置 `test/events/（20 个 *.test.ts）+ 根级 test/*event*.test.ts`；命令 `node scripts/run-tests.mjs test/events --serial`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

## 子专家清单
- **事件与阶段子专家**：事件主体 CRUD、阶段流转、详情聚合与事件类型。（覆盖 src/lib/events/{event-service,event-detail,event-view,store,stage-log,type-service,members}.ts + src/event-types.ts）
- **AI 分析链路子专家**：事件 AI 分析的启动、取消、工具循环、结论链与数据链路产物。（覆盖 src/lib/events/analysis-*.ts + find-*.ts + deep-find-core.ts + conclusion-chain.ts + analysis-fs-tools.ts）
- **参考文档与结论子专家**：事件参考文档的增删查、AI 候选定位与追问结论补丁。（覆盖 src/lib/events/refs-*.ts + find-targets.ts + analysis-ask-*.ts + conclusion-chain.ts）
出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
