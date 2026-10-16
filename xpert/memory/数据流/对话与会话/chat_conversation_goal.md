---
groupPath: 数据流/对话与会话
relation: chat_conversation_goal
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_conversation_goal】
- 实体类型：表（ChatConversationGoal）
- 结构：唯一索引 `(conversationId, threadId)`；目标文本与状态
- 生产方：ChatConversationService.get/set/update/clearGoal（goal 子域）
- 主要消费方：chat-conversation（会话目标展示与运行提示）、ai（会话 goal 端点）[基于引用扫描，未深入验证]
- 业务用途：会话（按线程粒度）的目标记录，用于运行上下文与展示
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md