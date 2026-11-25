# AI 分析链路子专家 · agent.md

- **一句话职责**：事件 AI 分析的启动、取消、工具循环、结论链与数据链路产物。
- **负责的模块**：src/lib/events/analysis-*.ts + find-*.ts + deep-find-core.ts + conclusion-chain.ts + analysis-fs-tools.ts
- **何时找这个专家**：- 改 AI 查找预算或工具集
- 排查分析状态卡在 running
- 调整结论链与数据链路字段
- **契约层就绪**：C0-使用总览, C1-能力契约, C4-数据流向与消费
- **实现层就绪**：01-架构, 02-实现, 06-测试
- **测试状态**：✅ 可跑；位置 `test/events/analysis-*.test.ts`；命令 `node scripts/run-tests.mjs test/events --serial`；详见 `test/known-failures.md`
- **包含的资产**：3 篇契约层 + 3 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
