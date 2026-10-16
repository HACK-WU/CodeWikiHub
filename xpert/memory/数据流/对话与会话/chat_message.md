---
groupPath: 数据流/对话与会话
relation: chat_message
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_message】
- 实体类型：表（ChatMessage extends TenantOrganizationBaseEntity）
- 结构：`sequence`（**每会话唯一，由会话行锁分配**）、`groupPublicationId`（每会话唯一，群发布幂等键）、`messageEnvelope` jsonb（唯一 provenance/presentation 契约）、`parent/role/status/content/reasoning/events/references/taskSummary/thirdPartyMessage/executionId/followUpMode/visibleAt`；唯一索引 `(conversationId, sequence)`、`(conversationId, groupPublicationId)`；FK conversation、XpertAgentExecution
- 生产方：ChatMessageUpsertCommand（消息唯一写入口）；群聊 GroupMessagesService.publish；分支复制（ConversationBranchService.branch 复制谱系与 envelope）
- 主要消费方：chat-message、chat-conversation、chat-group、ai（HTTP 适配）、sandbox、copilot-checkpoint、xpert-agent-execution、handoff [基于引用扫描，未深入验证]
- 业务用途：会话消息的唯一载体（含模型推理、事件、引用与任务摘要投影）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md；envelope 契约见 chat-message/MESSAGE-ENVELOPES.md