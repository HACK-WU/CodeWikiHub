# 参考文档与结论子专家 · agent.md

- **一句话职责**：事件参考文档的增删查、AI 候选定位与追问结论补丁。
- **负责的模块**：src/lib/events/refs-*.ts + find-targets.ts + analysis-ask-*.ts + conclusion-chain.ts
- **何时找这个专家**：- 参考文档丢失或串库
- 追问结论没落盘
- AI 查找候选定位不准
- **契约层就绪**：C0-使用总览, C1-能力契约, C4-数据流向与消费
- **实现层就绪**：01-架构, 02-实现, 06-测试
- **测试状态**：✅ 可跑；位置 `test/events/*ref*.test.ts / analysis-ask-*.test.ts`；命令 `node scripts/run-tests.mjs test/events --serial`；详见 `test/known-failures.md`
- **包含的资产**：3 篇契约层 + 3 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
