# EnterpriseChatkitModule（`enterprise-chatkit`）

- **位置**：`packages/server-ai/src/xpert/` · 归属文件 **156** 个 · 约 **23001** 行
- **定义**：`packages/server-ai/src/xpert/enterprise-chatkit.module.ts:6`（nestjs）
- **挂载前缀**：`/api/:assistantId/template-setup`、`/api/:id/template-lifecycle`、`/api/:id/trigger-connections` 等 7 个 · 视图/接口入口 **118** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert/enterprise-chatkit.controller.ts`（EnterpriseChatkitController） | `xpert` | 2 | `:9` |
| `packages/server-ai/src/xpert/xpert-tag-usage.controller.ts` | `tag-usage` | 1 | `:9` |
| `packages/server-ai/src/xpert/trigger-connection.controller.ts` | `:id/trigger-connections` | 6 | `:7` |
| `packages/server-ai/src/xpert/xpert.controller.ts` | `-` | 85 | `:156` |
| `packages/server-ai/src/xpert/xpert-access.controller.ts` | `accessible` | 1 | `:10` |
| `packages/server-ai/src/xpert/xpert-profile.controller.ts` | `-` | 1 | `:11` |
| `packages/server-ai/src/xpert/assistant-appearance/assistant-appearance.controller.ts` | `-` | 2 | `:8` |
| `packages/server-ai/src/xpert/configuration/assistant-trigger.controller.ts` | `:id/trigger-settings` | 3 | `:5` |
| `packages/server-ai/src/xpert/configuration/assistant-configuration.controller.ts` | `-` | 4 | `:14` |
| `packages/server-ai/src/xpert/template-lifecycle/template-lifecycle.controller.ts` | `:id/template-lifecycle` | 8 | `:19` |
| `packages/server-ai/src/xpert/template-setup/template-setup.controller.ts` | `:assistantId/template-setup` | 5 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`AccountBindingModule`、`IntegrationModule`、`SecretTokenModule`
- **被依赖**（动它会影响）：`ServerAIModule`

## 事件/命令耦合（不经 imports，14 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`CancelSummaryJobCommand`、`ChatConversationDeleteCommand`、`ChatConversationLogsQuery`、`ChatConversationUpsertCommand`、`FindChatConversationQuery`、`GetChatConversationQuery` 等 14 个）
- → `ChatMessageFeedbackModule`（CQRS：`FindMessageFeedbackQuery`）
- → `ChatMessageModule`（CQRS：`ChatMessageUpsertCommand`）
- → `ConnectorModule`（CQRS：`ResolveTemplateConnectorsCommand`）
- → `CopilotCheckpointModule`（CQRS：`CopilotCheckpointGetTupleQuery`）
- → `CopilotModule`（CQRS：`CopilotGetOneQuery`、`CopilotOneByRoleQuery`、`FindCopilotModelsQuery`）
- → `CopilotStoreModule`（CQRS：`CopilotStoreBulkPutCommand`）
- → `FileUnderstandingModule`（CQRS：`AssertFileUploadScopeQuery`、`AttachFileToConversationCommand`）
- → `IntegrationModule`（CQRS：`IntegrationDelCommand`、`IntegrationUpsertCommand`）
- → `PluginResourceModule`（CQRS：`InstallAssistantDefinitionDependenciesCommand`、`PluginTemplateSyncDependenciesCommand`、`PrepareAssistantDefinitionCommand`、`ReconcileTemplateSkillReferencesCommand`）
- → `XpertAgentExecutionModule`（CQRS：`FindExecutionsByXpertQuery`、`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- → `XpertAgentModule`（CQRS：`XpertAgentVariablesQuery`）
- → `XpertTaskModule`（CQRS：`TemplateActivityCommand`、`TemplateRoutinesCommand`）
- → `XpertWorkspaceModule`（CQRS：`MyXpertWorkspaceQuery`）

