---
groupPath: 关联关系/Assistant 定义与运行时
relation: Assistant定义-对话与会话（双向）
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] Assistant 定义与运行时 与 对话与会话（双向）

影响线1（结构/目录线）：改 `ai/**` 适配器的路由注册位置或前缀（`/api/ai/conversations`、`/api/ai/threads`、`/api/ai/groups/*`）→ 对话与会话域必改（适配器目录归属在 A、领域归属在 B）；原因：两端共同消费同一批会话/线程/群契约
影响线2（领域/语义线）：改会话/消息/群聊/投递语义（sequence 分配、messageEnvelope、群发布幂等、run 控制）→ A 的运行时助手面与准入必须连带适配；原因：A 侧的运行入口直接暴露这些能力

原因：两条依赖线方向相反，均为强关联（改动前先确认改的是「适配器/wire」还是「领域语义」）

A 端：
- ai/thread.controller.ts / ai/conversation.controller.ts / ai/groups/**（适配器与守卫）@ packages/server-ai/src/ai/
- PublishedXpertAccessService（准入与凭证受众）@ packages/server-ai/src/xpert/published-xpert-access.service.ts

B 端：
- ChatConversationService.assertAccess / ChatMessageUpsertCommand @ packages/server-ai/src/{chat-conversation,chat-message}/
- GroupMessagesService.publish @ packages/server-ai/src/chat-group/group-messages.service.ts
- ThreadRunControlService（pause/resume/租约）@ packages/server-ai/src/chat-conversation/thread-run-control.service.ts