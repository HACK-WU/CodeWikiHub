# AgentPluginModule（`agent-plugin`）

- **位置**：`packages/server-ai/src/agent-plugin/` · 归属文件 **50** 个 · 约 **5360** 行
- **定义**：`packages/server-ai/src/agent-plugin/agent-plugin.module.ts:36`（nestjs）
- **挂载前缀**：`/api/agent-plugins` · 视图/接口入口 **22** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/agent-plugin/agent-plugin.controller.ts`（AgentPluginController） | `agent-plugins` | 12 | `:62` |
| `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-maintenance.controller.ts`（AgentPluginMaintenanceController） | `agent-plugins` | 4 | `:9` |
| `packages/server-ai/src/agent-plugin/runtime-resource.controller.ts` | `-` | 6 | `:33` |

## 依赖关系

- **依赖**（改它要连带看）：`ConnectorModule`、`PluginResourceModule`
- **被依赖**（动它会影响）：`ChatGroupModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 6 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `PluginResourceModule`（CQRS：`PrepareTemplateExecutionCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ConnectorModule`（`ResolvePluginConnectorsQuery`）
- ← `PluginModule`（`ImportDefaultAgentPluginsCommand`）
- ← `PluginResourceModule`（`AssertAgentPluginTemplateDependencyCommand`、`InstallAgentPluginTemplateResourcesCommand`、`ResolveAgentPluginTemplateDependencyCommand`）
- ← `SuperAdminOrganizationScopeModule`（`ResourceSkillInstructionsQuery`）
- ← `XpertAgentModule`（`AuthorizeTemplateExecutionCommand`、`ResolveTemplateExecutionCommand`）
- ← `XpertTemplateModule`（`AgentPluginTemplatesCommand`）

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `agent_plugin_package` | AgentPluginPackage | 13 | @Module imports forFeature | `packages/server-ai/src/agent-plugin/agent-plugin.service.ts:69` |
| `agent_resource_binding` | AgentResourceBinding | 10 | @Module imports forFeature | `packages/server-ai/src/agent-plugin/agent-plugin.service.ts:70` |
| `tenant_setting` | TenantSetting | 4 | getRepository | `packages/server-ai/src/agent-plugin/defaults/default-agent-plugins.store.ts:64` |
| `xpert_toolset` | XpertToolset | 2 | getRepository | `packages/server-ai/src/agent-plugin/agent-plugin-installations.service.ts:289` |
| `skill_package` | SkillPackage | 1 | getRepository | `packages/server-ai/src/agent-plugin/agent-plugin-installations.service.ts:284` |

## 非 HTTP 入口

- **CQRS Handler**（9）：`ResourceSkillInstructionsQuery`、`ImportDefaultAgentPluginsCommand`、`ResolvePluginConnectorsQuery`、`AgentPluginTemplatesCommand`、`ResolveAgentPluginTemplateDependencyCommand`、`AssertAgentPluginTemplateDependencyCommand` 等 9

## 守卫/权限

`ApiKeyOrClientSecretAuthGuard`

## 归属文件（50）

- `packages/server-ai/src/agent-plugin/published-resource-version.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin.controller.ts`
- `packages/server-ai/src/agent-plugin/installed-plugin-catalog.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-connector.schema.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource-skill-file.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource-discovery.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin.service.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-installations.service.ts`
- `packages/server-ai/src/agent-plugin/runtime-middleware-config.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-connector-providers.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource.controller.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin.entity.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-parser.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin.module.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-mcp.ts`
- `packages/server-ai/src/agent-plugin/workspace-plugin-catalog.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-connector.service.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource-context.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-source.ts`
- `packages/server-ai/src/agent-plugin/agent-plugin-scope.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource-graph.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource.service.ts`
- `packages/server-ai/src/agent-plugin/runtime-resource-selection.ts`
- `packages/server-ai/src/agent-plugin/commands/resource-skill-instructions.query.ts`
- `packages/server-ai/src/agent-plugin/commands/agent-plugin-commands.schema.ts`
- `packages/server-ai/src/agent-plugin/commands/resource-skill-instructions.handler.ts`
- `packages/server-ai/src/agent-plugin/commands/runtime-resource-commands.service.ts`
- `packages/server-ai/src/agent-plugin/defaults/default-agent-plugins.importer.ts`
- `packages/server-ai/src/agent-plugin/defaults/default-agent-plugins.schema.ts`
- `packages/server-ai/src/agent-plugin/defaults/default-agent-plugins.store.ts`
- `packages/server-ai/src/agent-plugin/defaults/default-agent-plugins.service.ts`
- `packages/server-ai/src/agent-plugin/defaults/import-default-agent-plugins.handler.ts`
- `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-update.service.ts`
- `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-maintenance.controller.ts`
- `packages/server-ai/src/agent-plugin/maintenance/package-storage.ts`
- `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-cleanup.service.ts`
- `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-maintenance.schema.ts`
- `packages/server-ai/src/agent-plugin/maintenance/package-garbage.ts`
- `packages/server-ai/src/agent-plugin/maintenance/agent-plugin-update.store.ts`
- `packages/server-ai/src/agent-plugin/maintenance/activate-package.ts`
- ……其余 10 个见 JSON 输出（完整清单）
