---
groupPath: 数据流/对话与会话
relation: chat_conversation
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_conversation】
- 实体类型：表（ChatConversation extends TenantOrganizationBaseEntity）
- 结构：`purpose('private'|'group'|'group_assistant_runtime')`、`revision`（公开快照版本）、`lastMessageSequence`、`branchSource`、`threadId`、`title`、`status`、`options` json、`sourceAudit`、`error/operation`、`from/fromEndUserId`；FK xpertId/projectId/taskId；`attachments` 经 `chat_conversation_attachment` **已 @deprecated**（新 FileAsset / ConversationFileLink）
- 生产方：ChatConversationService.create/update（options 与 runtimeResources 白名单）；ChatConversationUpsertCommand；ConversationBranchService.branch（写 branchSource）
- 主要消费方：chat-conversation、chat-message、chat-group、handoff、ai（HTTP 适配）、sandbox、xpert、model-execution、copilot-checkpoint、agent-evolution、copilot、xpert-task、xpert-project、realtime-voice [基于引用扫描，未深入验证]
- 业务用途：会话账本主表；未读与读状态靠 `chat_conversation_read_state`，消息顺序靠 `lastMessageSequence` + 消息 sequence
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md