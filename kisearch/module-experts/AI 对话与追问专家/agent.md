# AI 对话与追问专家 · agent.md

- **一句话职责**：提供 Web 端 SSE 流式对话、ki_ask 单库问答与追问的停止/接续，以及提示词配置与工具循环编排。
- **负责的模块**：src/lib/chat/ + src/lib/mcp-tools/ask.ts + test/chat/
- **何时找这个专家**：- 排查对话流中断或 SSE 帧异常
- 改提示词配置或工具循环预算
- 新增对话工具
- 定位追问停止/续接问题
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑（npm run test:all 亦含 test/chat）；位置 `test/chat/（42 个 *.test.ts）`；命令 `npm run test:chat`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

## 子专家清单
- **会话与追问子专家**：会话 CRUD、SSE 流、归档压缩与追问停止/接续。（覆盖 src/lib/chat/chat-*.ts + src/lib/chat/ask/ + src/lib/chat/compaction.ts）
- **工具循环与技能子专家**：对话侧工具集注册、工具循环、内置 skill 与响应投影。（覆盖 src/lib/chat/retrieval/ + src/lib/chat/mcp-tool-registry.ts + src/lib/chat/prompt-config.ts）
出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
