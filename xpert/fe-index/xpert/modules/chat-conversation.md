# ChatConversationModule（`chat-conversation`）

- **位置**：`packages/server-ai/src/chat-conversation/` · 归属文件 **94** 个 · 约 **7875** 行
- **定义**：`packages/server-ai/src/chat-conversation/conversation.module.ts:42`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `my`、`:id`、`unread` 等 5 个 · 视图/接口入口 **25** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/chat-conversation/conversation-sidebar.controller.ts`（ChatConversationSidebarController） | `-` | 2 | `:19` |
| `packages/server-ai/src/chat-conversation/conversation.controller.ts`（ChatConversationController） | `-` | 23 | `:61` |

## 依赖关系

- **依赖**（改它要连带看）：`ArtifactsModule`、`ChatMessageModule`、`ExecutionCancelModule`、`RedisModule`、`SharedModule`、`SseStreamModule`、`StorageFileModule`、`SuperAdminOrganizationScopeModule`、`XpertAgentExecutionModule`、`XpertProjectAccessModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatGroupModule`、`ChatMessageFeedbackModule`、`ChatModule`、`ConversationBranchModule`、`ConversationMapModule`、`FileUnderstandingModule`、`ServerAIModule`、`XpertAgentModule`、`XpertMiddlewareModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`BullModule`

## 事件/命令耦合（不经 imports，8 出 / 15 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentInvocationModule`（CQRS：`CancelTaskWaitsCommand`）
- → `ChatGroupModule`（CQRS：`GetGroupConversationEntryCommand`）
- → `ChatMessageModule`（CQRS：`ChatMessageUpdateJobCommand`）
- → `FileUnderstandingModule`（CQRS：`GetFileAssetByStorageFileQuery`、`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）
- → `HandoffQueueModule`（CQRS：`StopHandoffMessageCommand`）
- → `StorageFileModule`（CQRS：`StorageFileCreateCommand`）
- → `XpertAgentExecutionModule`（CQRS：`FindAgentExecutionsQuery`、`XpertAgentExecutionStateQuery`）
- → `XpertModule`（CQRS：`FindXpertQuery`、`ResolveAssistantFileAccessCommand`、`XpertSummarizeMemoryCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`AssertChatConversationAccessQuery`、`CancelConversationCommand`、`CancelExternalAssistantCommand`、`ChatConversationBindProjectCommand`、`ChatConversationBindXpertCommand`、`ChatConversationDeleteCommand`）
- ← `AgentEvolutionModule`（`ChatConversationUpsertCommand`）
- ← `ChatGroupModule`（`CancelConversationCommand`）
- ← `ChatMessageModule`（`AssertChatConversationAccessQuery`）
- ← `ChatModule`（`ChatConversationUpsertCommand`、`GetChatConversationQuery`）
- ← `CopilotCheckpointModule`（`AssertChatConversationAccessQuery`）
- ← `CopilotModule`（`StatisticsAverageSessionInteractionsQuery`、`StatisticsDailyConvQuery`、`StatisticsDailyEndUsersQuery`、`StatisticsDailyMessagesQuery`、`StatisticsModelsQuery`、`StatisticsTokenCostQuery`）
- ← `DesktopShellModule`（`AssertChatConversationAccessQuery`）
- ← `EnterpriseChatkitModule`（`CancelSummaryJobCommand`、`ChatConversationDeleteCommand`、`ChatConversationLogsQuery`、`ChatConversationUpsertCommand`、`FindChatConversationQuery`、`GetChatConversationQuery`）
- ← `KnowledgebaseModule`（`AssertChatConversationAccessQuery`）
- ← `ServerAIModule`（`AssertChatConversationAccessQuery`）
- ← `XpertAgentExecutionModule`（`AssertChatConversationAccessQuery`）
- ← `XpertModule`（`CancelSummaryJobCommand`、`ChatConversationDeleteCommand`、`ChatConversationLogsQuery`、`ChatConversationUpsertCommand`、`FindChatConversationQuery`、`GetChatConversationQuery`）
- ← `XpertProjectAccessModule`（`AssertChatConversationAccessQuery`、`FindChatConversationQuery`）
- ← `XpertProjectModule`（`AssertChatConversationAccessQuery`、`FindChatConversationQuery`）

