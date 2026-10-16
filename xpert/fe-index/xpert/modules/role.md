# RoleModule（`role`）

- **位置**：`packages/server/src/role/` · 归属文件 **12** 个 · 约 **426** 行
- **定义**：`packages/server/src/role/role.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `find`、`:id` · 视图/接口入口 **7** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/role/role.controller.ts`（RoleController） | `-` | 7 | `:26` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AuthModule`、`InviteModule`、`OrganizationModule`、`RolePermissionModule`、`ServerAppModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`、`ValidatorModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `RolePermissionModule`（CQRS：`TenantRolePermissionBulkCreateCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `InviteModule`（`TenantRoleBulkCreateCommand`）
- ← `TenantModule`（`TenantRoleBulkCreateCommand`）

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `role` | Role | 3 | @Module imports forFeature | `packages/server/src/role/role.service.ts:13` |
| `user` | User | 3 | @Module imports forFeature | `packages/server/src/role/role.service.ts:15` |
| `invite` | Invite | 3 | @Module imports forFeature | `packages/server/src/role/role.service.ts:17` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`TenantRoleBulkCreateCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（12）

- `packages/server/src/role/role.service.ts`
- `packages/server/src/role/role.entity.ts`
- `packages/server/src/role/role.controller.ts`
- `packages/server/src/role/index.ts`
- `packages/server/src/role/role.module.ts`
- `packages/server/src/role/role-entity.resolver.ts`
- `packages/server/src/role/default-role.ts`
- `packages/server/src/role/role.seed.ts`
- `packages/server/src/role/commands/index.ts`
- `packages/server/src/role/commands/tenant-role-bulk-create.command.ts`
- `packages/server/src/role/commands/handlers/index.ts`
- `packages/server/src/role/commands/handlers/tenant-role-bulk-create.handler.ts`
