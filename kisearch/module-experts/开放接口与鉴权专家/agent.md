# 开放接口与鉴权专家 · agent.md

- **一句话职责**：对外 /open/v1/* 通道：能力位协商、Bearer 鉴权、只读取件、上传暂存与图集包部署，并管理用户/角色与路由权限。
- **负责的模块**：src/lib/open-api/ + src/lib/auth/ + src/lib/web-*.ts + src/user.ts
- **何时找这个专家**：- 对接第三方程序或 ki-client
- 排查 401/403 或能力位缺失
- 新增对外端点
- 改上传体积上限
- **契约层就绪**：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- **实现层就绪**：01-架构, 02-实现, 03-数据流转, 04-模型, 05-接口, 06-测试, 07-运维
- **测试状态**：✅ 可跑（test 根级）；位置 `test/open-api-*.test.ts + capability-coverage.test.ts + governance-routes.test.ts`；命令 `npm run test:all`；详见 `test/known-failures.md`
- **包含的资产**：5 篇契约层 + 7 篇实现层 + `test/known-failures.md`

出处行：生成日期 2026-11-25，资产基线 `0f1426b`（工作区另含 20 个未提交改动，按当前工作区建）。
