# 事件与阶段子专家 · agent.md

- **一句话职责**：事件主体 CRUD、阶段流转、详情聚合与事件类型。
- **负责的模块**：src/lib/events/{event-service,event-detail,event-view,store,stage-log,type-service,members}.ts + src/event-types.ts
- **何时找这个专家**：- 改事件字段或阶段定义
- 排查 revision 冲突与 shortId 重复
- 调整详情页分块上限
- **契约层就绪**：C0-使用总览, C1-能力契约, C4-数据流向与消费
- **实现层就绪**：01-架构, 02-实现, 06-测试
- **测试状态**：✅ 可跑；位置 `test/events/`；命令 `node scripts/run-tests.mjs test/events --serial`；详见 `test/known-failures.md`
- **包含的资产**：3 篇契约层 + 3 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
