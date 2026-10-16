# 对话与会话专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/对话与会话专家/`
- **职责**：本域是平台**对话账本与投递账本的持有者**：会话/线程/目标/读状态与消息的持久化与授权、分支（写模型）与脉络地图（只读视图）、群聊协作（成员、发布幂等、收据、HITL）、handoff 投递队列（4 队列/4 消费者/路由/取消/死信）与运行时消息闭环（delivery → inbox → 续跑）。三种投影语义——`messageEnvelope`、`sequence`、群收据——是全域对外一致契约。
- **子专家**：子专家①[会话消息与分支地图子专家](file://.module-experts/后端专题/对话与会话专家/sub-experts/会话消息与分支地图子专家/C0-使用总览.md) · 子专家②[投递队列与运行时消息子专家](file://.module-experts/后端专题/对话与会话专家/sub-experts/投递队列与运行时消息子专家/C0-使用总览.md) · 子专家③[群聊协作子专家](file://.module-experts/后端专题/对话与会话专家/sub-experts/群聊协作子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/chat-conversation`
  - `server-ai/src/chat-message`
  - `server-ai/src/chat-message-feedback`
  - `server-ai/src/chat`
  - `server-ai/src/chat-group`
  - `server-ai/src/handoff`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 需要**新建/更新/删除会话**，或按 `threadId` 反查会话、读取会话详情与工作台导航：找本域。
  - 需要**写一条消息或授权读取一条消息**（含建议问题、任务摘要、资源卡片投影）：找本域。
  - 需要**从未锚定的历史点分叉出新会话**（保留检查点与文件链接）：找本域分支能力。
  - 需要**会话列表/未读/已读/侧边栏/摘要/消息反馈**：找本域。
  - 需要**群聊**（成员、发送、成员可见投影、偏好、HITL 交互、群内助手运行时）：找群聊协作子专家。
  - 需要**异步投递一条消息并可能等待结果**、需要**取消/暂停/恢复**、需要**查看或重驱一次投递回执**：找投递队列与运行时消息子专家。
- **测试状态**：chat（7）**：`commands/handlers/chat*.spec.ts`、`speech-to-text*.spec.ts`、`video-generation.service.spec.ts`、`supervisor.spec.ts`；无 `chat.controller.spec.ts`。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
