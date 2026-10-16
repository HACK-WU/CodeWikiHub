# ContactModule（`contact`）

- **位置**：`packages/server/src/contact/` · 归属文件 **9** 个 · 约 **271** 行
- **定义**：`packages/server/src/contact/contact.module.ts:10`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/contact/contact.controller.ts`（ContactController） | `-` | 1 | `:12` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：无
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `contact` | Contact | 3 | @Module imports forFeature | `packages/server/src/contact/contact.service.ts:11` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`ContactCreateCommand`

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（9）

- `packages/server/src/contact/contact.service.ts`
- `packages/server/src/contact/contact.entity.ts`
- `packages/server/src/contact/contact.module.ts`
- `packages/server/src/contact/contact.controller.ts`
- `packages/server/src/contact/contact.seed.ts`
- `packages/server/src/contact/commands/index.ts`
- `packages/server/src/contact/commands/contact-create.commant.ts`
- `packages/server/src/contact/commands/handlers/contact-create.handler.ts`
- `packages/server/src/contact/commands/handlers/index.ts`
