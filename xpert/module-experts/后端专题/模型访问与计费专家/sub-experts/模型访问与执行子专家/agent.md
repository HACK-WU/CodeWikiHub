# 模型访问与执行子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（模型访问与计费专家）
- **资产路径**：`.module-experts/后端专题/模型访问与计费专家/sub-experts/模型访问与执行子专家/`
- **职责**：本子专家回答「谁能用哪个模型、以什么凭据调用、这次调用怎么被准入与计量」，是父专家「模型访问与计费专家」的执行内核。它把三件事串成一条链：`model-access` 把「谁能用哪个模型」变成可审批、可过期、可撤销的**授权台账**；`model-execution` 把「一次执行」变成只存哈希的**一次性凭据**、DB 级串行化的**准入预占**与**不可变用量事实**；`model-gateway` 把「外部 API Key」变成受 publication 约束的**调用面**。三目录共用同一张 `model_gateway_call` 表与同一个 Execution 出口（`CopilotTokenRecordCommand`），但不持有积分账本本体，也不解析 provider 与 Copilot 配置。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/model-access`
  - `server-ai/src/model-execution`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 两套 OpenAI 兼容入口必须与凭据配对
  - `select:false` 列漏显式选取会静默取空
  - 自助查询端点没有 `@Permissions`，靠三重相等判定
  - `getSettings` / `getOrCreateSettings` 的 GET 有写副作用
  - 读路径普遍带自愈写
  - 预占残留只能经管理端核对释放
- **测试状态**：`model-access-scheduler.service.spec.ts`（`ModelAccessSchedulerService`）：`@Cron('0 * * * * *')` 任务在 Redis 锁内串起 `processAllDueGrants` 与 `reconcileLifecycleBatch`，游标读写与异常吞掉后不重抛。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
