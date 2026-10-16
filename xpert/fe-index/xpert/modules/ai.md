# AIModule（`ai`）

- **位置**：`packages/server-ai/src/ai/` · 归属文件 **70** 个 · 约 **9292** 行
- **定义**：`packages/server-ai/src/ai/ai.module.ts:72`（nestjs）
- **挂载前缀**：`/api/assistants`、`/api/assistants/:assistantId/connectors`、`/api/assistants/:assistantId/template-setup` 等 21 个 · 视图/接口入口 **153** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/ai/assistant-template-setup.controller.ts`（AssistantTemplateSetupRuntimeController） | `assistants/:assistantId/template-setup` | 2 | `:17` |
| `packages/server-ai/src/ai/conversation-artifacts.controller.ts`（ConversationArtifactsController） | `conversations/:conversationId/artifacts` | 1 | `:16` |
| `packages/server-ai/src/ai/voice.controller.ts`（VoiceController） | `threads/:threadId/voice` | 5 | `:12` |
| `packages/server-ai/src/ai/assistant-workspace-files.controller.ts`（AssistantWorkspaceFilesController） | `assistants/:assistantId/workspace` | 8 | `:43` |
| `packages/server-ai/src/ai/workspace-file-access-runtime.controller.ts`（WorkspaceFileAccessRuntimeController） | `workspace-files/view-sessions` | 5 | `:25` |
| `packages/server-ai/src/ai/workbench-files.controller.ts`（WorkbenchFilesController） | `conversations/:conversationId` | 1 | `:29` |
| `packages/server-ai/src/ai/mcp-apps-runtime.controller.ts`（McpAppsRuntimeController） | `mcp-apps` | 7 | `:13` |
| `packages/server-ai/src/ai/sandbox-runtime.controller.ts`（SandboxRuntimeController） | `sandbox/threads/:threadId/services` | 7 | `:30` |
| `packages/server-ai/src/ai/conversation-branch.controller.ts`（ConversationBranchController） | `conversations` | 1 | `:21` |
| `packages/server-ai/src/ai/ai.controller.ts`（AIController） | `-` | 3 | `:24` |
| `packages/server-ai/src/ai/ai-v1.controller.ts`（AIV1Controller） | `v1` | 9 | `:66` |
| `packages/server-ai/src/ai/context.controller.ts`（ContextsController） | `contexts` | 2 | `:55` |
| `packages/server-ai/src/ai/knowledge.controller.ts`（KnowledgesController） | `knowledges` | 6 | `:33` |
| `packages/server-ai/src/ai/assistant.controller.ts`（AssistantsController） | `assistants` | 6 | `:51` |
| `packages/server-ai/src/agent-plugin/runtime-resource.controller.ts`（RuntimeResourceController） | `-` | 6 | `:33` |
| `packages/server-ai/src/ai/connector-runtime.controller.ts`（ConnectorRuntimeController） | `assistants/:assistantId/connectors` | 2 | `:26` |
| `packages/server-ai/src/ai/thread.controller.ts`（ThreadsController） | `threads` | 22 | `:104` |
| `packages/server-ai/src/ai/conversation.controller.ts`（ConversationsController） | `conversations` | 25 | `:125` |
| `packages/server-ai/src/ai/store.controller.ts`（StoreController） | `store` | 5 | `:15` |
| `packages/server-ai/src/ai/groups/group-project.controller.ts`（GroupProjectController） | `groups/:groupId/project` | 2 | `:18` |
| `packages/server-ai/src/ai/groups/group.controller.ts`（GroupsController） | `groups` | 14 | `:31` |
| `packages/server-ai/src/ai/groups/group-composer.controller.ts`（GroupComposerController） | `groups/:groupId/members/:participantId/composer` | 10 | `:22` |
| `packages/server-ai/src/ai/groups/group-workbench.controller.ts`（GroupViewsController） | `groups/:groupId/workbench` | 1 | `:17` |
| `packages/server-ai/src/ai/groups/group-view-files.controller.ts`（GroupViewFilesController） | `groups/:groupId/workbench/workspace-files/view-sessions` | 3 | `:19` |

## 依赖关系

- **依赖**（改它要连带看）：`AssistantBindingModule`、`ChatConversationModule`、`ChatGroupModule`、`ChatMessageFeedbackModule`、`ChatMessageModule`、`ConnectorModule`、`CopilotCheckpointModule`、`CopilotModule`、`CopilotOrganizationModule`、`CopilotUserModule`、`EnvironmentModule`、`FileUnderstandingModule`、`KnowledgeDocumentModule`、`KnowledgebaseModule`、`PromptWorkflowModule`、`RedisModule`、`SandboxModule`、`SecretTokenModule`、`SkillPackageModule`、`SseStreamModule`、`StorageFileModule`、`SuperAdminOrganizationScopeModule`、`TenantModule`、`WorkspaceFileAccessModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`、`XpertToolsetModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，13 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`、`CancelConversationCommand`、`CancelExternalAssistantCommand`、`ChatConversationBindProjectCommand`、`ChatConversationBindXpertCommand`、`ChatConversationDeleteCommand` 等 10 个）
- → `ChatGroupModule`（CQRS：`GetGroupConversationEntryCommand`）
- → `ChatMessageModule`（CQRS：`ChatMessageUpsertCommand`、`RefreshConversationResourceCardsCommand`）
- → `ChatModule`（CQRS：`ChatCommand`）
- → `ConversationBranchModule`（CQRS：`ConversationBranchCommand`）
- → `CopilotCheckpointModule`（CQRS：`CheckpointDeleteCommand`、`CopilotCheckpointGetTupleQuery`）
- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）
- → `CopilotProviderModule`（CQRS：`GetAiProviderCredentialsQuery`）
- → `CopilotUserModule`（CQRS：`CopilotUserUsageQuery`）
- → `FileUnderstandingModule`（CQRS：`DeleteFileAssetCommand`）
- → `FileUploadModule`（CQRS：`UploadFileCommand`）
- → `XpertAgentExecutionModule`（CQRS：`AssertXpertAgentExecutionAccessQuery`、`FindAgentExecutionsQuery`、`GetAgentExecutionRunSummaryQuery`、`GetThreadContextUsageQuery`、`XpertAgentExecutionDelCommand`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`AssistantTemplateSetupCommand`、`GetRuntimeCapabilitiesCommand`、`IsPublishedXpertInFamilyQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AgentInvocationModule`（`RunCreateStreamCommand`）
- ← `AssistantBindingModule`（`RunCreateStreamCommand`、`ThreadCreateCommand`）

## 数据表（8）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_message` | ChatMessage | 7 | @Module imports forFeature | `packages/server-ai/src/ai/thread-activity/thread-activity.service.ts:30` |
| `chat_conversation` | ChatConversation | 6 | @Module imports forFeature | `packages/server-ai/src/ai/workbench-files-auth.guard.ts:15` |
| `xpert_agent_execution` | XpertAgentExecution | 6 | @Module imports forFeature | `packages/server-ai/src/ai/thread-activity/thread-activity.service.ts:24` |
| `realtime_voice_task` | RealtimeVoiceTask | 5 | @Module imports forFeature | `packages/server-ai/src/realtime-voice/voice-task.service.ts:74` |
| `chat_conversation_thread` | ChatConversationThread | 3 | @Module imports forFeature | `packages/server-ai/src/ai/assistant-thread-scope.guard.ts:21` |
| `realtime_voice_session` | RealtimeVoiceSession | 3 | @Module imports forFeature | `packages/server-ai/src/realtime-voice/voice-session.service.ts:40` |
| `realtime_voice_turn` | RealtimeVoiceTurn | 3 | @Module imports forFeature | `packages/server-ai/src/realtime-voice/voice-session.service.ts:41` |
| `chat_group_participant` | GroupParticipant | 1 | getRepository | `packages/server-ai/src/ai/groups/group-workbench.guard.ts:23` |

