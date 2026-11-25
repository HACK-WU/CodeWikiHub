# 会话与追问子专家 · agent.md

- **一句话职责**：会话 CRUD、SSE 流、归档压缩与追问停止/接续。
- **负责的模块**：src/lib/chat/chat-*.ts + src/lib/chat/ask/ + src/lib/chat/compaction.ts
- **何时找这个专家**：- 改会话结构或 SSE 帧
- 排查刷新后接续失败
- 调整追问停止语义
- **契约层就绪**：C0-使用总览, C1-能力契约, C4-数据流向与消费
- **实现层就绪**：01-架构, 02-实现, 06-测试
- **测试状态**：✅ 可跑；位置 `test/chat/`；命令 `npm run test:chat`；详见 `test/known-failures.md`
- **包含的资产**：3 篇契约层 + 3 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
