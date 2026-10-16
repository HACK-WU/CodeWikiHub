---
groupPath: 决策记录/平台插件与技能
relation: 安全合规-setup用PG锁且进度不留凭据
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜setup 向导用 PG advisory lock 串行化，且进度不保留凭据】
- 分类：安全合规
- 动机：避坑：操作员刷新页面、换副本或并排开两个浏览器重跑系统初始化 → 重复安装插件、并发写坏进度或产生两份「已完成」假状态；若把凭据一并落库，进度表成为密钥泄漏面
- 决策：用**专用** QueryRunner 连接执行 `SELECT pg_try_advisory_lock(hashtext('xpert:setup-plugins:<tenantId>'))`，拿不到锁直接返回当前 status（幂等）；锁在异步任务 finally 中释放、进程退出由 PG 自动释放。进度以确定性主键（uuidv5('xpert:setup-plugins:<tenantId>')）写入 tenant_setting，**只存状态不存凭据**；每项安装前后都落盘，单项失败只标 failed 并继续，可在同一把锁下续跑
- 背景约束：该向导**强绑定 PostgreSQL**（hashtext 与 advisory lock 不可用于 SQLite/MySQL）；30s 无回执或回执缺失一律降级为 attention，不做乐观完成
- 被否决方案：无（以 Invariants 注释固定该机制）
- 重新评估触发条件：需要支持非 PostgreSQL 部署形态；或需要多个租户并发初始化时的锁粒度调整（当前按 tenantId 一把锁）
- 关联代码：setup-plugins.store.ts、setup-plugins.service.ts、setup-plugins.schema.ts @ packages/server/src/plugin/setup/
- 证据来源：setup-plugins.store.ts:1-5 Invariants（PostgreSQL owns the install lock across replicas and browser retries … without retaining credentials.）