---
groupPath: 关联关系/对话与会话
relation: chat_message-分支与群发布
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] chat_message 与 分支复制与群发布幂等
强度：必改——改消息列语义（sequence/parentId/messageEnvelope/groupPublicationId/messageHash/messagePathHash）或两个唯一索引 → 分支复制、群发布幂等、成员可见投影与前端渲染必改；改分支/发布内部实现 → 消息表不用管
原因：分支要复制消息谱系并**重算 hash**，群发布要靠 groupPublicationId 幂等，两者都把消息字段当契约

消息端：
- ChatMessage（sequence 每会话唯一・groupPublicationId 每会话唯一・messageEnvelope）@ packages/server-ai/src/chat-message/chat-message.entity.ts
- ChatMessageUpsertCommand（唯一写入口）@ packages/server-ai/src/chat-message/commands/handlers/upsert.handler.ts

分支与发布端：
- ConversationBranchService.branch（复制谱系 + 重算 hash + 检查点）@ packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.service.ts
- GroupMessagesService.publish / snapshot（收据与投影）@ packages/server-ai/src/chat-group/group-messages.service.ts