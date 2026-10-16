# UserOrganizationModule（`user-organization`）

- **位置**：`packages/server/src/user-organization/` · 归属文件 **14** 个 · 约 **1243** 行
- **定义**：`packages/server/src/user-organization/user-organization.module.ts:16`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `me`、`:id` · 视图/接口入口 **7** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/user-organization/user-organization.controller.ts`（UserOrganizationController） | `-` | 7 | `:44` |

## 依赖关系

- **依赖**（改它要连带看）：`OrganizationModule`、`RoleModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`ArtifactsModule`、`ConnectorModule`、`EmployeeModule`、`InitializationModule`、`InviteModule`、`OrganizationModule`、`ServerAppModule`、`UserGroupModule`、`UserModule`、`ValidatorModule`、`XpertProjectModule`、`XpertWorkspaceModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 4 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AssistantBindingModule`（`ResolveUserOrganizationAccessCommand`）
- ← `ModelExecutionModule`（`ResolveUserOrganizationAccessCommand`）
- ← `UserModule`（`UserOrganizationCreateCommand`）
- ← `XpertWorkspaceModule`（`ResolveUserOrganizationAccessCommand`）

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user_organization` | UserOrganization | 8 | @Module imports forFeature | `packages/server/src/user-organization/user-organization.services.ts:37` |
| `user` | User | 3 | @Module imports forFeature | `packages/server/src/user-organization/commands/handlers/resolve-user-organization-access.handler.ts:15` |
| `organization` | Organization | 3 | @Module imports forFeature | `packages/server/src/user-organization/commands/handlers/resolve-user-organization-access.handler.ts:17` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`ResolveUserOrganizationAccessCommand`、`UserOrganizationCreateCommand`、`UserOrganizationDeleteCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（14）

- `packages/server/src/user-organization/user-organization.seed.ts`
- `packages/server/src/user-organization/user-organization.module.ts`
- `packages/server/src/user-organization/index.ts`
- `packages/server/src/user-organization/user-organization.controller.ts`
- `packages/server/src/user-organization/user-organization.entity.ts`
- `packages/server/src/user-organization/user-organization.services.ts`
- `packages/server/src/user-organization/commands/user-organization.create.command.ts`
- `packages/server/src/user-organization/commands/index.ts`
- `packages/server/src/user-organization/commands/resolve-user-organization-access.command.ts`
- `packages/server/src/user-organization/commands/user-organization.delete.command.ts`
- `packages/server/src/user-organization/commands/handlers/index.ts`
- `packages/server/src/user-organization/commands/handlers/resolve-user-organization-access.handler.ts`
- `packages/server/src/user-organization/commands/handlers/user-organization.create.handler.ts`
- `packages/server/src/user-organization/commands/handlers/user-organization.delete.handler.ts`
