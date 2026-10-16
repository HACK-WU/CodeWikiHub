# InviteModule（`invite`）

- **位置**：`packages/server/src/invite/` · 归属文件 **22** 个 · 约 **2046** 行
- **定义**：`packages/server/src/invite/invite.module.ts:21`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `emails`、`validate`、`employee` 等 5 个 · 视图/接口入口 **10** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/invite/invite.controller.ts`（InviteController） | `-` | 10 | `:58` |

## 依赖关系

- **依赖**（改它要连带看）：`AuthModule`、`EmailModule`、`OrganizationContactModule`、`OrganizationModule`、`RoleModule`、`RolePermissionModule`、`SharedModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `RoleModule`（CQRS：`TenantRoleBulkCreateCommand`）
- → `TenantModule`（CQRS：`TenantFeatureOrganizationCreateCommand`）

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `role` | Role | 6 | getRepository | `packages/server/src/invite/invite.seed.ts:16` |
| `organization` | Organization | 4 | @InjectRepository | `packages/server/src/invite/invite.service.ts:48` |
| `invite` | Invite | 3 | @Module imports forFeature | `packages/server/src/invite/invite.service.ts:42` |
| `organization_contact` | OrganizationContact | 2 | @InjectRepository | `packages/server/src/invite/invite.service.ts:45` |
| `email_template` | EmailTemplate | 2 | @InjectRepository | `packages/server/src/email/email.service.ts:41` |

## 非 HTTP 入口

- **CQRS Handler**（6）：`InviteAcceptOrganizationContactCommand`、`InviteBulkCreateCommand`、`InviteAcceptUserCommand`、`InviteAcceptEmployeeCommand`、`InviteResendCommand`、`InviteOrganizationContactCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（22）

- `packages/server/src/invite/invite.entity.ts`
- `packages/server/src/invite/invite.seed.ts`
- `packages/server/src/invite/invite.controller.ts`
- `packages/server/src/invite/invite.module.ts`
- `packages/server/src/invite/invite.service.ts`
- `packages/server/src/invite/commands/invite.accept-organization-contact.command.ts`
- `packages/server/src/invite/commands/invite.accept-user.command.ts`
- `packages/server/src/invite/commands/invite.organization-contact.command.ts`
- `packages/server/src/invite/commands/invite.resend.command.ts`
- `packages/server/src/invite/commands/invite.bulk.create.command.ts`
- `packages/server/src/invite/commands/index.ts`
- `packages/server/src/invite/commands/invite.accept-employee.command.ts`
- `packages/server/src/invite/commands/handlers/invite.accept-organization-contact.handler.ts`
- `packages/server/src/invite/commands/handlers/invite.bulk.create.handler.ts`
- `packages/server/src/invite/commands/handlers/invite.accept-user.handler.ts`
- `packages/server/src/invite/commands/handlers/index.ts`
- `packages/server/src/invite/commands/handlers/invite.accept-employee.handler.ts`
- `packages/server/src/invite/commands/handlers/invite.resend.handler.ts`
- `packages/server/src/invite/commands/handlers/invite.organization-contact.handler.ts`
- `packages/server/src/invite/dto/create-invite.dto.ts`
- `packages/server/src/invite/dto/index.ts`
- `packages/server/src/email/email.service.ts`
