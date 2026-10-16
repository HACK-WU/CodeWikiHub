# OrganizationContactModule（`organization-contact`）

- **位置**：`packages/server/src/organization-contact/` · 归属文件 **11** 个 · 约 **554** 行
- **定义**：`packages/server/src/organization-contact/organization-contact.module.ts:14`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `employee` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/organization-contact/organization-contact.controller.ts`（OrganizationContactController） | `-` | 3 | `:30` |

## 依赖关系

- **依赖**（改它要连带看）：`EmailModule`、`OrganizationModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`InviteModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `organization_contact` | OrganizationContact | 3 | @Module imports forFeature | `packages/server/src/organization-contact/organization-contact.service.ts:11` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`OrganizationContactCreateCommand`、`OrganizationContactEditByEmployeeCommand`

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（11）

- `packages/server/src/organization-contact/organization-contact.controller.ts`
- `packages/server/src/organization-contact/organization-contact.service.ts`
- `packages/server/src/organization-contact/organization-contact.module.ts`
- `packages/server/src/organization-contact/organization-contact.entity.ts`
- `packages/server/src/organization-contact/organization-contact.subscriber.ts`
- `packages/server/src/organization-contact/commands/organization-contact.edit-by-employee.command.ts`
- `packages/server/src/organization-contact/commands/index.ts`
- `packages/server/src/organization-contact/commands/organization-contact-create.command.ts`
- `packages/server/src/organization-contact/commands/handlers/organization-contact-create.handler.ts`
- `packages/server/src/organization-contact/commands/handlers/index.ts`
- `packages/server/src/organization-contact/commands/handlers/organization-contact.edit-by-employee.handler.ts`
