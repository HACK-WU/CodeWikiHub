# PluginResourceModule（`plugin-resource`）

- **位置**：`packages/server-ai/src/plugin-resource/` · 归属文件 **47** 个 · 约 **8912** 行
- **定义**：`packages/server-ai/src/plugin-resource/plugin-resource.module.ts:56`（nestjs）
- **挂载前缀**：`/api/plugin-applications`、`/api/plugin/:name/resources`、`/api/xpert-template-installations` · 视图/接口入口 **19** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/plugin-resource/plugin-resource.controller.ts`（PluginResourceController） | `plugin/:name/resources` | 8 | `:28` |
| `packages/server-ai/src/plugin-resource/plugin-application.controller.ts`（PluginApplicationController） | `plugin-applications` | 7 | `:22` |
| `packages/server-ai/src/plugin-resource/template-installation/template-installation.controller.ts`（TemplateInstallationController） | `xpert-template-installations` | 4 | `:16` |

## 依赖关系

- **依赖**（改它要连带看）：`CopilotModule`、`EnvironmentModule`、`KnowledgebaseModule`、`McpPublicationModule`、`SandboxModule`、`SkillPackageModule`、`TenantModule`、`XpertAgentModule`、`XpertModule`、`XpertTemplateModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AgentPluginModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 5 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`AssertAgentPluginTemplateDependencyCommand`、`InstallAgentPluginTemplateResourcesCommand`、`ResolveAgentPluginTemplateDependencyCommand`）
- → `XpertModule`（CQRS：`ResolveAssistantFileAccessCommand`、`XpertPublishCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AgentPluginModule`（`PrepareTemplateExecutionCommand`）
- ← `EnterpriseChatkitModule`（`InstallAssistantDefinitionDependenciesCommand`、`PluginTemplateSyncDependenciesCommand`、`PrepareAssistantDefinitionCommand`、`ReconcileTemplateSkillReferencesCommand`）
- ← `XpertAgentModule`（`AssertAssistantTemplateDependenciesCommand`）
- ← `XpertModule`（`InstallAssistantDefinitionDependenciesCommand`、`PluginTemplateSyncDependenciesCommand`、`PrepareAssistantDefinitionCommand`、`ReconcileTemplateSkillReferencesCommand`）
- ← `XpertTemplateModule`（`InspectTemplateReadinessCommand`、`PluginTemplateInstallCommand`）

## 数据表（11）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `plugin_application_installation` | PluginApplicationInstallation | 13 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-application-suite.service.ts:27` |
| `xpert_toolset` | XpertToolset | 11 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts:220` |
| `plugin_resource_installation` | PluginResourceInstallation | 9 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts:216` |
| `skill_package` | SkillPackage | 5 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts:218` |
| `xpert_workspace` | XpertWorkspace | 5 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-application.service.ts:115` |
| `template_installation` | TemplateInstallationEntity | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/template-installation/template-installation.service.ts:40` |
| `xpert_tool` | XpertTool | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts:222` |
| `knowledgebase` | Knowledgebase | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-application.service.ts:117` |
| `xpert` | Xpert | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/plugin-application.service.ts:119` |
| `mcp_publication` | McpPublication | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/queries/handlers/list-component-states.handler.ts:46` |
| `mcp_publication_access` | McpPublicationAccess | 3 | @Module imports forFeature | `packages/server-ai/src/plugin-resource/queries/handlers/list-component-states.handler.ts:48` |

## 非 HTTP 入口

- **CQRS Handler**（9）：`PluginTemplateInstallCommand`、`PluginTemplateSyncDependenciesCommand`、`ListPluginResourceComponentStatesQuery`、`PrepareAssistantDefinitionCommand`、`InstallAssistantDefinitionDependenciesCommand`、`ReconcileTemplateSkillReferencesCommand` 等 9

## 守卫/权限

`RoleGuard`

## 归属文件（47）

- `packages/server-ai/src/plugin-resource/plugin-resource.controller.ts`
- `packages/server-ai/src/plugin-resource/plugin-application-suite.service.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource-components.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts`
- `packages/server-ai/src/plugin-resource/plugin-application-suite.ts`
- `packages/server-ai/src/plugin-resource/plugin-application.controller.ts`
- `packages/server-ai/src/plugin-resource/plugin-application.service.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource-installation-scope.ts`
- `packages/server-ai/src/plugin-resource/index.ts`
- `packages/server-ai/src/plugin-resource/plugin-mcp-server.service.ts`
- `packages/server-ai/src/plugin-resource/plugin-application-assets.ts`
- `packages/server-ai/src/plugin-resource/plugin-application-composition.ts`
- `packages/server-ai/src/plugin-resource/effective-loaded-plugins.ts`
- `packages/server-ai/src/plugin-resource/plugin-mcp-server-contract.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource.module.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource-app-status.ts`
- `packages/server-ai/src/plugin-resource/plugin-resource-installation.entity.ts`
- `packages/server-ai/src/plugin-resource/plugin-hooks.middleware.ts`
- `packages/server-ai/src/plugin-resource/plugin-application-installation.entity.ts`
- `packages/server-ai/src/plugin-resource/application-setup/plugin-application-setup.service.ts`
- `packages/server-ai/src/plugin-resource/application-setup/application-setup.schema.ts`
- `packages/server-ai/src/plugin-resource/application-toolsets/toolset-requirements.ts`
- `packages/server-ai/src/plugin-resource/application-toolsets/application-initialize.schema.ts`
- `packages/server-ai/src/plugin-resource/application-toolsets/plugin-application-toolsets.service.ts`
- `packages/server-ai/src/plugin-resource/commands/install-template.handler.ts`
- `packages/server-ai/src/plugin-resource/commands/install-template.command.ts`
- `packages/server-ai/src/plugin-resource/commands/assistant-template-toolset-binder.service.ts`
- `packages/server-ai/src/plugin-resource/commands/sync-template-dependencies.handler.ts`
- `packages/server-ai/src/plugin-resource/commands/sync-template-dependencies.command.ts`
- `packages/server-ai/src/plugin-resource/commands/template-runtime-dependencies.ts`
- `packages/server-ai/src/plugin-resource/queries/index.ts`
- `packages/server-ai/src/plugin-resource/queries/list-component-states.query.ts`
- `packages/server-ai/src/plugin-resource/queries/handlers/index.ts`
- `packages/server-ai/src/plugin-resource/queries/handlers/list-component-states.handler.ts`
- `packages/server-ai/src/plugin-resource/template-installation/template-manifest-check.ts`
- `packages/server-ai/src/plugin-resource/template-installation/template-dependency-installer.service.ts`
- `packages/server-ai/src/plugin-resource/template-installation/template-installation.schema.ts`
- `packages/server-ai/src/plugin-resource/template-installation/assistant-definition-import.handler.ts`
- `packages/server-ai/src/plugin-resource/template-installation/template-installation.entity.ts`
- `packages/server-ai/src/plugin-resource/template-installation/reconcile-template-skills.handler.ts`
- ……其余 7 个见 JSON 输出（完整清单）
