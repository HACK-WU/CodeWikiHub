# XpertToolsetModule（`xpert-toolset`）

- **位置**：`packages/server-ai/src/xpert-toolset/` · 归属文件 **109** 个 · 约 **16301** 行
- **定义**：`packages/server-ai/src/xpert-toolset/xpert-toolset.module.ts:43`（nestjs）
- **挂载前缀**：`/api/mcp-apps`、`/api/mcp-consumer`、`/api/mcp-consumer/oauth` 等 4 个 · 视图/接口入口 **33** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-toolset/xpert-toolset.controller.ts`（XpertToolsetController） | `-` | 18 | `:69` |
| `packages/server-ai/src/xpert-toolset/mcp-apps.controller.ts`（McpAppsController） | `mcp-apps` | 7 | `:10` |
| `packages/server-ai/src/xpert-toolset/mcp-runtime.controller.ts`（McpRuntimeController） | `operations/mcp-runtimes` | 3 | `:10` |
| `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.controller.ts`（McpConsumerOAuthController） | `mcp-consumer/oauth` | 4 | `:24` |
| `packages/server-ai/src/mcp-consumer/mcp-consumer-capabilities.controller.ts`（McpConsumerCapabilitiesController） | `mcp-consumer` | 1 | `:7` |

## 依赖关系

- **依赖**（改它要连带看）：`ChatMessageModule`、`CopilotModule`、`RedisModule`、`TenantModule`、`XpertAgentModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatModule`、`McpPublicationModule`、`PluginResourceModule`、`ServerAIModule`、`XpertModule`、`XpertToolModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `EnvironmentModule`（CQRS：`EnvStateQuery`）
- → `XpertToolModule`（CQRS：`TestOpenAPICommand`）

## 数据表（9）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_toolset` | XpertToolset | 7 | @Module imports forFeature | `packages/server-ai/src/xpert-toolset/xpert-toolset.service.ts:69` |
| `mcp_runtime_instance` | McpRuntimeInstanceEntity | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-toolset/mcp-runtime-audit.service.ts:171` |
| `plugin_resource_installation` | PluginResourceInstallation | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-toolset/mcp-runtime-audit.service.ts:173` |
| `mcp_capability_catalog` | McpCapabilityCatalog | 3 | @Module imports forFeature | `packages/server-ai/src/tool-runtime/tool-runtime.service.ts:145` |
| `mcp_publication_capability` | McpPublicationCapability | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-publication/mcp-subscription.service.ts:52` |
| `mcp_app_audit` | McpAppAudit | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-app-runtime/mcp-app-audit.service.ts:40` |
| `mcp_app_history` | McpAppHistory | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-app-runtime/mcp-app-history-store.service.ts:17` |
| `xpert_mcp_consumer_oauth_credential` | McpConsumerOAuthCredential | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts:49` |
| `xpert_mcp_consumer_oauth_session` | McpConsumerOAuthSession | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-consumer/auth/mcp-consumer-oauth.service.ts:51` |

## 非 HTTP 入口

- **CQRS Handler**（12）：`ToolsetGetToolsCommand`、`MCPToolsBySchemaCommand`、`CreateToolsetCommand`、`ParserODataSchemaCommand`、`ParserOpenAPISchemaCommand`、`ListBuiltinCredentialsSchemaQuery` 等 12

## 守卫/权限

`WorkspaceAuthoringGuard`、`ToolsetGuard`、`WorkspaceOwnerGuard`、`WorkspaceGuard`

## 归属文件（109）

- `packages/server-ai/src/xpert-toolset/mcp-runtime-audit.service.ts`
- `packages/server-ai/src/xpert-toolset/xpert-toolset.service.ts`
- `packages/server-ai/src/xpert-toolset/mcp-apps.controller.ts`
- `packages/server-ai/src/xpert-toolset/errors.ts`
- `packages/server-ai/src/xpert-toolset/index.ts`
- `packages/server-ai/src/xpert-toolset/toolset.ts`
- `packages/server-ai/src/xpert-toolset/mcp-runtime-instance.entity.ts`
- `packages/server-ai/src/xpert-toolset/types.ts`
- `packages/server-ai/src/xpert-toolset/xpert-toolset.module.ts`
- `packages/server-ai/src/xpert-toolset/mcp-runtime.controller.ts`
- `packages/server-ai/src/xpert-toolset/xpert-toolset.controller.ts`
- `packages/server-ai/src/xpert-toolset/xpert-toolset.entity.ts`
- `packages/server-ai/src/xpert-toolset/xpert-toolset.subscriber.ts`
- `packages/server-ai/src/xpert-toolset/mcp-apps.service.ts`
- `packages/server-ai/src/xpert-toolset/commands/mcp-tools-schema.command.ts`
- `packages/server-ai/src/xpert-toolset/commands/parser-odata-schema.command.ts`
- `packages/server-ai/src/xpert-toolset/commands/get-tools.command.ts`
- `packages/server-ai/src/xpert-toolset/commands/index.ts`
- `packages/server-ai/src/xpert-toolset/commands/create-toolset.command.ts`
- `packages/server-ai/src/xpert-toolset/commands/parser-openapi-schema.command.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/get-tools.handler.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/mcp-tools-schema.handler.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/create-toolset.handler.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/parser-odata-schema.handler.ts`
- `packages/server-ai/src/xpert-toolset/commands/handlers/parser-openapi-schema.handler.ts`
- `packages/server-ai/src/xpert-toolset/dto/toolset-public.dto.ts`
- `packages/server-ai/src/xpert-toolset/dto/index.ts`
- `packages/server-ai/src/xpert-toolset/dto/tool-provider.dto.ts`
- `packages/server-ai/src/xpert-toolset/guards/toolset.guard.ts`
- `packages/server-ai/src/xpert-toolset/provider/index.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/builtin-toolset.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/index.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/builtin-tool.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/bing/bing.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/dingtalk/dingtalk.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/discord/discord.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/email/email.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/email/types.ts`
- `packages/server-ai/src/xpert-toolset/provider/builtin/email/tools/send_mail.ts`
- ……其余 69 个见 JSON 输出（完整清单）
