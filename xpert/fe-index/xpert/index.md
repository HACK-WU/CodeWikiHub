# xpert 后端模块索引

> 根目录：`/root/xpert` · 框架：**nestjs** · 全局前缀：`/api`
> 生成：2026-10-16 · commit：`80f5676fd7` · 范围：`.` · 扫描器：scan_backend.py v2.0.0
> 新鲜度校验：`python3 scan_backend.py --root /root/xpert --check --index <本目录>`

**这个索引回答什么**：改某个模块要连带看谁（依赖/被依赖）、改某张表要通知哪些模块、某模块的数据面与非 HTTP 入口、模块的代码在哪。**接口级契约**见 `.module-experts/` 专家资产与 ki 接口信息（`tags=api`）——本索引不重复建设。

## 1. 模块地图（145）

| 模块 | 目录 | 挂载前缀 | 接口 | 表 | 依赖 | 被依赖 | 非 HTTP 入口 | 专家资产 |
|------|------|----------|------|----|------|--------|--------------|----------|
| [AIModule](modules/ai.md) `ai` | `packages/server-ai/src/ai` | `/api/assistants`、`/api/assistants/:assistantId/connectors`、`/api/assistants/:assistantId/template-setup` 等 21 个 | 153 | 8 | AssistantBindingModule、ChatConversationModule、ChatGroupModule 等 29 | ServerAIModule | CQRS 5 · 事件边 13 | Assistant 定义与运行时专家 |
| [EnterpriseChatkitModule](modules/enterprise-chatkit.md) `enterprise-chatkit` | `packages/server-ai/src/xpert` | `/api/:assistantId/template-setup`、`/api/:id/template-lifecycle`、`/api/:id/trigger-connections` 等 7 个 | 118 | 10 | AccountBindingModule、IntegrationModule、SecretTokenModule | ServerAIModule | CQRS 34 · 事件边 14 | Assistant 定义与运行时专家 |
| [XpertModule](modules/xpert.md) `xpert` | `packages/server-ai/src/xpert` | `/api/:assistantId/template-setup`、`/api/:id/template-lifecycle`、`/api/:id/trigger-connections` 等 7 个 | 118 | 10 | AgentMiddlewareRuntimeModule、AssistantBindingModule、ChatConversationModule 等 26 | AIModule、AssistantBindingModule、ChatGroupModule 等 17 | CQRS 35 · 事件边 14 | Assistant 定义与运行时专家 |
| [XpertProjectModule](modules/xpert-project.md) `xpert-project` | `packages/server-ai/src/xpert-project` | `/api/invitations` | 83 | 36 | AgentInvocationModule、ConnectorModule、EmailModule 等 15 | AIModule、ChatGroupModule、ChatModule 等 8 | CQRS 10 · 任务 3 · 事件边 6 | 项目与任务协作专家 |
| [XpertProjectAccessModule](modules/xpert-project-access.md) `xpert-project-access` | `packages/server-ai/src/xpert-project` | `/api/invitations` | 83 | 35 | - | ChatConversationModule、ConversationMapModule、FileUnderstandingModule 等 5 | CQRS 10 · 任务 3 · 事件边 6 | - |
| [AgentEvolutionModule](modules/agent-evolution.md) `agent-evolution` | `packages/server-ai/src/agent-evolution` | `/api/baselines`、`/api/changes` | 48 | 19 | - | ServerAIModule | 事件边 2 | Agent 演进专家 |
| [KnowledgebaseModule](modules/knowledgebase.md) `knowledgebase` | `packages/server-ai/src/knowledgebase` | `/api/:knowledgebaseId`、`/api/:knowledgebaseId/faqs` | 43 | 13 | CopilotModule、DatabaseModule、IntegrationModule 等 9 | AIModule、ChatModule、GraphragModule 等 9 | MQ 2 · CQRS 28 · 事件边 10 | 知识库专家 |
| [KnowledgeDocumentModule](modules/knowledge-document.md) `knowledge-document` | `packages/server-ai/src/knowledge-document` | `/api` + 方法路径 `count`、`pagination`、`my` 等 6 个 | 41 | 8 | CopilotModelModule、CopilotModule、IntegrationModule 等 9 | AIModule、GraphragModule、KnowledgeWikiModule 等 5 | MQ 3 · CQRS 3 · 事件边 6 | 知识库专家 |
| [KnowledgeProcessingLifecycleModule](modules/knowledge-processing-lifecycle.md) `knowledge-processing-lifecycle` | `packages/server-ai/src/knowledge-document` | `/api` + 方法路径 `count`、`pagination`、`my` 等 6 个 | 41 | 4 | - | KnowledgeDocumentModule | MQ 3 · CQRS 3 · 事件边 6 | 知识库专家 |
| [XpertTaskModule](modules/xpert-task.md) `xpert-task` | `packages/server-ai/src/xpert-task` | `/api` + 方法路径 `count`、`pagination`、`my` 等 5 个 | 35 | 9 | ActorTokenModule、ConnectorModule、RedisModule 等 7 | ServerAIModule | MQ 1 · CQRS 5 · 任务 2 · 事件边 3 | 项目与任务协作专家 |
| [XpertToolsetModule](modules/xpert-toolset.md) `xpert-toolset` | `packages/server-ai/src/xpert-toolset` | `/api/mcp-apps`、`/api/mcp-consumer`、`/api/mcp-consumer/oauth` 等 4 个 | 33 | 9 | ChatMessageModule、CopilotModule、RedisModule 等 6 | AIModule、ChatModule、McpPublicationModule 等 7 | CQRS 12 · 事件边 2 | 工具与 MCP 专家 （批次 5）|
| [PluginModule](modules/plugin.md) `plugin` | `packages/server/src/plugin` | `/api/plugin`、`/api/plugin/marketplace`、`/api/system/setup/plugins` | 30 | 4 | ConfigModule、RedisModule、RuntimeControlModule | MigrationRootModule、RootModule | CQRS 4 · 事件边 2 | 平台插件与技能专家 |
| [MembershipModule](modules/membership.md) `membership` | `packages/server-ai/src/membership` | `/api` + 方法路径 `me`、`scope`、`plans` 等 4 个 | 29 | 11 | RedisModule、TenantModule | CopilotModule、CopilotUsageModule、InitializationModule 等 6 | MQ 1 · 任务 1 | 模型访问与计费专家 |
| [McpPublicationModule](modules/mcp-publication.md) `mcp-publication` | `packages/server-ai/src/mcp-publication` | `/api/.well-known/oauth-protected-resource`、`/api/mcp/p` | 26 | 10 | RedisModule、WorkspaceFilesRuntimeModule、XpertToolsetModule | PluginResourceModule、ServerAIModule | - | 工具与 MCP 专家 （批次 5）|
| [ChatConversationModule](modules/chat-conversation.md) `chat-conversation` | `packages/server-ai/src/chat-conversation` | `/api` + 方法路径 `my`、`:id`、`unread` 等 5 个 | 25 | 12 | ArtifactsModule、ChatMessageModule、ExecutionCancelModule 等 10 | AIModule、ChatGroupModule、ChatMessageFeedbackModule 等 11 | MQ 1 · CQRS 25 · 事件边 8 | 对话与会话专家 |
| [ConnectorModule](modules/connector.md) `connector` | `packages/server-ai/src/connector` | `/api` + 方法路径 `integration-options`、`bindings`、`provider-options` 等 6 个 | 25 | 5 | IntegrationModule、RuntimeCapabilityModule、TenantModule 等 5 | AIModule、AgentMiddlewareRuntimeModule、AgentPluginModule 等 7 | CQRS 1 · 事件边 1 | - |
| [ArtifactsModule](modules/artifacts.md) `artifacts` | `packages/server-ai/src/artifacts` | `/api/artifacts/share` | 24 | 4 | RuntimeCapabilityModule、UserModule、UserOrganizationModule 等 5 | AgentInvocationModule、AgentMiddlewareRuntimeModule、ChatConversationModule 等 4 | - | 运行时·沙箱·产物专家 |
| [CopilotModule](modules/copilot.md) `copilot` | `packages/server-ai/src/copilot` | `/api` + 方法路径 `primary`、`availables`、`model-select-options` 等 5 个 | 24 | 1 | AIModelModule、CopilotProviderModule、MembershipModule 等 6 | AIModule、AgentMiddlewareRuntimeModule、ChatModule 等 9 | CQRS 6 · 事件边 2 | 模型访问与计费专家 |
| [SandboxModule](modules/sandbox.md) `sandbox` | `packages/server-ai/src/sandbox` | `/api` + 方法路径 `volume`、`file`、`terminal` 等 5 个 | 23 | 4 | SuperAdminOrganizationScopeModule、TenantModule、VolumeModule 等 5 | AIModule、PluginResourceModule、ServerAIModule 等 4 | CQRS 10 · 任务 1 · 事件边 5 | 运行时·沙箱·产物专家 |
| [AgentPluginModule](modules/agent-plugin.md) `agent-plugin` | `packages/server-ai/src/agent-plugin` | `/api/agent-plugins` | 22 | 5 | ConnectorModule、PluginResourceModule | ChatGroupModule、ServerAIModule | CQRS 9 · 事件边 1 | 工具与 MCP 专家 （批次 5）|
| [PluginResourceModule](modules/plugin-resource.md) `plugin-resource` | `packages/server-ai/src/plugin-resource` | `/api/plugin-applications`、`/api/plugin/:name/resources`、`/api/xpert-template-installations` | 19 | 11 | CopilotModule、EnvironmentModule、KnowledgebaseModule 等 12 | AgentPluginModule、ServerAIModule | CQRS 9 · 事件边 2 | 平台插件与技能专家 |
| [GraphragModule](modules/graphrag.md) `graphrag` | `packages/server-ai/src/graphrag` | `/api/:id/graph` | 18 | 13 | KnowledgeDocumentModule、KnowledgeIdentityModule、KnowledgebaseModule 等 4 | ServerAIModule | MQ 1 · CQRS 7 | 知识库专家 |
| [KnowledgeWikiModule](modules/knowledge-wiki.md) `knowledge-wiki` | `packages/server-ai/src/knowledgebase/wiki` | `/api/:knowledgebaseId/wiki` | 18 | 18 | AgentMiddlewareRuntimeModule、KnowledgeDocumentModule、KnowledgeIdentityModule 等 5 | ServerAIModule | MQ 1 · CQRS 2 · 任务 1 · 事件边 1 | 知识库专家 |
| [SocialAuthModule](modules/social-auth.md) `social-auth` | `packages/auth/src` | `/api/auth0`、`/api/dingtalk`、`/api/facebook` 等 8 个 | 18 | 0 | ConfigModule | AuthModule | - | - |
| [AuthModule](modules/auth.md) `auth` | `packages/server/src/auth` | `/api/sso` | 17 | 9 | AccountBindingModule、EmailModule、OrganizationModule 等 10 | EmployeeModule、InviteModule、ServerAppModule | CQRS 3 · 事件边 2 | 身份与权限专家 |
| [ModelGatewayModule](modules/model-gateway.md) `model-gateway` | `packages/server-ai/src/model-gateway` | `/api/model-gateway`、`/api/openai/v1` | 17 | 7 | AgentMiddlewareRuntimeModule、MembershipModule、ModelAccessModule | InitializationModule、ServerAIModule | 任务 5 | 模型访问与计费专家 |
| [AssistantBindingModule](modules/assistant-binding.md) `assistant-binding` | `packages/server-ai/src/assistant-binding` | `/api/bosi` | 16 | 5 | ConnectorModule、SharedModule、TenantModule 等 6 | AIModule、InitializationModule、MobileModule 等 5 | 事件边 3 | Assistant 定义与运行时专家 |
| [DataSourceModule](modules/data-source.md) `data-source` | `packages/server/src/data-source` | `/api` + 方法路径 `sql-select-options`、`sql-schema-select-options`、`:id` 等 4 个 | 16 | 2 | DataSourceTypeModule、SharedModule、TenantModule 等 4 | ServerAppModule、XpertTableModule | CQRS 8 | 平台底座与集成专家 |
| [SkillPackageModule](modules/skill-package.md) `skill-package` | `packages/server-ai/src/skill-package` | `/api/skill-package` | 16 | 2 | SkillRepositoryIndexModule、SkillRepositoryModule、TenantModule 等 5 | AIModule、InitializationModule、PluginResourceModule 等 8 | CQRS 5 · 事件边 1 | 平台插件与技能专家 |
| [UserModule](modules/user.md) `user` | `packages/server/src/user` | `/api` + 方法路径 `me`、`email`、`preferred-language` 等 5 个 | 16 | 4 | FactoryResetModule、RoleModule、TenantModule 等 4 | ApiKeyModule、ArtifactsModule、AuthModule 等 36 | CQRS 4 · 事件边 1 | 身份与权限专家 |
| [XpertWorkspaceModule](modules/xpert-workspace.md) `xpert-workspace` | `packages/server-ai/src/xpert-workspace` | `/api` + 方法路径 `my`、`count`、`pagination` 等 4 个 | 16 | 3 | TenantModule、UserOrganizationModule | ArtifactsModule、AssistantBindingModule、ChatGroupModule 等 16 | CQRS 3 · 事件边 1 | Assistant 定义与运行时专家 |
| [XpertTemplateModule](modules/xpert-template.md) `xpert-template` | `packages/server-ai/src/xpert-template` | `/api` + 方法路径 `catalog`、`catalog-avatar`、`mcps` 等 5 个 | 13 | 4 | SkillPackageModule、SkillRepositoryIndexModule、SkillRepositoryModule 等 5 | AssistantBindingModule、InitializationModule、PluginResourceModule 等 7 | CQRS 2 · 事件边 2 | Assistant 定义与运行时专家 |
| [CopilotUsageModule](modules/copilot-usage.md) `copilot-usage` | `packages/server-ai/src/copilot-usage` | `/api` + 方法路径 `ledger`、`summary`、`totals` 等 5 个 | 12 | 5 | MembershipModule、TenantModule | AgentMiddlewareRuntimeModule、CopilotUserModule、ServerAIModule 等 5 | - | 模型访问与计费专家 |
| [ModelAccessModule](modules/model-access.md) `model-access` | `packages/server-ai/src/model-access` | `/api` + 方法路径 `catalog`、`requests`、`grants` 等 4 个 | 12 | 9 | AIModelModule、MembershipModule、RedisModule | CopilotModule、CopilotProviderModule、CopilotUserModule 等 8 | 任务 1 | 模型访问与计费专家 |
| [ModelExecutionModule](modules/model-execution.md) `model-execution` | `packages/server-ai/src/model-execution` | `/api/model-execution`、`/api/model-execution/admin`、`/api/model-execution/openai/v1` | 12 | 14 | AgentMiddlewareRuntimeModule、ModelAccessModule、XpertModule | ServerAIModule | 任务 2 · 事件边 3 | 模型访问与计费专家 |
| [CopilotProviderModule](modules/copilot-provider.md) `copilot-provider` | `packages/server-ai/src/copilot-provider` | `/api/:providerId/model-discovery` | 11 | 2 | AIModelModule、ModelAccessModule、TenantModule 等 4 | CopilotModule、ServerAIModule | CQRS 4 · 事件边 1 | 模型访问与计费专家 |
| [IntegrationModule](modules/integration.md) `integration` | `packages/server/src/integration` | `/api/qr` | 11 | 1 | RedisModule、TenantModule、UserModule | ApiKeyModule、ConnectorModule、EnterpriseChatkitModule 等 9 | CQRS 4 · 事件边 1 | 平台底座与集成专家 |
| [InviteModule](modules/invite.md) `invite` | `packages/server/src/invite` | `/api` + 方法路径 `emails`、`validate`、`employee` 等 5 个 | 10 | 5 | AuthModule、EmailModule、OrganizationContactModule 等 10 | ServerAppModule | CQRS 6 · 事件边 2 | 身份与权限专家 |
| [OrganizationModule](modules/organization.md) `organization` | `packages/server/src/organization` | `/api` + 方法路径 `count`、`pagination`、`:id` 等 4 个 | 10 | 4 | RoleModule、RolePermissionModule、TenantModule 等 5 | AuthModule、InitializationModule、InviteModule 等 9 | CQRS 2 · 事件边 1 | 身份与权限专家 |
| [DesktopShellModule](modules/desktop-shell.md) `desktop-shell` | `packages/server-ai/src/desktop-shell` | `/api` + 方法路径 `devices`、`grants`、`operations` | 9 | 4 | RedisModule、TenantModule | ServerAIModule | 事件边 1 | 平台底座与集成专家 |
| [EmailTemplateModule](modules/email-template.md) `email-template` | `packages/server/src/email-template` | `/api` + 方法路径 `count`、`pagination`、`template` 等 4 个 | 9 | 1 | TenantModule | EmailModule、ServerAppModule | CQRS 5 | 租户与平台设置专家 |
| [TenantModule](modules/tenant.md) `tenant` | `packages/server/src/tenant` | `/api` + 方法路径 `count`、`pagination`、`onboard` 等 4 个 | 9 | 4 | FeatureModule、RoleModule、RolePermissionModule 等 4 | AIModule、ApiKeyModule、AssistantBindingModule 等 58 | CQRS 4 · 事件边 6 | 租户与平台设置专家 |
| [AgentInvocationModule](modules/agent-invocation.md) `agent-invocation` | `packages/server-ai/src/agent-invocation` | `/api/agent-invocations`、`/api/agent-runtime-bindings` | 8 | 15 | ArtifactsModule | XpertAgentModule、XpertProjectModule | CQRS 5 · 任务 6 · 事件边 5 | Agent 执行链专家 |
| [FileUnderstandingModule](modules/file-understanding.md) `file-understanding` | `packages/server-ai/src/file-understanding` | `/api` + 方法路径 `files`、`conversations` | 8 | 7 | ChatConversationModule、FileRuntimeModule、RagVStoreModule 等 9 | AIModule、ConversationBranchModule、ServerAIModule | CQRS 25 | 文件理解与记忆专家 |
| [SkillRepositoryModule](modules/skill-repository.md) `skill-repository` | `packages/server-ai/src/skill-repository` | `/api/skill-repository` | 8 | 2 | SkillPackageModule、TenantModule | InitializationModule、ServerAIModule、SkillPackageModule 等 6 | MQ 1 | 平台插件与技能专家 |
| [TagModule](modules/tag.md) `tag` | `packages/server/src/tags` | `/api` + 方法路径 `directory`、`:id`、`categories` | 8 | 1 | TenantModule、UserModule | ServerAppModule | - | - |
| [PromptWorkflowModule](modules/prompt-workflow.md) `prompt-workflow` | `packages/server-ai/src/prompt-workflow` | `/api/prompt-workflow` | 7 | 2 | TenantModule、XpertAgentModule、XpertWorkspaceModule | AIModule、ServerAIModule、XpertAgentModule 等 4 | CQRS 1 | Agent 执行链专家 |
| [RoleModule](modules/role.md) `role` | `packages/server/src/role` | `/api` + 方法路径 `find`、`:id` | 7 | 3 | TenantModule、UserModule | AuthModule、InviteModule、OrganizationModule 等 9 | CQRS 1 · 事件边 1 | 身份与权限专家 |
| [UserOrganizationModule](modules/user-organization.md) `user-organization` | `packages/server/src/user-organization` | `/api` + 方法路径 `me`、`:id` | 7 | 3 | OrganizationModule、RoleModule、TenantModule 等 4 | ArtifactsModule、ConnectorModule、EmployeeModule 等 12 | CQRS 3 | 身份与权限专家 |
| [ViewExtensionModule](modules/view-extension.md) `view-extension` | `packages/server/src/view-extension` | `/api` + 方法路径 `:hostType` | 7 | 0 | IntegrationModule | ServerAppModule | - | 平台底座与集成专家 |
| [XpertMarketplaceModule](modules/xpert-marketplace.md) `xpert-marketplace` | `packages/server-ai/src/xpert-marketplace` | `/api` + 方法路径 `xpert-marketplace`、`xpert-access-requests` | 7 | 4 | XpertTemplateModule、XpertWorkspaceModule | ServerAIModule | - | Assistant 定义与运行时专家 |
| [ChatMessageFeedbackModule](modules/chat-message-feedback.md) `chat-message-feedback` | `packages/server-ai/src/chat-message-feedback` | `/api` + 方法路径 `my`、`:id` | 6 | 1 | ChatConversationModule、ChatMessageModule、SharedModule | AIModule、ServerAIModule | CQRS 1 | 对话与会话专家 |
| [FeatureModule](modules/feature.md) `feature` | `packages/server/src/feature` | `/api/toggle` | 6 | 2 | TenantModule | ServerAppModule、TenantModule、XpertProjectModule | CQRS 3 | 租户与平台设置专家 |
| [FileMemoryModule](modules/file-memory.md) `file-memory` | `packages/server-ai/src/file-memory` | `/api/xpert/:id/memory` | 6 | 3 | XpertModule、XpertWorkspaceModule | ServerAIModule | 事件边 1 | 文件理解与记忆专家 |
| [RolePermissionModule](modules/role-permission.md) `role-permission` | `packages/server/src/role-permission` | `/api` + 方法路径 `import`、`sync-defaults`、`:id` | 6 | 2 | RoleModule、TenantModule、UserModule | InviteModule、OrganizationModule、ServerAppModule 等 4 | CQRS 2 | 身份与权限专家 |
| [RuntimeControlModule](modules/runtime-control.md) `runtime-control` | `packages/server/src/runtime-control` | `/api/system/runtime` | 6 | 0 | ManagedConnectionModule、RedisModule | HealthModule、PluginModule、ServerAppModule | - | 运行时·沙箱·产物专家 |
| [UserGroupModule](modules/user-group.md) `user-group` | `packages/server/src/user-group` | `/api` + 方法路径 `:id` | 6 | 4 | UserModule、UserOrganizationModule | ServerAppModule、XpertModule | - | 身份与权限专家 |
| [WorkspaceFileAccessModule](modules/workspace-file-access.md) `workspace-file-access` | `packages/server-ai/src/workspace-file-access` | `/api/content` | 6 | 0 | VolumeModule | AIModule、ServerAIModule | 事件边 1 | 运行时·沙箱·产物专家 |
| [XpertTableModule](modules/xpert-table.md) `xpert-table` | `packages/server-ai/src/xpert-table` | `/api/xpert-table` | 6 | 1 | DataSourceModule、TenantModule、XpertWorkspaceModule | ServerAIModule | CQRS 2 · 事件边 1 | 平台底座与集成专家 |
| [BusinessAreaModule](modules/business-area.md) `business-area` | `packages/server/src/business-area` | `/api` + 方法路径 `:id` | 5 | 1 | - | ServerAppModule | - | 项目与任务协作专家 |
| [CopilotKnowledgeModule](modules/copilot-knowledge.md) `copilot-knowledge` | `packages/server-ai/src/copilot-knowledge` | `/api` + 方法路径 `similarity-search`、`mmr-search`、`commands` 等 4 个 | 5 | 1 | CopilotModule、DatabaseModule、TenantModule 等 4 | ServerAIModule | CQRS 1 · 事件边 2 | 模型访问与计费专家 |
| [CopilotUserModule](modules/copilot-user.md) `copilot-user` | `packages/server-ai/src/copilot-user` | `/api` + 方法路径 `summary`、`:id` | 5 | 2 | CopilotOrganizationModule、CopilotUsageModule、ModelAccessModule 等 5 | AIModule、ServerAIModule | CQRS 4 · 事件边 1 | 模型访问与计费专家 |
| [ReferralModule](modules/referral.md) `referral` | `packages/server/src/referral` | `/api/referral` | 5 | 3 | RedisModule | AuthModule、ServerAppModule | - | 租户与平台设置专家 |
| [ServerAIModule](modules/server-ai.md) `server-ai` | `packages/server-ai/src` | `/api/mcp-consumer`、`/api/mcp-consumer/oauth` | 5 | 14 | AIModule、ActorTokenRuntimeModule、AgentEvolutionModule 等 66 | ApiWorkerBootstrapModule、BootstrapModule | 事件边 5 | - |
| [XpertAgentModule](modules/xpert-agent.md) `xpert-agent` | `packages/server-ai/src/xpert-agent` | `/api` + 方法路径 `chat`、`xpert`、`middlewares` | 5 | 3 | ActorTokenModule、AgentInvocationModule、AgentMiddlewareRuntimeModule 等 13 | AIModule、ChatModule、PluginResourceModule 等 9 | CQRS 21 · 事件边 8 | Agent 执行链专家 |
| [CustomSmtpModule](modules/custom-smtp.md) `custom-smtp` | `packages/server/src/custom-smtp` | `/api` + 方法路径 `setting`、`validate`、`:id` | 4 | 1 | TenantModule | EmailModule、ServerAppModule | CQRS 2 | 租户与平台设置专家 |
| [OrganizationLanguageModule](modules/organization-language.md) `organization-language` | `packages/server/src/organization-language` | `/api` + 方法路径 `:id` | 4 | 1 | TenantModule | ServerAppModule | - | 身份与权限专家 |
| [XpertAgentExecutionModule](modules/xpert-agent-execution.md) `xpert-agent-execution` | `packages/server-ai/src/xpert-agent-execution` | `/api` + 方法路径 `:id`、`xpert` | 4 | 1 | AgentMiddlewareRuntimeModule、CopilotUsageModule、SuperAdminOrganizationScopeModule 等 4 | AIModule、ChatConversationModule、ServerAIModule 等 4 | CQRS 12 · 事件边 4 | Agent 执行链专家 |
| [ApiKeyModule](modules/api-key.md) `api-key` | `packages/server/src/api-key` | `/api/personal` | 3 | 1 | IntegrationModule、TenantModule、UserModule | SecretTokenModule、ServerAppModule | CQRS 2 | 身份与权限专家 |
| [ChatModule](modules/chat.md) `chat` | `packages/server-ai/src/chat` | `/api/chat` | 3 | 0 | AgentMiddlewareRuntimeModule、ChatConversationModule、CopilotCheckpointModule 等 9 | ServerAIModule | CQRS 6 · 事件边 7 | 对话与会话专家 |
| [CopilotCheckpointModule](modules/copilot-checkpoint.md) `copilot-checkpoint` | `packages/server-ai/src/copilot-checkpoint` | `/api` + 方法路径 `writes` | 3 | 2 | DatabaseModule、TenantModule | AIModule、ChatModule、ConversationBranchModule 等 6 | CQRS 3 · 任务 1 · 事件边 1 | 模型访问与计费专家 |
| [OrganizationContactModule](modules/organization-contact.md) `organization-contact` | `packages/server/src/organization-contact` | `/api` + 方法路径 `employee` | 3 | 1 | EmailModule、OrganizationModule、TenantModule 等 4 | InviteModule、ServerAppModule | CQRS 2 | 身份与权限专家 |
| [StorageFileModule](modules/storage-file.md) `storage-file` | `packages/server/src/storage-file` | `/api` + 方法路径 `url`、`:id` | 3 | 1 | TenantModule、UserModule | AIModule、ChatConversationModule、FileUnderstandingModule 等 6 | CQRS 5 · 事件边 1 | 文件理解与记忆专家 |
| [XpertToolModule](modules/xpert-tool.md) `xpert-tool` | `packages/server-ai/src/xpert-tool` | `/api` + 方法路径 `test`、`:id` | 3 | 1 | TenantModule、XpertToolsetModule | ServerAIModule | CQRS 2 | 工具与 MCP 专家 （批次 5）|
| [AccountBindingModule](modules/account-binding.md) `account-binding` | `packages/server/src/account-binding` | `/api` + 方法路径 `me` | 2 | 2 | - | AuthModule、EnterpriseChatkitModule、ServerAppModule | - | 身份与权限专家 |
| [CopilotOrganizationModule](modules/copilot-organization.md) `copilot-organization` | `packages/server-ai/src/copilot-organization` | `/api` + 方法路径 `:id` | 2 | 1 | TenantModule | AIModule、CopilotUserModule、ServerAIModule | CQRS 1 | 模型访问与计费专家 |
| [EmailModule](modules/email.md) `email` | `packages/server/src/email` | `/api` + 方法路径 `:id` | 2 | 4 | CustomSmtpModule、EmailTemplateModule、TenantModule | AuthModule、EmployeeModule、InviteModule 等 6 | - | 租户与平台设置专家 |
| [EnvironmentModule](modules/environment.md) `environment` | `packages/server-ai/src/environment` | `/api` + 方法路径 `default`、`:id` | 2 | 1 | XpertWorkspaceModule | AIModule、InitializationModule、PluginResourceModule 等 6 | CQRS 1 | Assistant 定义与运行时专家 |
| [HandoffQueueModule](modules/handoff-queue.md) `handoff-queue` | `packages/server-ai/src/handoff` | `/api/agent-invocations` | 2 | 11 | ConfigModule、RedisModule | ChatGroupModule、ServerAIModule、XpertModule | MQ 4 · CQRS 4 · 任务 3 · 事件边 4 | 对话与会话专家 |
| [HealthModule](modules/health.md) `health` | `packages/server/src/health` | `/api/health` | 2 | 1 | DatabaseModule、RuntimeControlModule | ServerAppModule | - | 运行时·沙箱·产物专家 |
| [ImportAllModule](modules/import-all.md) `import-all` | `packages/server/src/export-import/import` | - | 2 | 0 | ImportHistoryModule、ImportRecordModule | - | CQRS 1 · 事件边 2 | - |
| [InitializationModule](modules/initialization.md) `initialization` | `packages/server-ai/src/initialization` | `/api/initialization/clawxpert` | 2 | 0 | AssistantBindingModule、EnvironmentModule、MembershipModule 等 14 | ServerAIModule | MQ 1 · 事件边 3 | 平台底座与集成专家 |
| [LanguageModule](modules/language.md) `language` | `packages/server/src/language` | `/api` + 方法路径 `getByName` | 2 | 1 | UserModule | ServerAppModule | CQRS 1 | 平台底座与集成专家 |
| [MCPModule](modules/mcp.md) `mcp` | `packages/server-ai/src/mcp` | `/api` + 方法路径 `mcp` | 2 | 0 | - | - | - | 工具与 MCP 专家 （批次 5）|
| [MobileModule](modules/mobile.md) `mobile` | `packages/server-ai/src/mobile` | `/api` + 方法路径 `bootstrap`、`xperts` | 2 | 0 | AssistantBindingModule、OrganizationModule、UserModule 等 4 | ServerAIModule | - | 平台底座与集成专家 |
| [SkillRepositoryIndexModule](modules/skill-repository-index.md) `skill-repository-index` | `packages/server-ai/src/skill-repository/repository-index` | `/api/skill-repository-indexes` | 2 | 1 | SkillRepositoryModule、TenantModule | InitializationModule、ServerAIModule、SkillPackageModule 等 5 | - | 平台插件与技能专家 |
| [TenantSettingModule](modules/tenant-setting.md) `tenant-setting` | `packages/server/src/tenant/tenant-setting` | - | 2 | 1 | - | FileStorageModule、ServerAppModule | CQRS 2 | 租户与平台设置专家 |
| [AIModelModule](modules/aimodel.md) `aimodel` | `packages/server-ai/src/ai-model` | `/api` + 方法路径 `provider` | 1 | 0 | - | CopilotModule、CopilotProviderModule、ModelAccessModule | CQRS 5 | 模型访问与计费专家 |
| [ChatMessageModule](modules/chat-message.md) `chat-message` | `packages/server-ai/src/chat-message` | `/api` + 方法路径 `:id` | 1 | 2 | SharedModule | AIModule、ChatConversationModule、ChatMessageFeedbackModule 等 6 | CQRS 4 · 事件边 1 | 对话与会话专家 |
| [ContactModule](modules/contact.md) `contact` | `packages/server/src/contact` | - | 1 | 1 | TenantModule | - | CQRS 1 | 平台底座与集成专家 |
| [CountryModule](modules/country.md) `country` | `packages/server/src/country` | - | 1 | 1 | - | ServerAppModule | - | 平台底座与集成专家 |
| [CurrencyModule](modules/currency.md) `currency` | `packages/server/src/currency` | - | 1 | 1 | - | ServerAppModule | - | 平台底座与集成专家 |
| [DataSourceTypeModule](modules/data-source-type.md) `data-source-type` | `packages/server/src/data-source-type` | `/api` + 方法路径 `sync` | 1 | 1 | SharedModule、TenantModule | DataSourceModule、ServerAppModule | - | - |
| [EmployeeModule](modules/employee.md) `employee` | `packages/server/src/employee` | `/api` + 方法路径 `user` | 1 | 1 | AuthModule、EmailModule、TenantModule 等 5 | ServerAppModule、ValidatorModule | CQRS 4 | 身份与权限专家 |
| [FileUploadModule](modules/file-upload.md) `file-upload` | `packages/server/src/file/file-upload` | `/api` + 方法路径 `upload` | 1 | 0 | StorageFileModule | ServerAppModule | CQRS 1 | - |
| [HomeModule](modules/home.md) `home` | `packages/server/src/home` | - | 1 | 0 | - | ServerAppModule | - | - |
| [MetricsModule](modules/metrics.md) `metrics` | `packages/server-ai/src/metrics` | `/api/metrics` | 1 | 0 | - | ServerAIModule | - | - |
| [ServerAppModule](modules/server-app.md) `server-app` | `packages/server/src` | `/api` + 方法路径 `hello` | 1 | 0 | AccountBindingModule、ApiKeyModule、AuthModule 等 38 | ApiWorkerBootstrapModule、AppModule、BootstrapModule | - | - |
| [ActorTokenModule](modules/actor-token.md) `actor-token` | `packages/server/src/actor-token` | - | 0 | 0 | - | ActorTokenRuntimeModule、XpertAgentModule、XpertTaskModule | - | 身份与权限专家 |
| [ActorTokenRuntimeModule](modules/actor-token-runtime.md) `actor-token-runtime` | `packages/server-ai/src/actor-token` | - | 0 | 0 | ActorTokenModule、RuntimeCapabilityModule | AgentMiddlewareRuntimeModule、ServerAIModule | - | - |
| [AgentMiddlewareRuntimeModule](modules/agent-middleware-runtime.md) `agent-middleware-runtime` | `packages/server-ai/src/shared/agent/middleware-runtime` | - | 0 | 0 | ActorTokenRuntimeModule、ArtifactsModule、CollaborationModule 等 9 | ChatModule、CopilotModelModule、KnowledgeWikiModule 等 9 | 事件边 3 | Agent 执行链专家 |
| [ApiWorkerBootstrapModule](modules/api-worker-bootstrap.md) `api-worker-bootstrap` | `apps/api/src` | - | 0 | 0 | ConfigModule、RedisModule、SeederModule 等 5 | - | - | - |
| [AppModule](modules/app.md) `app` | `apps/api/src/app` | - | 0 | 0 | SeederModule、ServerAppModule | - | - | - |
| [BootstrapModule](modules/bootstrap--src.md) `bootstrap--src` | `apps/api/src/bootstrap` | - | 0 | 0 | ConfigModule、RedisModule、SeederModule 等 5 | - | - | - |
| [BootstrapModule](modules/bootstrap--src-2.md) `bootstrap--src-2` | `packages/server/src/bootstrap` | - | 0 | 0 | ConfigModule、LoggerModule、ServerAppModule | MigrationRootModule、RootModule | - | - |
| [CaslModule](modules/casl.md) `casl` | `packages/server/src/core/casl` | - | 0 | 0 | - | - | - | - |
| [ChatGroupModule](modules/chat-group.md) `chat-group` | `packages/server-ai/src/chat-group` | - | 0 | 12 | AgentPluginModule、ChatConversationModule、HandoffQueueModule 等 7 | AIModule | CQRS 10 · 事件边 3 | 对话与会话专家 |
| [CollaborationModule](modules/collaboration.md) `collaboration` | `packages/server-ai/src/collaboration` | - | 0 | 2 | RedisModule、RuntimeCapabilityModule | AgentMiddlewareRuntimeModule、ServerAIModule | - | Agent 执行链专家 |
| [ConfigModule](modules/config.md) `config` | `packages/config/src` | - | 0 | 0 | - | ApiWorkerBootstrapModule、BootstrapModule、DatabaseModule 等 7 | - | - |
| [ConversationBranchModule](modules/conversation-branch.md) `conversation-branch` | `packages/server-ai/src/chat-conversation/conversation-branch` | - | 0 | 5 | ChatConversationModule、ChatMessageModule、CopilotCheckpointModule 等 6 | ServerAIModule | CQRS 1 | 对话与会话专家 |
| [ConversationMapModule](modules/conversation-map.md) `conversation-map` | `packages/server-ai/src/chat-conversation/conversation-map` | - | 0 | 1 | ChatConversationModule、XpertModule、XpertProjectAccessModule 等 4 | ServerAIModule | 事件边 1 | 对话与会话专家 |
| [CopilotModelModule](modules/copilot-model.md) `copilot-model` | `packages/server-ai/src/copilot-model` | - | 0 | 1 | AgentMiddlewareRuntimeModule、TenantModule、UserModule | KnowledgeDocumentModule、ServerAIModule | CQRS 4 · 事件边 3 | 模型访问与计费专家 |
| [CopilotStoreModule](modules/copilot-store.md) `copilot-store` | `packages/server-ai/src/copilot-store` | - | 0 | 1 | TenantModule | ServerAIModule、XpertModule | CQRS 3 | 模型访问与计费专家 |
| [CoreModule](modules/core.md) `core` | `packages/server/src/core` | - | 0 | 0 | DatabaseModule、TenantModule | ServerAppModule | - | - |
| [DatabaseModule](modules/database.md) `database` | `packages/server/src/database` | - | 0 | 0 | ConfigModule | CopilotCheckpointModule、CopilotKnowledgeModule、CoreModule 等 6 | - | - |
| [ExecutionCancelModule](modules/execution-cancel.md) `execution-cancel` | `packages/server-ai/src/shared/execution` | - | 0 | 0 | RedisModule | ChatConversationModule、XpertAgentModule | - | Agent 执行链专家 |
| [FactoryResetModule](modules/factory-reset.md) `factory-reset` | `packages/server/src/user/factory-reset` | - | 0 | 3 | - | UserModule | - | - |
| [FileRuntimeModule](modules/file-runtime.md) `file-runtime` | `packages/server-ai/src/file-understanding/runtime` | - | 0 | 0 | RuntimeCapabilityModule | AgentMiddlewareRuntimeModule、FileUnderstandingModule | 事件边 1 | - |
| [FileStorageModule](modules/file-storage.md) `file-storage` | `packages/server/src/file/file-storage` | - | 0 | 0 | TenantSettingModule | ServerAppModule | - | - |
| [FileUploadTargetsModule](modules/file-upload-targets.md) `file-upload-targets` | `packages/server-ai/src/shared/file-upload-targets` | - | 0 | 0 | VolumeModule | ServerAIModule | - | - |
| [GraphqlModule](modules/graphql.md) `graphql` | `packages/server/src/graphql` | - | 0 | 0 | - | - | - | - |
| [GraphqlApiModule](modules/graphql-api.md) `graphql-api` | `packages/server/src/graphql` | - | 0 | 0 | - | - | - | - |
| [ImportHistoryModule](modules/import-history.md) `import-history` | `packages/server/src/export-import/import-history` | - | 0 | 1 | - | ImportAllModule | CQRS 1 | - |
| [ImportRecordModule](modules/import-record.md) `import-record` | `packages/server/src/export-import/import-record` | - | 0 | 1 | - | ImportAllModule | CQRS 2 | - |
| [KnowledgeIdentityModule](modules/knowledge-identity.md) `knowledge-identity` | `packages/server-ai/src/knowledgebase/identity` | - | 0 | 4 | KnowledgebaseModule | GraphragModule、KnowledgeWikiModule | - | 知识库专家 |
| [LoggerModule](modules/logger.md) `logger` | `packages/server/src/logger` | - | 0 | 0 | - | BootstrapModule | - | - |
| [ManagedConnectionModule](modules/managed-connection.md) `managed-connection` | `packages/server/src/managed-connection` | - | 0 | 1 | RedisModule | RuntimeControlModule、ServerAppModule | 任务 1 | - |
| [ManagedQueueModule](modules/managed-queue.md) `managed-queue` | `packages/server/src/managed-queue` | - | 0 | 0 | RedisModule、UserModule | ServerAppModule | MQ 2 | - |
| [MigrationRootModule](modules/migration-root.md) `migration-root` | `apps/api/src` | - | 0 | 0 | BootstrapModule、PluginModule | - | - | - |
| [PasswordResetModule](modules/password-reset.md) `password-reset` | `packages/server/src/password-reset` | - | 0 | 1 | - | AuthModule | CQRS 2 | 身份与权限专家 |
| [RagVStoreModule](modules/rag-vstore.md) `rag-vstore` | `packages/server-ai/src/rag-vstore` | - | 0 | 0 | TenantModule | FileUnderstandingModule、KnowledgebaseModule、ServerAIModule | CQRS 1 | 知识库专家 |
| [RagWebModule](modules/rag-web.md) `rag-web` | `packages/server-ai/src/rag-web` | - | 0 | 0 | TenantModule | ServerAIModule | CQRS 3 | 知识库专家 |
| [RedisModule](modules/redis.md) `redis` | `packages/server/src/core/redis` | - | 0 | 0 | ConfigModule | AIModule、ApiWorkerBootstrapModule、AuthModule 等 24 | - | - |
| [RootModule](modules/root.md) `root` | `apps/api/src/bootstrap` | - | 0 | 0 | BootstrapModule、PluginModule | - | - | - |
| [RuntimeCapabilityModule](modules/runtime-capability.md) `runtime-capability` | `packages/server-ai/src/shared/runtime` | - | 0 | 0 | - | ActorTokenRuntimeModule、AgentMiddlewareRuntimeModule、ArtifactsModule 等 8 | 事件边 4 | - |
| [SecretTokenModule](modules/secret-token.md) `secret-token` | `packages/server/src/secret-token` | - | 0 | 1 | ApiKeyModule、UserModule | AIModule、EnterpriseChatkitModule、XpertModule | CQRS 2 | 身份与权限专家 |
| [SeederModule](modules/seeder.md) `seeder` | `packages/server/src/core/seeds` | - | 0 | 2 | - | ApiWorkerBootstrapModule、AppModule、BootstrapModule | - | - |
| [SharedModule](modules/shared.md) `shared` | `packages/server/src/shared` | - | 0 | 2 | ValidatorModule | AssistantBindingModule、ChatConversationModule、ChatMessageFeedbackModule 等 7 | 事件边 1 | - |
| [SseStreamModule](modules/sse-stream.md) `sse-stream` | `packages/server-ai/src/shared/stream` | - | 0 | 0 | RedisModule | AIModule、ChatConversationModule、ChatGroupModule 等 4 | - | - |
| [SuperAdminOrganizationScopeModule](modules/super-admin-organization-scope.md) `super-admin-organization-scope` | `packages/server-ai/src/shared` | - | 0 | 1 | OrganizationModule | AIModule、ChatConversationModule、SandboxModule 等 4 | CQRS 4 · 事件边 7 | - |
| [TenantAdminCliModule](modules/tenant-admin-cli.md) `tenant-admin-cli` | `apps/api/src` | - | 0 | 6 | DatabaseModule | - | - | - |
| [ValidatorModule](modules/validator.md) `validator` | `packages/server/src/shared/validators` | - | 0 | 2 | EmployeeModule、RoleModule、UserOrganizationModule | SharedModule | - | - |
| [VolumeModule](modules/volume.md) `volume` | `packages/server-ai/src/shared/volume` | - | 0 | 0 | - | ArtifactsModule、FileUnderstandingModule、FileUploadTargetsModule 等 7 | - | - |
| [WorkspaceFilesRuntimeModule](modules/workspace-files-runtime.md) `workspace-files-runtime` | `packages/server-ai/src/shared/runtime` | - | 0 | 0 | RuntimeCapabilityModule、VolumeModule | AgentMiddlewareRuntimeModule、McpPublicationModule、SandboxModule 等 4 | 事件边 4 | - |
| [XpertMiddlewareModule](modules/xpert-middleware.md) `xpert-middleware` | `packages/server-ai/src/xpert-middleware` | - | 0 | 0 | ChatConversationModule | ServerAIModule | - | - |

