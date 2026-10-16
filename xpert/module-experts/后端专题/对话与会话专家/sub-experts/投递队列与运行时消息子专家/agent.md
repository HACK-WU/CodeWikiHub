# 投递队列与运行时消息子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（对话与会话专家）
- **资产路径**：`.module-experts/后端专题/对话与会话专家/sub-experts/投递队列与运行时消息子专家/`
- **职责**：本子域是「会话 / 群聊 / 执行」三条链共享的**异步投递与运行时回执底座**：它把「已决定要执行的工作」变成可在多副本下安全投递、可重试、可取消、可观测的队列消息（4 个 Bull 队列与 4 个消费者、路由解析、批量入队、扫描式取消、重试耗尽落死信），并在运行时侧维护 `agent_runtime_delivery`（outbox）→ 队列 → `agent_runtime_inbox`（inbox）→ 续跑 / 观测的持久闭环。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/handoff`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 需要把一条业务意图**异步交给运行时**执行，且不想自己实现重试、并发与队列：找 `HandoffQueueService.enqueue`。
  - 需要一次投递的**最终结果回传**给调用方：找 `enqueueAndWait`（注意「仅本进程」限制）。
  - 需要**把不同消息类型 / 租户 / 来源分流到不同队列**，或需要覆盖默认路由：找 `HandoffRouteResolver.resolve` 与 YAML 路由配置。
  - 需要**批量投递**（如一次回投多条 `outbound`）：找 `enqueueMany`。
  - 需要**取消**已入队 / 正在执行的投递：找 `StopHandoffMessageCommand`（入参 `messageIds` / `executionIds`）。
  - 需要排查「运行时结果为什么没回到会话」：先读 owner 级回执 `GET /api/agent-invocations/:id/delivery`。
- **测试状态**：本子域共有 **13 个 spec 文件**（`handoff/**` 下含 `.spec.ts` 的全部文件），另有 3 个测试支撑文件（`.cases.ts` / `.schemas.ts`）与 1 个跨域集成 spec 承载真库用例。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
