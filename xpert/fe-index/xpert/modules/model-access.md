# ModelAccessModule（`model-access`）

- **位置**：`packages/server-ai/src/model-access/` · 归属文件 **10** 个 · 约 **3958** 行
- **定义**：`packages/server-ai/src/model-access/model-access.module.ts:18`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `catalog`、`requests`、`grants` 等 4 个 · 视图/接口入口 **12** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/model-access/model-access.controller.ts`（ModelAccessController） | `-` | 12 | `:25` |

## 依赖关系

- **依赖**（改它要连带看）：`AIModelModule`、`MembershipModule`、`RedisModule`
- **被依赖**（动它会影响）：`CopilotModule`、`CopilotProviderModule`、`CopilotUserModule`、`InitializationModule`、`ModelExecutionModule`、`ModelGatewayModule`、`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（9）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user_model_grant` | UserModelGrant | 19 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:171` |
| `model_access_request` | ModelAccessRequest | 16 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:169` |
| `model_access_event` | ModelAccessEvent | 8 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:173` |
| `model_gateway_publication` | ModelGatewayPublication | 4 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:175` |
| `user` | User | 4 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:181` |
| `organization` | Organization | 4 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:183` |
| `feature_organization` | FeatureOrganization | 4 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:185` |
| `copilot` | Copilot | 3 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:177` |
| `copilot_provider_model` | CopilotProviderModel | 3 | @Module imports forFeature | `packages/server-ai/src/model-access/model-access.service.ts:179` |

## 非 HTTP 入口

- **定时任务**：1 处

## 守卫/权限

`PermissionGuard`

## 归属文件（10）

- `packages/server-ai/src/model-access/model-access-scheduler.service.ts`
- `packages/server-ai/src/model-access/model-access-request.entity.ts`
- `packages/server-ai/src/model-access/model-access.controller.ts`
- `packages/server-ai/src/model-access/model-access.module.ts`
- `packages/server-ai/src/model-access/index.ts`
- `packages/server-ai/src/model-access/model-access-event.entity.ts`
- `packages/server-ai/src/model-access/model-access.service.ts`
- `packages/server-ai/src/model-access/user-model-grant.entity.ts`
- `packages/server-ai/src/model-access/dto/index.ts`
- `packages/server-ai/src/model-access/dto/model-access.dto.ts`
