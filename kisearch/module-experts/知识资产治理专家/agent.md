# 知识资产治理专家 · agent.md

- **一句话职责**：回收站、知识视图（多库聚合）与图集包（整包上传 + 只读页）三块知识资产治理能力。
- **负责的模块**：src/lib/trash-*.ts + src/lib/*view*.ts + src/lib/atlas/ + src/{view,atlas}.ts
- **何时找这个专家**：- 删除/恢复文档或组
- 改知识视图成员与阈值
- 上传或移除图集包
- 排查图集包校验失败
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑（test 根级）；位置 `test/trash-*.test.ts / views-api.test.ts / atlas-package.test.ts / atlas-upload.test.ts`；命令 `npm run test:all`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
