# ReferralModule（`referral`）

- **位置**：`packages/server/src/referral/` · 归属文件 **9** 个 · 约 **635** 行
- **定义**：`packages/server/src/referral/referral.module.ts:12`（nestjs）
- **挂载前缀**：`/api/referral` · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/referral/referral.controller.ts`（ReferralController） | `referral` | 5 | `:17` |

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`
- **被依赖**（动它会影响）：`AuthModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `referral_code` | ReferralCode | 9 | @Module imports forFeature | `packages/server/src/referral/referral.service.ts:22` |
| `referral_relation` | ReferralRelation | 4 | @Module imports forFeature | `packages/server/src/referral/referral.service.ts:24` |
| `feature_organization` | FeatureOrganization | 4 | @Module imports forFeature | `packages/server/src/referral/referral.service.ts:26` |

## 守卫/权限

`TenantPermissionGuard`、`RoleGuard`、`PermissionGuard`

## 归属文件（9）

- `packages/server/src/referral/referral-relation.entity.ts`
- `packages/server/src/referral/index.ts`
- `packages/server/src/referral/referral.service.ts`
- `packages/server/src/referral/referral-code.subscriber.ts`
- `packages/server/src/referral/referral.controller.ts`
- `packages/server/src/referral/referral.module.ts`
- `packages/server/src/referral/referral-code.ts`
- `packages/server/src/referral/referral-code.entity.ts`
- `packages/server/src/referral/referral-validation-rate-limit.service.ts`
