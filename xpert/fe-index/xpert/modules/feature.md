# FeatureModule（`feature`）

- **位置**：`packages/server/src/feature/` · 归属文件 **24** 个 · 约 **1400** 行
- **定义**：`packages/server/src/feature/feature.module.ts:14`（nestjs）
- **挂载前缀**：`/api/toggle` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/feature/feature.controller.ts`（FeatureController） | `-` | 1 | `:11` |
| `packages/server/src/feature/feature-toggle.controller.ts`（FeatureToggleController） | `toggle` | 5 | `:23` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`ServerAppModule`、`TenantModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `TenantModule`（`FeatureBulkCreateCommand`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `feature` | Feature | 6 | @Module imports forFeature | `packages/server/src/feature/feature.service.ts:83` |
| `feature_organization` | FeatureOrganization | 5 | @Module imports forFeature | `packages/server/src/feature/feature-organization.service.ts:37` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`FeatureToggleUpdateCommand`、`FeatureBulkCreateCommand`、`FeatureUpgradeCommand`

## 守卫/权限

`TenantPermissionGuard`、`RoleGuard`、`PermissionGuard`

## 归属文件（24）

- `packages/server/src/feature/feature.service.ts`
- `packages/server/src/feature/default-features.ts`
- `packages/server/src/feature/feature.seed.ts`
- `packages/server/src/feature/feature.subscriber.ts`
- `packages/server/src/feature/feature.module.ts`
- `packages/server/src/feature/feature.entity.ts`
- `packages/server/src/feature/feature-organization.service.ts`
- `packages/server/src/feature/feature.controller.ts`
- `packages/server/src/feature/index.ts`
- `packages/server/src/feature/feature-toggle.controller.ts`
- `packages/server/src/feature/feature-organization.entity.ts`
- `packages/server/src/feature/commands/index.ts`
- `packages/server/src/feature/commands/feature-bulk-create.command.ts`
- `packages/server/src/feature/commands/feature-upgrade.command.ts`
- `packages/server/src/feature/commands/feature-toggle.update.command.ts`
- `packages/server/src/feature/commands/handlers/index.ts`
- `packages/server/src/feature/commands/handlers/feature-toggle.update.handler.ts`
- `packages/server/src/feature/commands/handlers/feature-bulk-create.handler.ts`
- `packages/server/src/feature/commands/handlers/feature-upgrade.handler.ts`
- `packages/server/src/feature/dto/create-feature-toggle.dto.ts`
- `packages/server/src/feature/dto/index.ts`
- `packages/server/src/feature/dto/feature-organization-query.dto.ts`
- `packages/server/src/feature/events/feature-organization.updated.event.ts`
- `packages/server/src/feature/events/index.ts`
