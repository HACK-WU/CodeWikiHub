---
groupPath: 数据流/对话与会话
relation: chat_conversation_thread
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_conversation_thread】
- 实体类型：表（ChatConversationThread）
- 结构：`threadId` unique、`conversationId` + `updatedAt`（查询维度）
- 生产方：ConversationThreadService / ChatConversationService（会话与线程的绑定）；线程运行控制与 thread-state 写入
- 主要消费方：chat-conversation（按 threadId 反查会话、findOneByThreadId 未命中回退线程表）、ai（/api/ai/threads 适配）、copilot-checkpoint [基于引用扫描，未深入验证]
- 业务用途：threadId ⇄ conversation 的映射表；线程态与运行控制以此为入口
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md