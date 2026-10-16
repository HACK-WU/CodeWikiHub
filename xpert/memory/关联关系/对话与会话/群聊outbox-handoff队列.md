---
groupPath: 关联关系/对话与会话
relation: 群聊outbox-handoff队列
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 群聊 outbox 与 handoff 队列（同域内跨子专家）
强度：必改——改 GroupOutboxService 的 route 产物（headers `handoffQueue`、payload `groupDeliveryId`/`xpertId`）或 deliver 的 lease/attempts 语义 → handoff 路由解析与 GroupMessageProcessor 必改；改 handoff 队列名/路由优先级 → 群投递必改
原因：群投递通过 handoff 消息头选择队列，收据（chat_message_recipient）与 Bull job 是两套状态，必须同时维护

群聊端：
- GroupOutboxService.route/flush/deliver/reconcile @ packages/server-ai/src/chat-group/group-outbox.service.ts
- GroupMessageProcessor.process / GroupRuntimeService @ packages/server-ai/src/chat-group/
- ChatMessageRecipient（leaseToken/leaseUntil/attempts/nextAttemptAt）@ packages/server-ai/src/chat-group/group.entity.ts

handoff 端：
- HandoffRouteResolver.resolve（header handoffQueue > typePolicy > 规则 > defaultQueue）@ packages/server-ai/src/handoff/dispatcher/handoff-route-resolver.service.ts
- HandoffQueueProcessor / Realtime / Batch / Integration @ packages/server-ai/src/handoff/message-queue.processor.ts