## 2. 模块依赖图（562 条边）

（边数 562 > 120，图过密，按模块列出）

- `migration-root` → `BootstrapModule`、`PluginModule`
- `tenant-admin-cli` → `DatabaseModule`
- `api-worker-bootstrap` → `ConfigModule`、`RedisModule`、`SeederModule`、`ServerAIModule`、`ServerAppModule`
- `app` → `SeederModule`、`ServerAppModule`
- `bootstrap--src` → `ConfigModule`、`RedisModule`、`SeederModule`、`ServerAIModule`、`ServerAppModule`
- `root` → `BootstrapModule`、`PluginModule`
- `social-auth` → `ConfigModule`
- `server-app` → `AccountBindingModule`、`ApiKeyModule`、`AuthModule`、`BusinessAreaModule`、`CoreModule`、`CountryModule`、`CurrencyModule`、`CustomSmtpModule`、`DataSourceModule`、`DataSourceTypeModule`、`EmailModule`、`EmailTemplateModule`、`EmployeeModule`、`FeatureModule`、`FileStorageModule`、`FileUploadModule`、`HealthModule`、`HomeModule`、`IntegrationModule`、`InviteModule`、`LanguageModule`、`ManagedConnectionModule`、`ManagedQueueModule`、`OrganizationContactModule`、`OrganizationLanguageModule`、`OrganizationModule`、`ReferralModule`、`RoleModule`、`RolePermissionModule`、`RuntimeControlModule`、`StorageFileModule`、`TagModule`、`TenantModule`、`TenantSettingModule`、`UserGroupModule`、`UserModule`、`UserOrganizationModule`、`ViewExtensionModule`
- `api-key` → `IntegrationModule`、`TenantModule`、`UserModule`
- `auth` → `AccountBindingModule`、`EmailModule`、`OrganizationModule`、`PasswordResetModule`、`RedisModule`、`ReferralModule`、`RoleModule`、`SocialAuthModule`、`TenantModule`、`UserModule`
- `bootstrap--src-2` → `ConfigModule`、`LoggerModule`、`ServerAppModule`
- `contact` → `TenantModule`
- `core` → `DatabaseModule`、`TenantModule`
- `redis` → `ConfigModule`
- `custom-smtp` → `TenantModule`
- `data-source` → `DataSourceTypeModule`、`SharedModule`、`TenantModule`、`UserModule`
- `data-source-type` → `SharedModule`、`TenantModule`
- `database` → `ConfigModule`
- `email` → `CustomSmtpModule`、`EmailTemplateModule`、`TenantModule`
- `email-template` → `TenantModule`
- `employee` → `AuthModule`、`EmailModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- `import-all` → `ImportHistoryModule`、`ImportRecordModule`
- `feature` → `TenantModule`
- `file-storage` → `TenantSettingModule`
- `file-upload` → `StorageFileModule`
- `health` → `DatabaseModule`、`RuntimeControlModule`
- `integration` → `RedisModule`、`TenantModule`、`UserModule`
- `invite` → `AuthModule`、`EmailModule`、`OrganizationContactModule`、`OrganizationModule`、`RoleModule`、`RolePermissionModule`、`SharedModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- `language` → `UserModule`
- `managed-connection` → `RedisModule`
- `managed-queue` → `RedisModule`、`UserModule`
- `organization` → `RoleModule`、`RolePermissionModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- `organization-contact` → `EmailModule`、`OrganizationModule`、`TenantModule`、`UserModule`
- `organization-language` → `TenantModule`
- `plugin` → `ConfigModule`、`RedisModule`、`RuntimeControlModule`
- `referral` → `RedisModule`
- `role` → `TenantModule`、`UserModule`
- `role-permission` → `RoleModule`、`TenantModule`、`UserModule`
- `runtime-control` → `ManagedConnectionModule`、`RedisModule`
- `secret-token` → `ApiKeyModule`、`UserModule`
- `shared` → `ValidatorModule`
- `validator` → `EmployeeModule`、`RoleModule`、`UserOrganizationModule`
- `storage-file` → `TenantModule`、`UserModule`
- `tag` → `TenantModule`、`UserModule`
- `tenant` → `FeatureModule`、`RoleModule`、`RolePermissionModule`、`UserModule`
- `user` → `FactoryResetModule`、`RoleModule`、`TenantModule`、`UserOrganizationModule`
- `user-group` → `UserModule`、`UserOrganizationModule`
- `user-organization` → `OrganizationModule`、`RoleModule`、`TenantModule`、`UserModule`
- `view-extension` → `IntegrationModule`
- `server-ai` → `AIModule`、`ActorTokenRuntimeModule`、`AgentEvolutionModule`、`AgentMiddlewareRuntimeModule`、`AgentPluginModule`、`ArtifactsModule`、`AssistantBindingModule`、`ChatConversationModule`、`ChatMessageFeedbackModule`、`ChatMessageModule`、`ChatModule`、`CollaborationModule`、`ConnectorModule`、`ConversationBranchModule`、`ConversationMapModule`、`CopilotCheckpointModule`、`CopilotKnowledgeModule`、`CopilotModelModule`、`CopilotModule`、`CopilotOrganizationModule`、`CopilotProviderModule`、`CopilotStoreModule`、`CopilotUsageModule`、`CopilotUserModule`、`DesktopShellModule`、`EnterpriseChatkitModule`、`EnvironmentModule`、`FileMemoryModule`、`FileUnderstandingModule`、`FileUploadTargetsModule`、`GraphragModule`、`HandoffQueueModule`、`InitializationModule`、`KnowledgeDocumentModule`、`KnowledgeWikiModule`、`KnowledgebaseModule`、`McpPublicationModule`、`MembershipModule`、`MetricsModule`、`MobileModule`、`ModelAccessModule`、`ModelExecutionModule`、`ModelGatewayModule`、`PluginResourceModule`、`PromptWorkflowModule`、`RagVStoreModule`、`RagWebModule`、`SandboxModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`UserModule`、`VolumeModule`、`WorkspaceFileAccessModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertMarketplaceModule`、`XpertMiddlewareModule`、`XpertModule`、`XpertProjectModule`、`XpertTableModule`、`XpertTaskModule`、`XpertTemplateModule`、`XpertToolModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- `actor-token-runtime` → `ActorTokenModule`、`RuntimeCapabilityModule`
- `agent-invocation` → `ArtifactsModule`
- `agent-plugin` → `ConnectorModule`、`PluginResourceModule`
- `ai` → `AssistantBindingModule`、`ChatConversationModule`、`ChatGroupModule`、`ChatMessageFeedbackModule`、`ChatMessageModule`、`ConnectorModule`、`CopilotCheckpointModule`、`CopilotModule`、`CopilotOrganizationModule`、`CopilotUserModule`、`EnvironmentModule`、`FileUnderstandingModule`、`KnowledgeDocumentModule`、`KnowledgebaseModule`、`PromptWorkflowModule`、`RedisModule`、`SandboxModule`、`SecretTokenModule`、`SkillPackageModule`、`SseStreamModule`、`StorageFileModule`、`SuperAdminOrganizationScopeModule`、`TenantModule`、`WorkspaceFileAccessModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`、`XpertToolsetModule`
- `artifacts` → `RuntimeCapabilityModule`、`UserModule`、`UserOrganizationModule`、`VolumeModule`、`XpertWorkspaceModule`
- `assistant-binding` → `ConnectorModule`、`SharedModule`、`TenantModule`、`XpertModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- `chat` → `AgentMiddlewareRuntimeModule`、`ChatConversationModule`、`CopilotCheckpointModule`、`CopilotModule`、`KnowledgebaseModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`、`XpertToolsetModule`
- `chat-conversation` → `ArtifactsModule`、`ChatMessageModule`、`ExecutionCancelModule`、`RedisModule`、`SharedModule`、`SseStreamModule`、`StorageFileModule`、`SuperAdminOrganizationScopeModule`、`XpertAgentExecutionModule`、`XpertProjectAccessModule`
- `conversation-branch` → `ChatConversationModule`、`ChatMessageModule`、`CopilotCheckpointModule`、`FileUnderstandingModule`、`XpertModule`、`XpertProjectModule`
- `conversation-map` → `ChatConversationModule`、`XpertModule`、`XpertProjectAccessModule`、`XpertProjectModule`
- `chat-group` → `AgentPluginModule`、`ChatConversationModule`、`HandoffQueueModule`、`SseStreamModule`、`XpertModule`、`XpertProjectModule`、`XpertWorkspaceModule`
- `chat-message` → `SharedModule`
- `chat-message-feedback` → `ChatConversationModule`、`ChatMessageModule`、`SharedModule`
- `collaboration` → `RedisModule`、`RuntimeCapabilityModule`
- `connector` → `IntegrationModule`、`RuntimeCapabilityModule`、`TenantModule`、`UserOrganizationModule`、`XpertWorkspaceModule`
- `copilot` → `AIModelModule`、`CopilotProviderModule`、`MembershipModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- `copilot-checkpoint` → `DatabaseModule`、`TenantModule`
- `copilot-knowledge` → `CopilotModule`、`DatabaseModule`、`TenantModule`、`UserModule`
- `copilot-model` → `AgentMiddlewareRuntimeModule`、`TenantModule`、`UserModule`
- `copilot-organization` → `TenantModule`
- `copilot-provider` → `AIModelModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- `copilot-store` → `TenantModule`
- `copilot-usage` → `MembershipModule`、`TenantModule`
- `copilot-user` → `CopilotOrganizationModule`、`CopilotUsageModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- `desktop-shell` → `RedisModule`、`TenantModule`
- `environment` → `XpertWorkspaceModule`
- `file-memory` → `XpertModule`、`XpertWorkspaceModule`
- `file-understanding` → `ChatConversationModule`、`FileRuntimeModule`、`RagVStoreModule`、`StorageFileModule`、`TenantModule`、`UserModule`、`VolumeModule`、`XpertModule`、`XpertProjectAccessModule`
- `file-runtime` → `RuntimeCapabilityModule`
- `graphrag` → `KnowledgeDocumentModule`、`KnowledgeIdentityModule`、`KnowledgebaseModule`、`UserModule`
- `handoff-queue` → `ConfigModule`、`RedisModule`
- `initialization` → `AssistantBindingModule`、`EnvironmentModule`、`MembershipModule`、`ModelAccessModule`、`ModelGatewayModule`、`OrganizationModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`UserModule`、`UserOrganizationModule`、`XpertModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- `knowledge-document` → `CopilotModelModule`、`CopilotModule`、`IntegrationModule`、`KnowledgeProcessingLifecycleModule`、`KnowledgebaseModule`、`RuntimeCapabilityModule`、`StorageFileModule`、`TenantModule`、`UserModule`
- `knowledgebase` → `CopilotModule`、`DatabaseModule`、`IntegrationModule`、`KnowledgeDocumentModule`、`RagVStoreModule`、`TenantModule`、`UserModule`、`XpertModule`、`XpertWorkspaceModule`
- `knowledge-identity` → `KnowledgebaseModule`
- `knowledge-wiki` → `AgentMiddlewareRuntimeModule`、`KnowledgeDocumentModule`、`KnowledgeIdentityModule`、`KnowledgebaseModule`、`UserModule`
- `mcp-publication` → `RedisModule`、`WorkspaceFilesRuntimeModule`、`XpertToolsetModule`
- `membership` → `RedisModule`、`TenantModule`
- `mobile` → `AssistantBindingModule`、`OrganizationModule`、`UserModule`、`XpertModule`
- `model-access` → `AIModelModule`、`MembershipModule`、`RedisModule`
- `model-execution` → `AgentMiddlewareRuntimeModule`、`ModelAccessModule`、`XpertModule`
- `model-gateway` → `AgentMiddlewareRuntimeModule`、`MembershipModule`、`ModelAccessModule`
- `plugin-resource` → `CopilotModule`、`EnvironmentModule`、`KnowledgebaseModule`、`McpPublicationModule`、`SandboxModule`、`SkillPackageModule`、`TenantModule`、`XpertAgentModule`、`XpertModule`、`XpertTemplateModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- `prompt-workflow` → `TenantModule`、`XpertAgentModule`、`XpertWorkspaceModule`
- `rag-vstore` → `TenantModule`
- `rag-web` → `TenantModule`
- `sandbox` → `SuperAdminOrganizationScopeModule`、`TenantModule`、`VolumeModule`、`WorkspaceFilesRuntimeModule`、`XpertProjectAccessModule`
- `super-admin-organization-scope` → `OrganizationModule`
- `agent-middleware-runtime` → `ActorTokenRuntimeModule`、`ArtifactsModule`、`CollaborationModule`、`ConnectorModule`、`CopilotModule`、`CopilotUsageModule`、`FileRuntimeModule`、`RuntimeCapabilityModule`、`WorkspaceFilesRuntimeModule`
- `execution-cancel` → `RedisModule`
- `file-upload-targets` → `VolumeModule`
- `workspace-files-runtime` → `RuntimeCapabilityModule`、`VolumeModule`
- `sse-stream` → `RedisModule`
- `skill-package` → `SkillRepositoryIndexModule`、`SkillRepositoryModule`、`TenantModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- `skill-repository` → `SkillPackageModule`、`TenantModule`
- `skill-repository-index` → `SkillRepositoryModule`、`TenantModule`
- `workspace-file-access` → `VolumeModule`
- `enterprise-chatkit` → `AccountBindingModule`、`IntegrationModule`、`SecretTokenModule`
- `xpert` → `AgentMiddlewareRuntimeModule`、`AssistantBindingModule`、`ChatConversationModule`、`CopilotCheckpointModule`、`CopilotStoreModule`、`CopilotUsageModule`、`EnvironmentModule`、`HandoffQueueModule`、`IntegrationModule`、`KnowledgebaseModule`、`ModelAccessModule`、`PromptWorkflowModule`、`RedisModule`、`SandboxModule`、`SecretTokenModule`、`SkillPackageModule`、`SseStreamModule`、`TenantModule`、`UserGroupModule`、`UserModule`、`WorkspaceFilesRuntimeModule`、`XpertAgentModule`、`XpertProjectModule`、`XpertTemplateModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- `xpert-agent` → `ActorTokenModule`、`AgentInvocationModule`、`AgentMiddlewareRuntimeModule`、`ChatConversationModule`、`CopilotCheckpointModule`、`EnvironmentModule`、`ExecutionCancelModule`、`PromptWorkflowModule`、`RedisModule`、`SkillPackageModule`、`TenantModule`、`XpertAgentExecutionModule`、`XpertModule`
- `xpert-agent-execution` → `AgentMiddlewareRuntimeModule`、`CopilotUsageModule`、`SuperAdminOrganizationScopeModule`、`TenantModule`
- `xpert-marketplace` → `XpertTemplateModule`、`XpertWorkspaceModule`
- `xpert-middleware` → `ChatConversationModule`
- `xpert-project` → `AgentInvocationModule`、`ConnectorModule`、`EmailModule`、`FeatureModule`、`IntegrationModule`、`OrganizationModule`、`RedisModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectAccessModule`
- `xpert-table` → `DataSourceModule`、`TenantModule`、`XpertWorkspaceModule`
- `xpert-task` → `ActorTokenModule`、`ConnectorModule`、`RedisModule`、`TenantModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`
- `xpert-template` → `SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`TenantModule`、`UserModule`
- `xpert-tool` → `TenantModule`、`XpertToolsetModule`
- `xpert-toolset` → `ChatMessageModule`、`CopilotModule`、`RedisModule`、`TenantModule`、`XpertAgentModule`、`XpertWorkspaceModule`
- `xpert-workspace` → `TenantModule`、`UserOrganizationModule`

## 3. 表 → 模块（反向，226 张表）

| 表 | 模块数 | 模块（引用次数） |
|----|--------|------------------|
| `user` | 25 | `auth`（8）、`account-binding`（7）、`xpert-project`（6）、`mcp-publication`（5）、`xpert-project-access`（5） 等 25 个模块 |
| `chat_conversation` | 15 | `chat-conversation`（31）、`chat-group`（29）、`xpert`（12）、`enterprise-chatkit`（9）、`xpert-project`（9） 等 15 个模块 |
| `chat_message` | 14 | `chat-group`（30）、`chat-conversation`（8）、`ai`（7）、`xpert-agent`（7）、`server-ai`（5） 等 14 个模块 |
| `xpert` | 13 | `xpert`（23）、`enterprise-chatkit`（22）、`assistant-binding`（6）、`membership`（4）、`prompt-workflow`（4） 等 13 个模块 |
| `user_organization` | 13 | `user-organization`（8）、`auth`（6）、`membership`（6）、`xpert-project`（5）、`agent-invocation`（4） 等 13 个模块 |
| `organization` | 12 | `organization`（6）、`auth`（5）、`invite`（4）、`model-access`（4）、`email`（3） 等 12 个模块 |
| `xpert_agent_execution` | 11 | `handoff-queue`（14）、`chat-group`（9）、`agent-invocation`（7）、`server-ai`（6）、`ai`（6） 等 11 个模块 |
| `chat_conversation_thread` | 10 | `handoff-queue`（15）、`chat-conversation`（14）、`chat-group`（9）、`agent-invocation`（3）、`ai`（3） 等 10 个模块 |
| `feature_organization` | 9 | `feature`（5）、`referral`（4）、`membership`（4）、`model-access`（4）、`user`（3） 等 9 个模块 |
| `role` | 9 | `invite`（6）、`tenant-admin-cli`（3）、`role`（3）、`validator`（2）、`tenant`（2） 等 9 个模块 |
| `knowledgebase` | 7 | `knowledgebase`（19）、`knowledge-wiki`（19）、`graphrag`（9）、`plugin-resource`（3）、`knowledge-processing-lifecycle`（1） 等 7 个模块 |
| `agent_invocation` | 6 | `agent-invocation`（17）、`xpert-project-access`（11）、`xpert-project`（11）、`handoff-queue`（5）、`chat-group`（3） 等 6 个模块 |
| `knowledge_document` | 6 | `knowledge-document`（11）、`knowledge-processing-lifecycle`（10）、`knowledge-wiki`（10）、`graphrag`（7）、`knowledgebase`（7） 等 6 个模块 |
| `tenant_setting` | 6 | `model-execution`（6）、`membership`（5）、`model-gateway`（5）、`agent-plugin`（4）、`tenant-setting`（3） 等 6 个模块 |
| `agent_runtime_inbox` | 5 | `handoff-queue`（42）、`agent-invocation`（11）、`chat-group`（3）、`xpert-project-access`（1）、`xpert-project`（1） |
| `xpert_toolset` | 5 | `plugin-resource`（11）、`xpert-toolset`（7）、`server-ai`（4）、`mcp-publication`（3）、`agent-plugin`（2） |
| `knowledge_document_chunk` | 5 | `knowledge-document`（9）、`knowledge-processing-lifecycle`（8）、`knowledgebase`（4）、`knowledge-wiki`（3）、`graphrag`（1） |
| `agent_runtime_binding` | 5 | `agent-invocation`（6）、`xpert-project-access`（4）、`xpert-project`（4）、`handoff-queue`（3）、`model-execution`（3） |
| `conversation_file_link` | 5 | `file-understanding`（15）、`chat-conversation`（1）、`conversation-branch`（1）、`xpert-project-access`（1）、`xpert-project`（1） |
| `xpert_workspace` | 5 | `xpert-workspace`（7）、`plugin-resource`（5）、`skill-package`（3）、`xpert-template`（3）、`agent-invocation`（1） |
| `email_template` | 5 | `email-template`（5）、`email`（4）、`auth`（2）、`invite`（2）、`tenant`（2） |
| `tag` | 5 | `tag`（7）、`knowledgebase`（5）、`super-admin-organization-scope`（1）、`enterprise-chatkit`（1）、`xpert`（1） |
| `xpert_project` | 4 | `xpert-project-access`（36）、`xpert-project`（36）、`agent-invocation`（1）、`file-understanding`（1） |
| `file_asset` | 4 | `file-understanding`（39）、`xpert-project`（3）、`xpert-project-access`（2）、`chat-message`（1） |
| `agent_runtime_delivery` | 4 | `handoff-queue`（19）、`agent-invocation`（7）、`xpert-project-access`（1）、`xpert-project`（1） |
| `membership_point_ledger` | 4 | `membership`（11）、`copilot-usage`（7）、`model-execution`（3）、`model-gateway`（2） |
| `copilot` | 4 | `copilot`（5）、`membership`（4）、`model-access`（3）、`model-execution`（3） |
| `skill_package` | 4 | `plugin-resource`（5）、`skill-package`（5）、`skill-repository`（3）、`agent-plugin`（1） |
| `tenant` | 4 | `tenant`（6）、`tenant-admin-cli`（4）、`seeder`（2）、`auth`（1） |
| `xpert_assistant_user_preference` | 4 | `xpert`（4）、`chat-conversation`（3）、`model-execution`（3）、`enterprise-chatkit`（3） |
| `external_identity_binding` | 4 | `account-binding`（5）、`auth`（3）、`tenant-admin-cli`（1）、`user`（1） |
| `xpert_project_task` | 3 | `xpert-project`（35）、`xpert-project-access`（34）、`handoff-queue`（8） |
| `xpert_project_task_execution` | 3 | `xpert-project`（16）、`xpert-project-access`（15）、`handoff-queue`（2） |
| `plugin_application_installation` | 3 | `plugin-resource`（13）、`xpert-project`（3）、`xpert-project-access`（2） |
| `copilot_checkpoint` | 3 | `chat-conversation`（7）、`copilot-checkpoint`（7）、`conversation-branch`（1） |
| `xpert_task` | 3 | `xpert-task`（5）、`xpert-project`（4）、`xpert-project-access`（3） |
| `feature` | 3 | `feature`（6）、`xpert-project`（3）、`xpert-project-access`（2） |
| `integration` | 3 | `integration`（7）、`enterprise-chatkit`（1）、`xpert`（1） |
| `invite` | 3 | `invite`（3）、`organization`（3）、`role`（3） |
| `mcp_capability_catalog` | 3 | `mcp-publication`（4）、`xpert-toolset`（3）、`server-ai`（2） |
| `user_group` | 3 | `organization`（3）、`user-group`（3）、`xpert-marketplace`（3） |
| `business_area` | 3 | `business-area`（3）、`xpert`（3）、`enterprise-chatkit`（2） |
| `xpert_agent` | 3 | `xpert-agent`（4）、`chat-conversation`（3）、`graphrag`（1） |
| `artifact` | 3 | `artifacts`（5）、`xpert-project-access`（1）、`xpert-project`（1） |
| `assistant_template_publication` | 3 | `enterprise-chatkit`（3）、`xpert`（3）、`xpert-template`（1） |
| `email_verification` | 3 | `user`（3）、`tenant-admin-cli`（2）、`auth`（2） |
| `chat_group_participant` | 2 | `chat-group`（35）、`ai`（1） |
| `knowledge_wiki_page` | 2 | `knowledge-wiki`（24）、`knowledgebase`（3） |
| `knowledge_wiki_page_version` | 2 | `knowledge-wiki`（16）、`knowledgebase`（3） |
| `assistant_template_upgrade` | 2 | `enterprise-chatkit`（9）、`xpert`（9） |
| `xpert_project_membership` | 2 | `xpert-project-access`（9）、`xpert-project`（9） |
| `knowledge_wiki_source_state` | 2 | `knowledge-wiki`（14）、`knowledgebase`（3） |
| `model_gateway_call` | 2 | `model-execution`（10）、`model-gateway`（5） |
| `xpert_project_task_step` | 2 | `xpert-project`（8）、`xpert-project-access`（7） |
| `plugin_resource_installation` | 2 | `plugin-resource`（9）、`xpert-toolset`（3） |
| `xpert_project_asset` | 2 | `xpert-project`（6）、`xpert-project-access`（5） |
| `xpert_project_automation` | 2 | `xpert-project`（6）、`xpert-project-access`（5） |
| `xpert_project_milestone` | 2 | `xpert-project`（6）、`xpert-project-access`（5） |
| `xpert_project_plan` | 2 | `xpert-project`（6）、`xpert-project-access`（5） |
| `copilot_user` | 2 | `copilot-user`（7）、`copilot-usage`（3） |

（共 226 张，完整见 `tables.md`）

## 4. 专家资产（1 个）

| 专家 | 路径 | 关联模块 |
|------|------|----------|
| 后端专题 | `.module-experts/后端专题` | **未关联** |

> 关联按专家资产文本里出现的模块名/slug 机械判定；「未关联」不代表无关（专家名可能用中文业务名，与代码标识无字面重叠）。

## 5. 待确认（9）

| 类型 | 位置 | 内容 | 原因 |
|------|------|------|------|
| 展开未解析 | `configs` | packages/config/src/config.module.ts | `...configs` 的定义不在扫描范围（跨包/外部依赖？），未展开 |
| 非实体 token（接口） | `IEmail` | packages/server/src/email/email.service.ts（来自 @InjectReposit | 注入 token 是接口/类型而非实体 → 无表可映射（自定义 provider） |
| 展开未解析 | `dbConnectionOptions` | packages/server/src/database/database.module.ts | `...dbConnectionOptions` 的定义不在扫描范围（跨包/外部依赖？），未展开 |
| 展开未解析 | `options` | packages/server/src/managed-queue/managed-queue.module.ts | `...options` 有 1 个同名定义（各模块各有一个），无法确定归属，不猜未展开 |
| 展开未解析 | `CommandHandlers` | packages/server/src/tenant/tenant.module.ts | `...CommandHandlers` 有 57 个同名定义（各模块各有一个），无法确定归属，不猜未展开 |
| 展开未解析 | `CommandHandlers` | packages/server-ai/src/app.module.ts | `...CommandHandlers` 有 57 个同名定义（各模块各有一个），无法确定归属，不猜未展开 |
| 展开未解析 | `LOCAL_BROWSER_RUNTIME_PROVIDERS` | packages/server-ai/src/sandbox/sandbox.module.ts | `...LOCAL_BROWSER_RUNTIME_PROVIDERS` 的定义不是简单数组（条件表达式/函数返回等），未展开 |
| 展开未解析 | `PluginValidators` | packages/server-ai/src/xpert-agent/xpert-agent.module.ts | `...PluginValidators` 的定义不在扫描范围（跨包/外部依赖？），未展开 |
| 展开未解析 | `Validators` | packages/server-ai/src/xpert-agent/xpert-agent.module.ts | `...Validators` 有 4 个同名定义（各模块各有一个），无法确定归属，不猜未展开 |

---

## 附：业务域分组与专家指认（重建版）

> 本索引于 2026-10-16 环境事故后重建（原语义层含逐卡「职责（AI 语义层）」行与 §5 核实结论，随事故丢失；本节为**最小重建**：业务域分组 + 模块级专家指认。逐卡职责行待后续重放或重生成）。

### 业务域分组（8 个已建专家）

| 业务域 | 专家资产 | 模块 |
|---|---|---|
| 租户与平台设置 | 租户与平台设置专家 | `tenant`、`tenant-setting`、`feature`、`referral`、`custom-smtp`、`email`、`email-template` |
| 身份与权限 | 身份与权限专家 | `auth`、`user`、`user-organization`、`user-group`、`role`、`role-permission`、`organization`、`organization-contact`、`organization-language`、`employee`、`invite`、`api-key`、`secret-token`、`account-binding`、`actor-token`、`password-reset` |
| 模型访问与计费 | 模型访问与计费专家 | `model-access`、`model-execution`、`model-gateway`、`membership`、`copilot`、`copilot-provider`、`copilot-model`、`copilot-user`、`copilot-organization`、`copilot-usage`、`copilot-store`、`copilot-checkpoint`、`copilot-knowledge`、`aimodel` |
| 平台插件与技能 | 平台插件与技能专家 | `plugin`、`plugin-resource`、`skill-package`、`skill-repository`、`skill-repository-index` |
| Assistant 定义与运行时 | Assistant 定义与运行时专家 | `xpert`、`ai`、`enterprise-chatkit`、`xpert-template`、`xpert-workspace`、`assistant-binding`、`xpert-marketplace`、`environment` |
| 对话与会话 | 对话与会话专家 | `chat-conversation`、`chat-group`、`chat`、`chat-message`、`chat-message-feedback`、`conversation-branch`、`conversation-map`、`handoff-queue` |
| 知识库与 RAG | 知识库专家 | `knowledgebase`、`knowledge-document`、`knowledge-wiki`、`knowledge-identity`、`knowledge-processing-lifecycle`、`graphrag`、`rag-vstore`、`rag-web` |
| Agent 编排与执行 | Agent 执行链专家 | `xpert-agent`、`agent-invocation`、`xpert-agent-execution`、`prompt-workflow`、`collaboration`、`agent-middleware-runtime`、`execution-cancel` |

### 尚未建专家的模块（批次 5+ 候选）

`xpert-project`、`agent-evolution`、`xpert-task`、`xpert-toolset`、`mcp-publication`、`mcp`、`connector`、`artifacts`、`sandbox`、`agent-plugin`、`plugin-applications`、`auth(包)`、`integration`、`desktop-shell`、`file-understanding`、`tags`、`view-extension`、`file-memory`、`runtime-control`、`workspace-file-access`、`xpert-table`、`business-area`、`storage-file`、`xpert-tool`、`health`、`export-import`、`initialization`、`language`、`mobile`、`contact`、`country`、`currency`、`data-source`、`（其余约 40 个模块）`

### 专家资产入口

- 索引：`.module-experts/INDEX.md` · 专题总览：`.module-experts/后端专题/T0-专题总览.md`
- 已完成 8 个专家（含 23 个子专家）：租户与平台设置 / 身份与权限 / 模型访问与计费 / 平台插件与技能 / Assistant 定义与运行时 / 对话与会话 / 知识库 / Agent 执行链
- 查询走 `expert-lookup`（专家）与 `ki-search`（记忆）；强关联查询走 `relation-lookup`

### 批次 5 指认（2026-10-16）

- **项目与任务协作专家** ✅：`xpert-project`(122 非 spec · 18 表 · 102 路由) · `xpert-task`(35 · 6 表 · 35 端点) · `business-area`(5 · 1 表)
- **工具与 MCP 专家** ✅：`xpert-toolset`(104) · `xpert-tool`(13) · `mcp`(14，0 表) · `mcp-publication`(43) · `agent-plugin`(50)
- **Agent 演进专家** ✅：`agent-evolution`(44 非 spec / 19 表 / 48 端点)
- **运行时·沙箱·产物专家** ✅：`sandbox`(74) · `runtime-control`(22) · `artifacts`(10) · `workspace-file-access`(8) · `health`(5)
- **文件理解与记忆专家** ✅：`file-understanding`(88) · `file-memory`(24) · `storage-file`(21)
- **平台底座与集成专家** ✅：`data-source`(34) · `ai-model`(28) · `integration`(24) · `xpert-table`(18) · `view-extension`(14) · 字典族(33) · `desktop-shell`(8) · `mobile`(4) · `initialization`(8) · `tags` · `export-import`
