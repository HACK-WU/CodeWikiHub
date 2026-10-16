# ApiKeyModule（`api-key`）

- **位置**：`packages/server/src/api-key/` · 归属文件 **16** 个 · 约 **815** 行
- **定义**：`packages/server/src/api-key/api-key.module.ts:15`（nestjs）
- **挂载前缀**：`/api/personal` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/api-key/personal-api-key/personal-api-key.controller.ts`（PersonalApiKeyController） | `personal` | 3 | `:20` |
| `packages/server/src/api-key/api-key.controller.ts`（ApiKeyController） | `-` | 0 | `:8` |

## 依赖关系

- **依赖**（改它要连带看）：`IntegrationModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`SecretTokenModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `api_key` | ApiKey | 5 | @Module imports forFeature | `packages/server/src/api-key/api-key.service.ts:50` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`UseApiKeyQuery`、`FindApiKeyQuery`

## 归属文件（16）

- `packages/server/src/api-key/api-key.controller.ts`
- `packages/server/src/api-key/api-key.entity.ts`
- `packages/server/src/api-key/api-key-principal.ts`
- `packages/server/src/api-key/index.ts`
- `packages/server/src/api-key/api-key.strategy.ts`
- `packages/server/src/api-key/api-key.service.ts`
- `packages/server/src/api-key/api-key.module.ts`
- `packages/server/src/api-key/personal-api-key/personal-api-key.controller.ts`
- `packages/server/src/api-key/personal-api-key/personal-api-key-token.ts`
- `packages/server/src/api-key/personal-api-key/personal-api-key.schema.ts`
- `packages/server/src/api-key/queries/index.ts`
- `packages/server/src/api-key/queries/api-key.use.query.ts`
- `packages/server/src/api-key/queries/api-key.find.query.ts`
- `packages/server/src/api-key/queries/handlers/index.ts`
- `packages/server/src/api-key/queries/handlers/api-key.use.handler.ts`
- `packages/server/src/api-key/queries/handlers/api-key.find.handler.ts`
