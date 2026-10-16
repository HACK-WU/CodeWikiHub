# MembershipModule（`membership`）

- **位置**：`packages/server-ai/src/membership/` · 归属文件 **14** 个 · 约 **7056** 行
- **定义**：`packages/server-ai/src/membership/membership.module.ts:27`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `me`、`scope`、`plans` 等 4 个 · 视图/接口入口 **29** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/membership/membership.controller.ts`（MembershipController） | `-` | 29 | `:25` |

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`TenantModule`
- **被依赖**（动它会影响）：`CopilotModule`、`CopilotUsageModule`、`InitializationModule`、`ModelAccessModule`、`ModelGatewayModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`BullModule`、`MEMBERSHIP_MAINTENANCE_QUEUE`、`CqrsModule`

## 数据表（11）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user_membership` | UserMembership | 30 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:216` |
| `membership_plan` | MembershipPlan | 19 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:214` |
| `user_membership_period` | MembershipPeriod | 17 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:236` |
| `membership_point_ledger` | MembershipPointLedger | 11 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:218` |
| `user_organization` | UserOrganization | 6 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:225` |
| `tenant_setting` | TenantSetting | 5 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:234` |
| `xpert` | Xpert | 4 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:220` |
| `copilot` | Copilot | 4 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:228` |
| `feature_organization` | FeatureOrganization | 4 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:231` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:222` |
| `organization` | Organization | 3 | @Module imports forFeature | `packages/server-ai/src/membership/membership.service.ts:238` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`
- **定时任务**：1 处

## 守卫/权限

`PermissionGuard`

## 归属文件（14）

- `packages/server-ai/src/membership/membership.service.ts`
- `packages/server-ai/src/membership/membership.controller.ts`
- `packages/server-ai/src/membership/membership-point-ledger.entity.ts`
- `packages/server-ai/src/membership/membership.module.ts`
- `packages/server-ai/src/membership/membership-period-scheduler.service.ts`
- `packages/server-ai/src/membership/user-membership.entity.ts`
- `packages/server-ai/src/membership/membership-plan.entity.ts`
- `packages/server-ai/src/membership/index.ts`
- `packages/server-ai/src/membership/model-billing.ts`
- `packages/server-ai/src/membership/membership-usage-points.ts`
- `packages/server-ai/src/membership/membership-backfill.processor.ts`
- `packages/server-ai/src/membership/membership-period.entity.ts`
- `packages/server-ai/src/membership/membership-backfill.queue.ts`
- `packages/server-ai/src/membership/dto/membership.dto.ts`
