# RolePermissionModule（`role-permission`）

- **位置**：`packages/server/src/role-permission/` · 归属文件 **13** 个 · 约 **796** 行
- **定义**：`packages/server/src/role-permission/role-permission.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `import`、`sync-defaults`、`:id` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/role-permission/role-permission.controller.ts`（RolePermissionController） | `-` | 6 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`RoleModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`InviteModule`、`OrganizationModule`、`ServerAppModule`、`TenantModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 3 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `IntegrationModule`（`CheckRolePermissionCommand`）
- ← `RoleModule`（`TenantRolePermissionBulkCreateCommand`）
- ← `SharedModule`（`CheckRolePermissionCommand`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `role_permission` | RolePermission | 4 | @Module imports forFeature | `packages/server/src/role-permission/role-permission.service.ts:45` |
| `role` | Role | 1 | getRepository | `packages/server/src/role-permission/role-permission.service.ts:284` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`CheckRolePermissionCommand`、`TenantRolePermissionBulkCreateCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（13）

- `packages/server/src/role-permission/role-permission.controller.ts`
- `packages/server/src/role-permission/role-permission.module.ts`
- `packages/server/src/role-permission/role-permission.service.ts`
- `packages/server/src/role-permission/role-permission.entity.ts`
- `packages/server/src/role-permission/index.ts`
- `packages/server/src/role-permission/role-permission.seed.ts`
- `packages/server/src/role-permission/default-role-permissions.ts`
- `packages/server/src/role-permission/commands/check-role-permission.command.ts`
- `packages/server/src/role-permission/commands/index.ts`
- `packages/server/src/role-permission/commands/tenant-role-bulk-create.command.ts`
- `packages/server/src/role-permission/commands/handlers/check-role-permission.handler.ts`
- `packages/server/src/role-permission/commands/handlers/index.ts`
- `packages/server/src/role-permission/commands/handlers/tenant-role-bulk-create.handler.ts`
