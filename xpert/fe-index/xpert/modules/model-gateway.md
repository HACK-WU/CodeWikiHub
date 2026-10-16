# ModelGatewayModule（`model-gateway`）

- **位置**：`packages/server-ai/src/model-gateway/` · 归属文件 **20** 个 · 约 **2936** 行
- **定义**：`packages/server-ai/src/model-gateway/model-gateway.module.ts:16`（nestjs）
- **挂载前缀**：`/api/model-gateway`、`/api/openai/v1` · 视图/接口入口 **17** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/model-gateway/model-gateway.controller.ts`（ModelGatewayController） | `model-gateway` | 15 | `:29` |
| `packages/server-ai/src/model-gateway/openai.controller.ts`（ModelGatewayOpenAIController） | `openai/v1` | 2 | `:24` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`MembershipModule`、`ModelAccessModule`
- **被依赖**（动它会影响）：`InitializationModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 数据表（7）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `model_gateway_call` | ModelGatewayCall | 5 | @Module imports forFeature | `packages/server-ai/src/model-gateway/model-gateway.service.ts:115` |
| `tenant_setting` | TenantSetting | 5 | @Module imports forFeature | `packages/server-ai/src/model-gateway/gateway-admission-policy.ts:17` |
| `model_gateway_publication` | ModelGatewayPublication | 3 | @Module imports forFeature | `packages/server-ai/src/model-gateway/model-gateway.service.ts:109` |
| `model_gateway_api_key` | ModelGatewayApiKey | 3 | @Module imports forFeature | `packages/server-ai/src/model-gateway/model-gateway.service.ts:111` |
| `model_gateway_settings` | ModelGatewaySettings | 3 | @Module imports forFeature | `packages/server-ai/src/model-gateway/model-gateway.service.ts:113` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/model-gateway/model-gateway.service.ts:117` |
| `membership_point_ledger` | MembershipPointLedger | 2 | Repository<T> | `packages/server-ai/src/model-gateway/model-gateway-usage.ts:9` |

## 非 HTTP 入口

- **定时任务**：5 处

## 守卫/权限

`PermissionGuard`

## 归属文件（20）

- `packages/server-ai/src/model-gateway/chat-execution.ts`
- `packages/server-ai/src/model-gateway/model-gateway-call.entity.ts`
- `packages/server-ai/src/model-gateway/model-gateway-api-key.entity.ts`
- `packages/server-ai/src/model-gateway/chat-writer.ts`
- `packages/server-ai/src/model-gateway/openai.controller.ts`
- `packages/server-ai/src/model-gateway/model-gateway.support.ts`
- `packages/server-ai/src/model-gateway/model-gateway.i18n.ts`
- `packages/server-ai/src/model-gateway/model-gateway-settings.entity.ts`
- `packages/server-ai/src/model-gateway/index.ts`
- `packages/server-ai/src/model-gateway/model-gateway-publication.entity.ts`
- `packages/server-ai/src/model-gateway/model-gateway-usage.ts`
- `packages/server-ai/src/model-gateway/gateway-admission-policy.ts`
- `packages/server-ai/src/model-gateway/model-gateway.service.ts`
- `packages/server-ai/src/model-gateway/model-gateway-client.ts`
- `packages/server-ai/src/model-gateway/model-gateway.module.ts`
- `packages/server-ai/src/model-gateway/openai-adapter.ts`
- `packages/server-ai/src/model-gateway/model-gateway-call-retention.ts`
- `packages/server-ai/src/model-gateway/model-gateway.controller.ts`
- `packages/server-ai/src/model-gateway/dto/model-gateway.dto.ts`
- `packages/server-ai/src/model-gateway/dto/index.ts`
