# OrganizationModule（`organization`）

- **位置**：`packages/server/src/organization/` · 归属文件 **19** 个 · 约 **1251** 行
- **定义**：`packages/server/src/organization/organization.module.ts:16`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `count`、`pagination`、`:id` 等 4 个 · 视图/接口入口 **10** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/organization/organization.controller.ts`（OrganizationController） | `-` | 10 | `:16` |

## 依赖关系

- **依赖**（改它要连带看）：`RoleModule`、`RolePermissionModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`AuthModule`、`InitializationModule`、`InviteModule`、`MobileModule`、`OrganizationContactModule`、`ServerAppModule`、`SuperAdminOrganizationScopeModule`、`UserOrganizationModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ImportRecordModule`（CQRS：`ImportRecordUpdateOrCreateCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AuthModule`（`OrganizationCreateCommand`）
- ← `TenantModule`（`OrganizationCreateCommand`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `organization` | Organization | 6 | @Module imports forFeature | `packages/server/src/organization/organization.seed.ts:23` |
| `invite` | Invite | 3 | @Module imports forFeature | `packages/server/src/organization/organization.service.ts:18` |
| `user_group` | UserGroup | 3 | @Module imports forFeature | `packages/server/src/organization/organization.service.ts:20` |
| `user_organization` | UserOrganization | 1 | @Module imports forFeature | `-` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`OrganizationUpdateCommand`、`OrganizationCreateCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`、`RoleGuard`

## 归属文件（19）

- `packages/server/src/organization/organization.seed.ts`
- `packages/server/src/organization/organization.controller.ts`
- `packages/server/src/organization/organization.subscriber.ts`
- `packages/server/src/organization/index.ts`
- `packages/server/src/organization/organization.module.ts`
- `packages/server/src/organization/organization.entity.ts`
- `packages/server/src/organization/organization.service.ts`
- `packages/server/src/organization/default-organizations.ts`
- `packages/server/src/organization/commands/organization.create.command.ts`
- `packages/server/src/organization/commands/organization.demo.command.ts`
- `packages/server/src/organization/commands/index.ts`
- `packages/server/src/organization/commands/organization.update.command.ts`
- `packages/server/src/organization/commands/handlers/organization.update.handler.ts`
- `packages/server/src/organization/commands/handlers/index.ts`
- `packages/server/src/organization/commands/handlers/organization.create.handler.ts`
- `packages/server/src/organization/dto/index.ts`
- `packages/server/src/organization/dto/org-public.dto.ts`
- `packages/server/src/organization/events/index.ts`
- `packages/server/src/organization/events/organization.created.event.ts`
