---
groupPath: 数据流/对话与会话
relation: chat_conversation_read_state
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_conversation_read_state】
- 实体类型：表（ChatConversationReadState）
- 结构：唯一索引 `(tenantId, organizationId, conversationId, userId)`；记录每个查看者的已读位置
- 生产方：ChatConversationService.markRead / ensureInitialReadState / saveConversationReadState / upsertConversationReadState（事务 upsert）
- 主要消费方：chat-conversation（未读统计 getUnreadByXperts、侧边栏）、ai（会话列表未读）[基于引用扫描，未深入验证]
- 业务用途：**读状态属于查看者**（不是会话属性），按唯一索引 upsert
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md