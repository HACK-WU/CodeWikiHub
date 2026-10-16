# 群聊协作子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（对话与会话专家）
- **资产路径**：`.module-experts/后端专题/对话与会话专家/sub-experts/群聊协作子专家/`
- **职责**：本子专家是**群协作账本的持有者**：群成员模型与准入、公开消息发布幂等、成员可见投影、成员偏好、HITL 交互登记与领取、群内助手运行时准入与收尾、投递收据与 outbox 适配、SSE 观察者流、composer 校验、群任务目标解析。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/chat-group`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 需要建群、加/移除成员、查邀请候选、看群侧边栏摘要：找本子专家。
  - 需要以人类身份发送一条群消息（mention 解析、回复原请求）：找 `submit`。
  - 需要以助手/程序身份发一条群消息（工具发布、续跑输出投影）：找 `send` / `publish`。
  - 需要读取「该调用者可见」的群消息投影（含收据、运行状态、待处理交互）：找 `snapshot`。
  - 需要成员个人偏好（已读水位、置顶、归档）：找 `preferences`。
  - 需要 HITL 交互（客户端工具请求、审批/编辑决策）的登记、认领与应答：找 `GroupInteractionsService`。
- **测试状态**：假定时器**：涉及退避与 `setInterval` 的用例用 `jest.useFakeTimers()` + `jest.advanceTimersByTimeAsync(1000)`（`group-outbox.spec.ts`、`group-stream.spec.ts`）。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
