# EmailModule（`email`）

- **位置**：`packages/server/src/email/` · 归属文件 **6** 个 · 约 **856** 行
- **定义**：`packages/server/src/email/email.module.ts:12`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/email/email.controller.ts`（EmailController） | `-` | 2 | `:22` |

## 依赖关系

- **依赖**（改它要连带看）：`CustomSmtpModule`、`EmailTemplateModule`、`TenantModule`
- **被依赖**（动它会影响）：`AuthModule`、`EmployeeModule`、`InviteModule`、`OrganizationContactModule`、`ServerAppModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `email_template` | EmailTemplate | 4 | getRepository | `packages/server/src/email/email.seed.ts:13` |
| `organization` | Organization | 3 | @Module imports forFeature | `packages/server/src/email/email.service.ts:44` |
| `user` | User | 2 | getRepository | `packages/server/src/email/email.seed.ts:18` |
| `email_sent` | Email | 1 | @Module imports forFeature | `-` |

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（6）

- `packages/server/src/email/email.entity.ts`
- `packages/server/src/email/email.seed.ts`
- `packages/server/src/email/index.ts`
- `packages/server/src/email/email.service.ts`
- `packages/server/src/email/email.controller.ts`
- `packages/server/src/email/email.module.ts`
