# CopilotModule（`copilot`）

- **位置**：`packages/server-ai/src/copilot/` · 归属文件 **32** 个 · 约 **1891** 行
- **定义**：`packages/server-ai/src/copilot/copilot.module.ts:18`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `primary`、`availables`、`model-select-options` 等 5 个 · 视图/接口入口 **24** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot/copilot.controller.ts`（CopilotController） | `-` | 24 | `:66` |

## 依赖关系

- **依赖**（改它要连带看）：`AIModelModule`、`CopilotProviderModule`、`MembershipModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`AgentMiddlewareRuntimeModule`、`ChatModule`、`CopilotKnowledgeModule`、`KnowledgeDocumentModule`、`KnowledgebaseModule`、`PluginResourceModule`、`ServerAIModule`、`XpertToolsetModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 12 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`StatisticsAverageSessionInteractionsQuery`、`StatisticsDailyConvQuery`、`StatisticsDailyEndUsersQuery`、`StatisticsDailyMessagesQuery`、`StatisticsModelsQuery`、`StatisticsTokenCostQuery` 等 8 个）
- → `CopilotOrganizationModule`（CQRS：`GetCopilotOrgUsageQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`CopilotGetOneQuery`）
- ← `AgentMiddlewareRuntimeModule`（`CopilotGetOneQuery`）
- ← `ChatModule`（`CopilotGetChatQuery`、`CopilotGetOneQuery`）
- ← `CopilotKnowledgeModule`（`CopilotOneByRoleQuery`）
- ← `CopilotModelModule`（`CopilotGetOneQuery`）
- ← `CopilotUserModule`（`CopilotGetOneQuery`）
- ← `EnterpriseChatkitModule`（`CopilotGetOneQuery`、`CopilotOneByRoleQuery`、`FindCopilotModelsQuery`）
- ← `InitializationModule`（`CopilotOneByRoleQuery`、`FindCopilotModelsQuery`）
- ← `KnowledgebaseModule`（`CopilotGetOneQuery`）
- ← `SuperAdminOrganizationScopeModule`（`CopilotGetOneQuery`、`CopilotOneByRoleQuery`）
- ← `XpertAgentModule`（`CopilotGetOneQuery`）
- ← `XpertModule`（`CopilotGetOneQuery`、`CopilotOneByRoleQuery`、`FindCopilotModelsQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot` | Copilot | 5 | @Module imports forFeature | `packages/server-ai/src/copilot/copilot.service.ts:41` |

## 非 HTTP 入口

- **CQRS Handler**（6）：`GeneratePromptCommand`、`CopilotGetOneQuery`、`ModelParameterRulesQuery`、`CopilotOneByRoleQuery`、`CopilotGetChatQuery`、`FindCopilotModelsQuery`

## 守卫/权限

`PermissionGuard`

## 归属文件（32）

- `packages/server-ai/src/copilot/primary-model-smoke.service.ts`
- `packages/server-ai/src/copilot/utils.ts`
- `packages/server-ai/src/copilot/index.ts`
- `packages/server-ai/src/copilot/copilot.service.ts`
- `packages/server-ai/src/copilot/copilot.controller.ts`
- `packages/server-ai/src/copilot/copilot.entity.ts`
- `packages/server-ai/src/copilot/llm.ts`
- `packages/server-ai/src/copilot/copilot.module.ts`
- `packages/server-ai/src/copilot/commands/index.ts`
- `packages/server-ai/src/copilot/commands/generate-prompt.command.ts`
- `packages/server-ai/src/copilot/commands/handlers/index.ts`
- `packages/server-ai/src/copilot/commands/handlers/generate-prompt.handler.ts`
- `packages/server-ai/src/copilot/dto/copilot.dto.ts`
- `packages/server-ai/src/copilot/dto/index.ts`
- `packages/server-ai/src/copilot/dto/copilot-with-provider.ts`
- `packages/server-ai/src/copilot/dto/public-ai-model.ts`
- `packages/server-ai/src/copilot/dto/provider-with-models.ts`
- `packages/server-ai/src/copilot/graph/index.ts`
- `packages/server-ai/src/copilot/graph/react_agent_executor.ts`
- `packages/server-ai/src/copilot/graph/types.ts`
- `packages/server-ai/src/copilot/queries/copilot-model-find.query.ts`
- `packages/server-ai/src/copilot/queries/index.ts`
- `packages/server-ai/src/copilot/queries/get-chat-copilot.query.ts`
- `packages/server-ai/src/copilot/queries/get-one.query.ts`
- `packages/server-ai/src/copilot/queries/get-one-by-role.query.ts`
- `packages/server-ai/src/copilot/queries/model-parameter-rules.query.ts`
- `packages/server-ai/src/copilot/queries/handlers/get-one.handler.ts`
- `packages/server-ai/src/copilot/queries/handlers/model-parameter-rules.handler.ts`
- `packages/server-ai/src/copilot/queries/handlers/index.ts`
- `packages/server-ai/src/copilot/queries/handlers/get-one-by-role.handler.ts`
- `packages/server-ai/src/copilot/queries/handlers/get-chat-copilot.handler.ts`
- `packages/server-ai/src/copilot/queries/handlers/copilot-model-find.handler.ts`
