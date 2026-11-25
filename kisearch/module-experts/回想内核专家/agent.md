# 回想内核专家 · agent.md

- **一句话职责**：ki_recall 的多轮带证据回想内核：范围解析与鉴权、快路径、工具循环预算、候选组装与审计。
- **负责的模块**：src/lib/recall/ + src/lib/mcp-tools/recall.ts + src/lib/mcp-tools/recall-kernel 相关测试
- **何时找这个专家**：- 排查 ki_recall 查错库或空结果
- 改召回预算与超时
- 新增可检索范围
- 定位 scope 越权
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑（test:all 覆盖根级 test 目录）；位置 `test/recall-kernel.test.ts / test/recall-tool.test.ts / test/events/*scope*.test.ts`；命令 `npx jiti test/recall-tool.test.ts`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
