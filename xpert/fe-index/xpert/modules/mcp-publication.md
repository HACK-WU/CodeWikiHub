# McpPublicationModule（`mcp-publication`）

- **位置**：`packages/server-ai/src/mcp-publication/` · 归属文件 **43** 个 · 约 **8445** 行
- **定义**：`packages/server-ai/src/mcp-publication/mcp-publication.module.ts:29`（nestjs）
- **挂载前缀**：`/api/.well-known/oauth-protected-resource`、`/api/mcp/p` · 视图/接口入口 **26** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/mcp-publication/mcp-publication.controller.ts`（McpPublicationController） | `mcp/p` | 1 | `:9` |
| `packages/server-ai/src/mcp-publication/mcp-publication-management.controller.ts`（McpPublicationManagementController） | `-` | 22 | `:40` |
| `packages/server-ai/src/mcp-publication/mcp-oauth-metadata.controller.ts`（McpOAuthMetadataController） | `.well-known/oauth-protected-resource` | 1 | `:12` |
| `packages/server-ai/src/mcp-publication/mcp-files.controller.ts`（McpFilesController） | `mcp/p` | 2 | `:31` |

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`WorkspaceFilesRuntimeModule`、`XpertToolsetModule`
- **被依赖**（动它会影响）：`PluginResourceModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`McpPublication`、`McpCapabilityCatalog`、`McpPublicationCapability`、`McpPublicationAccess`、`McpApiKey`、`McpOAuthPolicy`、`McpInvocationAudit`、`McpTask`

## 数据表（10）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `mcp_publication_capability` | McpPublicationCapability | 6 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:49` |
| `user` | User | 5 | @Module imports forFeature | `packages/server-ai/src/mcp-publication/mcp-publication-authorization.service.ts:13` |
| `mcp_publication` | McpPublication | 5 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:47` |
| `mcp_capability_catalog` | McpCapabilityCatalog | 4 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:51` |
| `mcp_api_key` | McpApiKey | 4 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:55` |
| `mcp_oauth_policy` | McpOAuthPolicy | 4 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:57` |
| `mcp_invocation_audit` | McpInvocationAudit | 4 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:59` |
| `xpert_toolset` | XpertToolset | 3 | @Module imports forFeature | `packages/server-ai/src/mcp-publication/mcp-publication.service.ts:53` |
| `mcp_task` | McpTask | 2 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-task.service.ts:103` |
| `mcp_publication_access` | McpPublicationAccess | 2 | @InjectRepository | `packages/server-ai/src/mcp-publication/mcp-publication-access.service.ts:12` |

## 守卫/权限

`McpFilesGuard`、`RoleGuard`

## 归属文件（43）

- `packages/server-ai/src/mcp-publication/mcp-publication.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-legacy-sessions.ts`
- `packages/server-ai/src/mcp-publication/mcp-runtime-configuration.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication-authorization.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication.dto.ts`
- `packages/server-ai/src/mcp-publication/mcp-task.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-oauth-feature.ts`
- `packages/server-ai/src/mcp-publication/mcp-rate-limit.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-task-execution.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication-url.ts`
- `packages/server-ai/src/mcp-publication/mcp-legacy-publication-context.ts`
- `packages/server-ai/src/mcp-publication/mcp-api-key.service.ts`
- `packages/server-ai/src/mcp-publication/index.ts`
- `packages/server-ai/src/mcp-publication/mcp-subscription.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-files.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication.module.ts`
- `packages/server-ai/src/mcp-publication/mcp-oauth-metadata.controller.ts`
- `packages/server-ai/src/mcp-publication/mcp-runtime-registration.ts`
- `packages/server-ai/src/mcp-publication/mcp-files.controller.ts`
- `packages/server-ai/src/mcp-publication/mcp-runtime-protocol.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication-access.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-task.processor.ts`
- `packages/server-ai/src/mcp-publication/mcp-app-bundle.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-capability-catalog.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-elicitation.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-app-tool-result.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication-management.controller.ts`
- `packages/server-ai/src/mcp-publication/mcp-oauth.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-authentication.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-input-schema.ts`
- `packages/server-ai/src/mcp-publication/mcp-resource-uri-template.ts`
- `packages/server-ai/src/mcp-publication/mcp-invocation-audit.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication-runtime.service.ts`
- `packages/server-ai/src/mcp-publication/mcp-publication.controller.ts`
- `packages/server-ai/src/mcp-publication/entities/mcp-publication-capability.entity.ts`
- `packages/server-ai/src/mcp-publication/entities/mcp-api-key.entity.ts`
- `packages/server-ai/src/mcp-publication/entities/mcp-invocation-audit.entity.ts`
- `packages/server-ai/src/mcp-publication/entities/mcp-publication.entity.ts`
- `packages/server-ai/src/mcp-publication/entities/index.ts`
- `packages/server-ai/src/mcp-publication/entities/mcp-capability-catalog.entity.ts`
- ……其余 3 个见 JSON 输出（完整清单）