## 数据表（10）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert` | Xpert | 22 | @InjectRepository | `packages/server-ai/src/xpert/xpert-frequent-questions.service.ts:43` |
| `chat_conversation` | ChatConversation | 9 | @InjectRepository | `packages/server-ai/src/xpert/xpert-frequent-questions.service.ts:45` |
| `assistant_template_upgrade` | TemplateUpgradeEntity | 9 | getRepository | `packages/server-ai/src/xpert/template-lifecycle/template-upgrade.service.ts:49` |
| `xpert_assistant_user_preference` | AssistantUserPreference | 3 | @InjectRepository | `packages/server-ai/src/xpert/assistant-user-preference.service.ts:25` |
| `assistant_template_publication` | TemplatePublicationEntity | 3 | getRepository | `packages/server-ai/src/xpert/template-lifecycle/template-publication.service.ts:19` |
| `chat_message` | ChatMessage | 2 | @InjectRepository | `packages/server-ai/src/xpert/xpert-frequent-questions.service.ts:47` |
| `xpert_frequent_question_cache` | XpertFrequentQuestionCache | 2 | @InjectRepository | `packages/server-ai/src/xpert/xpert-frequent-questions.service.ts:49` |
| `business_area` | BusinessArea | 2 | @InjectRepository | `packages/server-ai/src/xpert/commands/handlers/publish.handler.ts:48` |
| `tag` | Tag | 1 | getRepository | `packages/server-ai/src/xpert/xpert.service.ts:156` |
| `integration` | Integration | 1 | getRepository | `packages/server-ai/src/xpert/queries/handlers/statistics-xpert-integrations.handler.ts:16` |

## 非 HTTP 入口

- **CQRS Handler**（34）：`InitializeAssistantTemplateFilesCommand`、`ResolveAssistantFileAccessCommand`、`XpertPublishTriggersCommand`、`XpertExportCommand`、`XpertChatCommand`、`XpertDelIntegrationCommand` 等 34

## 守卫/权限

`TenantPermissionGuard`、`XpertGuard`、`PermissionGuard`、`WorkspaceAuthoringGuard`、`AnonymousXpertAuthGuard`

## 归属文件（156）

- `packages/server-ai/src/xpert/xpert-frequent-questions.service.ts`
- `packages/server-ai/src/xpert/trigger-connection.service.ts`
- `packages/server-ai/src/xpert/assistant-user-preference.service.ts`
- `packages/server-ai/src/xpert/template-source.ts`
- `packages/server-ai/src/xpert/xpert.entity.ts`
- `packages/server-ai/src/xpert/xpert-family.ts`
- `packages/server-ai/src/xpert/xpert-tag-usage.controller.ts`
- `packages/server-ai/src/xpert/xpert-profile-indicators.service.ts`
- `packages/server-ai/src/xpert/enterprise-chatkit.module.ts`
- `packages/server-ai/src/xpert/xpert-frequent-question-cache.entity.ts`
- `packages/server-ai/src/xpert/assistant-user-preference.entity.ts`
- `packages/server-ai/src/xpert/conversation-mutation-access.ts`
- `packages/server-ai/src/xpert/utils.ts`
- `packages/server-ai/src/xpert/trigger-connection.graph.ts`
- `packages/server-ai/src/xpert/external-assistant-binding.ts`
- `packages/server-ai/src/xpert/index.ts`
- `packages/server-ai/src/xpert/trigger-connection.controller.ts`
- `packages/server-ai/src/xpert/workspace-file-download.ts`
- `packages/server-ai/src/xpert/xpert-workspace-files.service.ts`
- `packages/server-ai/src/xpert/import-draft.utils.ts`
- `packages/server-ai/src/xpert/xpert.controller.ts`
- `packages/server-ai/src/xpert/template-workspace-initializer.service.ts`
- `packages/server-ai/src/xpert/template-import-recovery.ts`
- `packages/server-ai/src/xpert/enterprise-chatkit.controller.ts`
- `packages/server-ai/src/xpert/xpert-profile-identity.service.ts`
- `packages/server-ai/src/xpert/model-access-validator.ts`
- `packages/server-ai/src/xpert/xpert-access.controller.ts`
- `packages/server-ai/src/xpert/types.ts`
- `packages/server-ai/src/xpert/copilot-model-sync.util.ts`
- `packages/server-ai/src/xpert/xpert-principal.service.ts`
- `packages/server-ai/src/xpert/assistant-model-selection.util.ts`
- `packages/server-ai/src/xpert/enterprise-chatkit-session.service.ts`
- `packages/server-ai/src/xpert/xpert-profile.controller.ts`
- `packages/server-ai/src/xpert/marketplace-profile.parser.ts`
- `packages/server-ai/src/xpert/assistant-model-selection.service.ts`
- `packages/server-ai/src/xpert/published-xpert-access.service.ts`
- `packages/server-ai/src/xpert/xpert.module.ts`
- `packages/server-ai/src/xpert/assistant-execution-model.ts`
- `packages/server-ai/src/xpert/xpert.service.ts`
- `packages/server-ai/src/xpert/xpert.subscriber.ts`
- ……其余 116 个见 JSON 输出（完整清单）
