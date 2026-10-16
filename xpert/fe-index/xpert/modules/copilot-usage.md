# CopilotUsageModule（`copilot-usage`）

- **位置**：`packages/server-ai/src/copilot-usage/` · 归属文件 **12** 个 · 约 **2881** 行
- **定义**：`packages/server-ai/src/copilot-usage/copilot-usage.module.ts:15`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `ledger`、`summary`、`totals` 等 5 个 · 视图/接口入口 **12** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-usage/copilot-usage.controller.ts`（CopilotUsageController） | `-` | 12 | `:31` |

## 依赖关系

- **依赖**（改它要连带看）：`MembershipModule`、`TenantModule`
- **被依赖**（动它会影响）：`AgentMiddlewareRuntimeModule`、`CopilotUserModule`、`ServerAIModule`、`XpertAgentExecutionModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `membership_point_ledger` | MembershipPointLedger | 7 | @Module imports forFeature | `packages/server-ai/src/copilot-usage/copilot-usage.service.ts:115` |
| `copilot_user` | CopilotUser | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-usage/copilot-usage.service.ts:111` |
| `copilot_organization` | CopilotOrganization | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-usage/copilot-usage.service.ts:113` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-usage/model-usage/model-usage-ledger.service.ts:62` |
| `model_usage_delivery_receipt` | ModelUsageDeliveryReceipt | 1 | @Module imports forFeature | `-` |

## 守卫/权限

`PermissionGuard`

## 归属文件（12）

- `packages/server-ai/src/copilot-usage/copilot-usage.controller.ts`
- `packages/server-ai/src/copilot-usage/index.ts`
- `packages/server-ai/src/copilot-usage/copilot-usage.module.ts`
- `packages/server-ai/src/copilot-usage/copilot-usage.service.ts`
- `packages/server-ai/src/copilot-usage/copilot-usage.types.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage-ledger.support.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage-read-query.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage-ledger.adapters.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage-delivery-receipt.entity.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage-ledger.service.ts`
- `packages/server-ai/src/copilot-usage/model-usage/execution-usage-filters.ts`
- `packages/server-ai/src/copilot-usage/model-usage/model-usage.utils.ts`
