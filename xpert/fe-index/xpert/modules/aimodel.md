# AIModelModule（`aimodel`）

- **位置**：`packages/server-ai/src/ai-model/` · 归属文件 **28** 个 · 约 **586** 行
- **定义**：`packages/server-ai/src/ai-model/ai-model.module.ts:10`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `provider` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/ai-model/ai-model.controller.ts`（AIModelController） | `-` | 1 | `:11` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`CopilotModule`、`CopilotProviderModule`、`ModelAccessModule`
- **依赖的库/框架模块**：`RouterModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `CopilotProviderModule`（`AiProviderCredentialsValidateCommand`、`ListBuiltinModelsQuery`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（5）：`AiProviderCredentialsValidateCommand`、`ListModelProvidersQuery`、`ListBuiltinModelsQuery`、`AIModelGetIconQuery`、`AIModelGetProviderQuery`

## 归属文件（28）

- `packages/server-ai/src/ai-model/ai-model.service.ts`
- `packages/server-ai/src/ai-model/ai-model.module.ts`
- `packages/server-ai/src/ai-model/ai-model.controller.ts`
- `packages/server-ai/src/ai-model/index.ts`
- `packages/server-ai/src/ai-model/commands/index.ts`
- `packages/server-ai/src/ai-model/commands/provider-credentials-validate.command.ts`
- `packages/server-ai/src/ai-model/commands/handlers/provider-credentials-validate.handler.ts`
- `packages/server-ai/src/ai-model/commands/handlers/index.ts`
- `packages/server-ai/src/ai-model/dto/provider-identi.dto.ts`
- `packages/server-ai/src/ai-model/dto/index.ts`
- `packages/server-ai/src/ai-model/dto/model-settings.dto.ts`
- `packages/server-ai/src/ai-model/dto/provider.dto.ts`
- `packages/server-ai/src/ai-model/dto/model-with-provider.dto.ts`
- `packages/server-ai/src/ai-model/queries/get-model-icon.query.ts`
- `packages/server-ai/src/ai-model/queries/list-providers.query.ts`
- `packages/server-ai/src/ai-model/queries/index.ts`
- `packages/server-ai/src/ai-model/queries/list-builtin-models.query.ts`
- `packages/server-ai/src/ai-model/queries/get-provider.query.ts`
- `packages/server-ai/src/ai-model/queries/handlers/list-providers.handler.ts`
- `packages/server-ai/src/ai-model/queries/handlers/list-builtin-models.handler.ts`
- `packages/server-ai/src/ai-model/queries/handlers/get-model-icon.handler.ts`
- `packages/server-ai/src/ai-model/queries/handlers/index.ts`
- `packages/server-ai/src/ai-model/queries/handlers/get-provider.handler.ts`
- `packages/server-ai/src/ai-model/schema_validators/common_validator.ts`
- `packages/server-ai/src/ai-model/schema_validators/index.ts`
- `packages/server-ai/src/ai-model/schema_validators/provider_credential_schema_validator.ts`
- `packages/server-ai/src/ai-model/schema_validators/model_credential_schema_validator.ts`
- `packages/plugin-sdk/src/lib/ai-model/ai-model-provider.registry.ts`
