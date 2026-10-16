---
groupPath: 数据流/对话与会话
relation: chat_message_recipient
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_message_recipient】
- 实体类型：表（ChatMessageRecipient，群聊投递收据）
- 结构：唯一索引 `(messageId, participantId)`；`status`、`wake`、`attempts`、`nextAttemptAt`、`phase`、`leaseToken`/`leaseUntil`、`control`；索引 `(status, nextAttemptAt)`
- 生产方：GroupMessagesService.publish（收据 fan-out）；GroupOutboxService.deliver/reconcile（lease 与重试推进）
- 主要消费方：chat-group（成员可见投影 snapshot 按 readSequence/receipts 计算）、GroupMessageProcessor [基于引用扫描，未深入验证]
- 业务用途：群消息逐个成员的投递收据与重试状态（与群发布幂等键配合）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md