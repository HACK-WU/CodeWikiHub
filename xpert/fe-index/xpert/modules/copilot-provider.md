# CopilotProviderModule（`copilot-provider`）

- **位置**：`packages/server-ai/src/copilot-provider/` · 归属文件 **24** 个 · 约 **1063** 行
- **定义**：`packages/server-ai/src/copilot-provider/copilot-provider.module.ts:18`（nestjs）
- **挂载前缀**：`/api/:providerId/model-discovery` · 视图/接口入口 **11** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-provider/model-discovery/model-discovery.controller.ts`（ModelDiscoveryController） | `:providerId/model-discovery` | 2 | `:7` |
| `packages/server-ai/src/copilot-provider/copilot-provider.controller.ts`（CopilotProviderController） | `-` | 9 | `:53` |

## 依赖关系

- **依赖**（改它要连带看）：`AIModelModule`、`ModelAccessModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`CopilotModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 3 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AIModelModule`（CQRS：`AiProviderCredentialsValidateCommand`、`ListBuiltinModelsQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`GetAiProviderCredentialsQuery`）
- ← `AgentMiddlewareRuntimeModule`（`GetCopilotProviderModelQuery`）
- ← `CopilotModelModule`（`GetCopilotProviderModelQuery`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_provider_model` | CopilotProviderModel | 4 | @Module imports forFeature | `packages/server-ai/src/copilot-provider/model-discovery/model-discovery.service.ts:32` |
| `copilot_provider` | CopilotProvider | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-provider/copilot-provider.service.ts:10` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`CopilotProviderUpsertCommand`、`GetCopilotProviderModelQuery`、`CopilotProviderModelParameterRulesQuery`、`GetAiProviderCredentialsQuery`

## 守卫/权限

`PermissionGuard`

## 归属文件（24）

- `packages/server-ai/src/copilot-provider/copilot-provider.entity.ts`
- `packages/server-ai/src/copilot-provider/index.ts`
- `packages/server-ai/src/copilot-provider/copilot-provider.module.ts`
- `packages/server-ai/src/copilot-provider/copilot-provider.service.ts`
- `packages/server-ai/src/copilot-provider/copilot-provider.controller.ts`
- `packages/server-ai/src/copilot-provider/commands/upsert.command.ts`
- `packages/server-ai/src/copilot-provider/commands/index.ts`
- `packages/server-ai/src/copilot-provider/commands/handlers/upsert.handler.ts`
- `packages/server-ai/src/copilot-provider/commands/handlers/index.ts`
- `packages/server-ai/src/copilot-provider/dto/copilot-provider-public.dto.ts`
- `packages/server-ai/src/copilot-provider/dto/index.ts`
- `packages/server-ai/src/copilot-provider/dto/copilot-provider.dto.ts`
- `packages/server-ai/src/copilot-provider/model-discovery/model-discovery.controller.ts`
- `packages/server-ai/src/copilot-provider/model-discovery/model-discovery.service.ts`
- `packages/server-ai/src/copilot-provider/models/copilot-provider-model.entity.ts`
- `packages/server-ai/src/copilot-provider/models/copilot-provider-model.service.ts`
- `packages/server-ai/src/copilot-provider/queries/get-model.query.ts`
- `packages/server-ai/src/copilot-provider/queries/index.ts`
- `packages/server-ai/src/copilot-provider/queries/model-parameter-rules.query.ts`
- `packages/server-ai/src/copilot-provider/queries/get-credentials.query.ts`
- `packages/server-ai/src/copilot-provider/queries/handlers/get-model.handler.ts`
- `packages/server-ai/src/copilot-provider/queries/handlers/model-parameter-rules.handler.ts`
- `packages/server-ai/src/copilot-provider/queries/handlers/index.ts`
- `packages/server-ai/src/copilot-provider/queries/handlers/get-credentials.handler.ts`
