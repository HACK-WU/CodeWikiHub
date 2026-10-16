---
groupPath: 关联关系/对话与会话
relation: messages-sequence-会话行锁
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 消息顺序分配 与 会话行锁与投影
强度：必改——改会话行的 `lastMessageSequence`/`revision` 语义，或绕过会话行锁直接写消息 → 投影（成员可见 snapshot、未读、导航）必改/错乱；改消息读取路径（presentation 策略）→ 会话侧投影需同步
原因：`sequence` 注释明写 allocated under the conversation row lock；单会话是写热点，唯一索引 `(conversationId, sequence)` 是并发底线

会话端：
- ChatConversation.lastMessageSequence / revision @ packages/server-ai/src/chat-conversation/conversation.entity.ts
- ChatConversationService.markRead / resolveLastReadMessage @ packages/server-ai/src/chat-conversation/conversation.service.ts

消息与投影端：
- ChatMessage.sequence（唯一）@ packages/server-ai/src/chat-message/chat-message.entity.ts
- GroupMessagesService.snapshot（按 readSequence/receipts 投影）@ packages/server-ai/src/chat-group/group-messages.service.ts
- ConversationMapService.presentation（turnNodes/humanMessageSummary 投影）@ packages/server-ai/src/chat-conversation/conversation-map/