## 数据表（12）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_conversation` | ChatConversation | 31 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/chat-execution-admission.service.ts:64` |
| `chat_conversation_thread` | ChatConversationThread | 14 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/chat-execution-admission.service.ts:15` |
| `chat_message` | ChatMessage | 8 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/thread-reference.service.ts:34` |
| `copilot_checkpoint` | CopilotCheckpoint | 7 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/message-checkpoint.service.ts:21` |
| `chat_conversation_goal` | ChatConversationGoal | 5 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/conversation-thread.service.ts:290` |
| `xpert_assistant_user_preference` | AssistantUserPreference | 3 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/conversation-sidebar.service.ts:20` |
| `chat_conversation_read_state` | ChatConversationReadState | 3 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/conversation.service.ts:54` |
| `copilot_checkpoint_writes` | CopilotCheckpointWrites | 3 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/conversation-thread.service.ts:259` |
| `xpert_agent` | XpertAgent | 3 | @Module imports forFeature | `packages/server-ai/src/chat-conversation/task-summary.service.ts:48` |
| `xpert_agent_execution` | XpertAgentExecution | 3 | getRepository | `packages/server-ai/src/chat-conversation/chat-execution-admission.service.ts:96` |
| `conversation_file_link` | ConversationFileLink | 1 | getRepository | `packages/server-ai/src/chat-conversation/message-checkpoint.service.ts:109` |
| `user` | User | 1 | getRepository | `packages/server-ai/src/chat-conversation/queries/handlers/conversation-logs.handler.ts:258` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`
- **CQRS Handler**（25）：`ChatConversationBindXpertCommand`、`ListConvFilesCommand`、`ChatConversationUpsertCommand`、`CancelExternalAssistantCommand`、`CancelConversationCommand`、`ConvFileDeleteCommand` 等 25

## 归属文件（94）

- `packages/server-ai/src/chat-conversation/thread-read-projection.ts`
- `packages/server-ai/src/chat-conversation/file-change-stats.service.ts`
- `packages/server-ai/src/chat-conversation/thread-reference.contract.ts`
- `packages/server-ai/src/chat-conversation/workbench-assistant-conversation-navigation.service.ts`
- `packages/server-ai/src/chat-conversation/workbench-navigation.schema.ts`
- `packages/server-ai/src/chat-conversation/summary.job.ts`
- `packages/server-ai/src/chat-conversation/conversation.controller.ts`
- `packages/server-ai/src/chat-conversation/conversation-relations.ts`
- `packages/server-ai/src/chat-conversation/conversation-read-state.entity.ts`
- `packages/server-ai/src/chat-conversation/chat-execution-admission.service.ts`
- `packages/server-ai/src/chat-conversation/thread-reference.service.ts`
- `packages/server-ai/src/chat-conversation/conversation.subscriber.ts`
- `packages/server-ai/src/chat-conversation/workspace-file-capabilities.ts`
- `packages/server-ai/src/chat-conversation/index.ts`
- `packages/server-ai/src/chat-conversation/message-checkpoint.service.ts`
- `packages/server-ai/src/chat-conversation/bind-empty-conversation-project.ts`
- `packages/server-ai/src/chat-conversation/conversation-sidebar.controller.ts`
- `packages/server-ai/src/chat-conversation/thread-run-control.service.ts`
- `packages/server-ai/src/chat-conversation/conversation-sidebar.service.ts`
- `packages/server-ai/src/chat-conversation/conversation-options-sql.ts`
- `packages/server-ai/src/chat-conversation/conversation-initializer.registry.ts`
- `packages/server-ai/src/chat-conversation/conversation-thread.service.ts`
- `packages/server-ai/src/chat-conversation/task-summary.service.ts`
- `packages/server-ai/src/chat-conversation/thread-history.query.ts`
- `packages/server-ai/src/chat-conversation/thread-display-pause.ts`
- `packages/server-ai/src/chat-conversation/conversation-thread.entity.ts`
- `packages/server-ai/src/chat-conversation/thread-run-lease.ts`
- `packages/server-ai/src/chat-conversation/conversation.module.ts`
- `packages/server-ai/src/chat-conversation/message-path.ts`
- `packages/server-ai/src/chat-conversation/conversation.entity.ts`
- `packages/server-ai/src/chat-conversation/thread-cursor.store.ts`
- `packages/server-ai/src/chat-conversation/conversation.service.ts`
- `packages/server-ai/src/chat-conversation/commands/conversation-delete.command.ts`
- `packages/server-ai/src/chat-conversation/commands/upsert.command.ts`
- `packages/server-ai/src/chat-conversation/commands/upsert-file.command.ts`
- `packages/server-ai/src/chat-conversation/commands/cancel-summary.command.ts`
- `packages/server-ai/src/chat-conversation/commands/delete-file.command.ts`
- `packages/server-ai/src/chat-conversation/commands/index.ts`
- `packages/server-ai/src/chat-conversation/commands/bind-xpert.command.ts`
- `packages/server-ai/src/chat-conversation/commands/bind-project.command.ts`
- ……其余 54 个见 JSON 输出（完整清单）
