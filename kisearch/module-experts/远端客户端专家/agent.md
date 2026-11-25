# 远端客户端专家 · agent.md

- **一句话职责**：独立子包 ki-client：远端登记、能力协商、只读取件、分片/整包上传与文件级增量状态。
- **负责的模块**：ki-client/src/ + ki-client/test/ + ki-client/package.json
- **何时找这个专家**：- 对接远端 kisearch
- 排查上传跳过或重复上传
- 新增客户端命令
- 改配置源或增量状态
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑（npm test = npm run build && node --test test/*.test.mjs；主仓 test:all 不覆盖）；位置 `ki-client/test/*.test.mjs（7 个）`；命令 `cd ki-client && npm test`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
