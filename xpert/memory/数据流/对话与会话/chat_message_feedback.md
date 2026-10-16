---
groupPath: 数据流/对话与会话
relation: chat_message_feedback
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_message_feedback】
- 实体类型：表（ChatMessageFeedback）
- 结构：`rating`、`content` 等（关联消息与会话）
- 生产方：ChatMessageFeedbackService.createAuthorized/updateAuthorized/deleteAuthorized（**均先经会话 assertAccess**）
- 主要消费方：chat-message-feedback（授权 CRUD）、chat-conversation（摘要联动 triggerSummary/deleteSummary）、ai（feedback 端点与 searchFeedbacks）[基于引用扫描，未深入验证]
- 业务用途：消息质量反馈（对话页与 Studio 共用）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md