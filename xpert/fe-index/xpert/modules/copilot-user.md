# CopilotUserModule（`copilot-user`）

- **位置**：`packages/server-ai/src/copilot-user/` · 归属文件 **19** 个 · 约 **1421** 行
- **定义**：`packages/server-ai/src/copilot-user/copilot-user.module.ts:17`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `summary`、`:id` · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-user/copilot-user.controller.ts`（CopilotUserController） | `-` | 5 | `:29` |

## 依赖关系

- **依赖**（改它要连带看）：`CopilotOrganizationModule`、`CopilotUsageModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 9 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`CopilotUserUsageQuery`）
- ← `AgentMiddlewareRuntimeModule`（`CopilotTokenRecordCommand`）
- ← `CopilotModelModule`（`CopilotTokenRecordCommand`）
- ← `KnowledgeDocumentModule`（`CopilotTokenRecordCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`CopilotTokenRecordCommand`）
- ← `KnowledgeWikiModule`（`CopilotTokenRecordCommand`）
- ← `KnowledgebaseModule`（`CopilotTokenRecordCommand`）
- ← `ModelExecutionModule`（`CopilotTokenRecordCommand`）
- ← `ServerAIModule`（`CopilotModelUsageRecordCommand`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_user` | CopilotUser | 7 | @Module imports forFeature | `packages/server-ai/src/copilot-user/copilot-user.service.ts:81` |
| `model_usage_delivery_receipt` | ModelUsageDeliveryReceipt | 2 | @Module imports forFeature | `packages/server-ai/src/copilot-user/copilot-token-usage-delivery.service.ts:47` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`CopilotCheckLimitCommand`、`CopilotTokenRecordCommand`、`CopilotModelUsageRecordCommand`、`CopilotUserUsageQuery`

## 守卫/权限

`PermissionGuard`

## 归属文件（19）

- `packages/server-ai/src/copilot-user/copilot-token-usage-delivery.service.ts`
- `packages/server-ai/src/copilot-user/copilot-user.entity.ts`
- `packages/server-ai/src/copilot-user/copilot-user.module.ts`
- `packages/server-ai/src/copilot-user/index.ts`
- `packages/server-ai/src/copilot-user/copilot-user.service.ts`
- `packages/server-ai/src/copilot-user/copilot-user.controller.ts`
- `packages/server-ai/src/copilot-user/commands/model-usage-record.command.ts`
- `packages/server-ai/src/copilot-user/commands/check-limit.command.ts`
- `packages/server-ai/src/copilot-user/commands/index.ts`
- `packages/server-ai/src/copilot-user/commands/token-record.command.ts`
- `packages/server-ai/src/copilot-user/commands/handlers/check-limit.handler.ts`
- `packages/server-ai/src/copilot-user/commands/handlers/index.ts`
- `packages/server-ai/src/copilot-user/commands/handlers/token-record.handler.ts`
- `packages/server-ai/src/copilot-user/commands/handlers/model-usage-record.handler.ts`
- `packages/server-ai/src/copilot-user/dto/public-copilot-user.ts`
- `packages/server-ai/src/copilot-user/queries/index.ts`
- `packages/server-ai/src/copilot-user/queries/copilot-user-usage.query.ts`
- `packages/server-ai/src/copilot-user/queries/handlers/index.ts`
- `packages/server-ai/src/copilot-user/queries/handlers/copilot-user-usage.handler.ts`
