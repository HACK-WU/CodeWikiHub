# ServerAIModule（`server-ai`）

- **位置**：`packages/server-ai/src/` · 归属文件 **85** 个 · 约 **10196** 行
- **定义**：`packages/server-ai/src/app.module.ts:72`（nestjs）
- **挂载前缀**：`/api/mcp-consumer`、`/api/mcp-consumer/oauth` · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/mcp-consumer/mcp-consumer-capabilities.controller.ts` | `mcp-consumer` | 1 | `:7` |
| `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.controller.ts` | `mcp-consumer/oauth` | 4 | `:24` |

## 依赖关系

- **依赖**（改它要连带看）：`AIModule`、`ActorTokenRuntimeModule`、`AgentEvolutionModule`、`AgentMiddlewareRuntimeModule`、`AgentPluginModule`、`ArtifactsModule`、`AssistantBindingModule`、`ChatConversationModule`、`ChatMessageFeedbackModule`、`ChatMessageModule`、`ChatModule`、`CollaborationModule`、`ConnectorModule`、`ConversationBranchModule`、`ConversationMapModule`、`CopilotCheckpointModule`、`CopilotKnowledgeModule`、`CopilotModelModule`、`CopilotModule`、`CopilotOrganizationModule`、`CopilotProviderModule`、`CopilotStoreModule`、`CopilotUsageModule`、`CopilotUserModule`、`DesktopShellModule`、`EnterpriseChatkitModule`、`EnvironmentModule`、`FileMemoryModule`、`FileUnderstandingModule`、`FileUploadTargetsModule`、`GraphragModule`、`HandoffQueueModule`、`InitializationModule`、`KnowledgeDocumentModule`、`KnowledgeWikiModule`、`KnowledgebaseModule`、`McpPublicationModule`、`MembershipModule`、`MetricsModule`、`MobileModule`、`ModelAccessModule`、`ModelExecutionModule`、`ModelGatewayModule`、`PluginResourceModule`、`PromptWorkflowModule`、`RagVStoreModule`、`RagWebModule`、`SandboxModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`UserModule`、`VolumeModule`、`WorkspaceFileAccessModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertMarketplaceModule`、`XpertMiddlewareModule`、`XpertModule`、`XpertProjectModule`、`XpertTableModule`、`XpertTaskModule`、`XpertTemplateModule`、`XpertToolModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`ApiWorkerBootstrapModule`、`BootstrapModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，5 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）
- → `CopilotUserModule`（CQRS：`CopilotModelUsageRecordCommand`）
- → `HandoffQueueModule`（CQRS：`StopHandoffMessageCommand`）
- → `XpertAgentExecutionModule`（CQRS：`AssertXpertAgentExecutionAccessQuery`、`XpertAgentExecutionRecordUsageCommand`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`ResolveAssistantFileAccessCommand`）

## 数据表（14）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_agent_execution` | XpertAgentExecution | 6 | @InjectRepository | `packages/server-ai/src/realtime-voice/voice-task.service.ts:78` |
| `chat_message` | ChatMessage | 5 | getRepository | `packages/server-ai/src/realtime-voice/voice-call-history.ts:49` |
| `xpert_toolset` | XpertToolset | 4 | @InjectRepository | `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts:53` |
| `realtime_voice_task` | RealtimeVoiceTask | 4 | @InjectRepository | `packages/server-ai/src/realtime-voice/voice-task.service.ts:74` |
| `realtime_voice_session` | RealtimeVoiceSession | 3 | @InjectRepository | `packages/server-ai/src/realtime-voice/voice-session.service.ts:40` |
| `mcp_app_audit` | McpAppAudit | 2 | @InjectRepository | `packages/server-ai/src/mcp-app-runtime/mcp-app-audit.service.ts:40` |
| `mcp_app_history` | McpAppHistory | 2 | @InjectRepository | `packages/server-ai/src/mcp-app-runtime/mcp-app-history-store.service.ts:17` |
| `xpert_mcp_consumer_oauth_credential` | McpConsumerOAuthCredential | 2 | @InjectRepository | `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts:49` |
| `xpert_mcp_consumer_oauth_session` | McpConsumerOAuthSession | 2 | @InjectRepository | `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts:51` |
| `realtime_voice_turn` | RealtimeVoiceTurn | 2 | @InjectRepository | `packages/server-ai/src/realtime-voice/voice-session.service.ts:41` |
| `shell_process_execution` | ShellProcessExecution | 2 | @InjectRepository | `packages/server-ai/src/shell-execution/shell-execution-source.service.ts:22` |
| `shell_cli_execution` | ShellCliExecution | 2 | @InjectRepository | `packages/server-ai/src/shell-execution/shell-execution-source.service.ts:23` |
| `mcp_capability_catalog` | McpCapabilityCatalog | 2 | @InjectRepository | `packages/server-ai/src/tool-runtime/tool-runtime.service.ts:145` |
| `chat_conversation` | ChatConversation | 2 | @InjectRepository | `packages/server-ai/src/view-extension/hosts/agent-view-host.definition.ts:71` |

## 守卫/权限

`WorkspaceGuard`、`WorkspaceOwnerGuard`

## 归属文件（85）

- `packages/server-ai/src/app.module.ts`
- `packages/server-ai/src/index.ts`
- `packages/server-ai/src/core/features.ts`
- `packages/server-ai/src/core/errors.ts`
- `packages/server-ai/src/core/utils.ts`
- `packages/server-ai/src/core/index.ts`
- `packages/server-ai/src/core/default-role-permissions.ts`
- `packages/server-ai/src/core/entities/index.ts`
- `packages/server-ai/src/core/entities/internal.ts`
- `packages/server-ai/src/core/entities/base.entity.ts`
- `packages/server-ai/src/core/entities/subscribers.ts`
- `packages/server-ai/src/core/events/index.ts`
- `packages/server-ai/src/core/events/handlers/index.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-history-component.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-history.schema.ts`
- `packages/server-ai/src/mcp-app-runtime/middleware-app-source.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-history.service.ts`
- `packages/server-ai/src/mcp-app-runtime/index.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-audit.service.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-audit.entity.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-history-store.service.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-refresh.ts`
- `packages/server-ai/src/mcp-app-runtime/middleware-mcp-apps.service.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-instance-store.service.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-audience.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-history.entity.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-tool-approval.service.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-execution-context.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-session.ts`
- `packages/server-ai/src/mcp-app-runtime/mcp-app-request.ts`
- `packages/server-ai/src/mcp-consumer/index.ts`
- `packages/server-ai/src/mcp-consumer/mcp-consumer.ts`
- `packages/server-ai/src/mcp-consumer/mcp-consumer-capabilities.controller.ts`
- `packages/server-ai/src/mcp-consumer/mcp-consumer-capabilities.service.ts`
- `packages/server-ai/src/mcp-consumer/apps/mcp-consumer-apps.ts`
- `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts`
- `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth-result-page.ts`
- `packages/server-ai/src/mcp-consumer/auth/index.ts`
- `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-auth.registry.ts`
- `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth-credential.entity.ts`
- ……其余 45 个见 JSON 输出（完整清单）