## 非 HTTP 入口

- **CQRS Handler**（5）：`RunCreateStreamCommand`、`ThreadCreateCommand`、`ThreadDeleteCommand`、`SearchThreadsQuery`、`FindThreadQuery`

## 守卫/权限

`ApiKeyOrClientSecretAuthGuard`、`WorkbenchFilesAuthGuard`、`AssistantThreadScopeGuard`、`KnowledgebaseOwnerGuard`、`AssistantFileAccessGuard`、`GroupScopeGuard`、`GroupWorkbenchGuard`

## 归属文件（70）

- `packages/server-ai/src/ai/mcp-apps-runtime.controller.ts`
- `packages/server-ai/src/ai/workbench-files.controller.ts`
- `packages/server-ai/src/ai/conversation.controller.ts`
- `packages/server-ai/src/ai/assistant-audience.ts`
- `packages/server-ai/src/ai/agent-run-summary.ts`
- `packages/server-ai/src/ai/assistant.controller.ts`
- `packages/server-ai/src/ai/voice.controller.ts`
- `packages/server-ai/src/ai/connector-runtime.controller.ts`
- `packages/server-ai/src/ai/external-upload-target.ts`
- `packages/server-ai/src/ai/conversation-agent-runs.service.ts`
- `packages/server-ai/src/ai/workbench-files-auth.guard.ts`
- `packages/server-ai/src/ai/assistant-file-access.guard.ts`
- `packages/server-ai/src/ai/ai-v1.controller.ts`
- `packages/server-ai/src/ai/conversation-artifacts.controller.ts`
- `packages/server-ai/src/ai/workspace-file-access-runtime.controller.ts`
- `packages/server-ai/src/ai/store.controller.ts`
- `packages/server-ai/src/ai/chatkit-session.schema.ts`
- `packages/server-ai/src/ai/workbench-principal.ts`
- `packages/server-ai/src/ai/index.ts`
- `packages/server-ai/src/ai/assistant-workspace-files.controller.ts`
- `packages/server-ai/src/ai/assistant-thread-scope.guard.ts`
- `packages/server-ai/src/ai/assistant-workspace-files.schema.ts`
- `packages/server-ai/src/ai/workbench-file-download.ts`
- `packages/server-ai/src/ai/assistant-request-context.ts`
- `packages/server-ai/src/ai/api-chat-source.ts`
- `packages/server-ai/src/ai/thread.controller.ts`
- `packages/server-ai/src/ai/ai.module.ts`
- `packages/server-ai/src/ai/sandbox-runtime.controller.ts`
- `packages/server-ai/src/ai/conversation-branch.controller.ts`
- `packages/server-ai/src/ai/assistant-template-setup.controller.ts`
- `packages/server-ai/src/ai/ai.controller.ts`
- `packages/server-ai/src/ai/project-selection.ts`
- `packages/server-ai/src/ai/ai.service.ts`
- `packages/server-ai/src/ai/public-xpert-principal.ts`
- `packages/server-ai/src/ai/context.controller.ts`
- `packages/server-ai/src/ai/knowledge.controller.ts`
- `packages/server-ai/src/ai/commands/index.ts`
- `packages/server-ai/src/ai/commands/thread-create.command.ts`
- `packages/server-ai/src/ai/commands/thread-delete.command.ts`
- `packages/server-ai/src/ai/commands/run-create-stream.command.ts`
- ……其余 30 个见 JSON 输出（完整清单）
