# CustomSmtpModule（`custom-smtp`）

- **位置**：`packages/server/src/custom-smtp/` · 归属文件 **14** 个 · 约 **473** 行
- **定义**：`packages/server/src/custom-smtp/custom-smtp.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `setting`、`validate`、`:id` · 视图/接口入口 **4** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/custom-smtp/custom-smtp.controller.ts`（CustomSmtpController） | `-` | 4 | `:34` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`EmailModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `custom_smtp` | CustomSmtp | 3 | @Module imports forFeature | `packages/server/src/custom-smtp/custom-smtp.service.ts:13` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`CustomSmtpCreateCommand`、`CustomSmtpUpdateCommand`

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（14）

- `packages/server/src/custom-smtp/custom-smtp.service.ts`
- `packages/server/src/custom-smtp/custom-smtp.module.ts`
- `packages/server/src/custom-smtp/custom-smtp.controller.ts`
- `packages/server/src/custom-smtp/custom-smtp.entity.ts`
- `packages/server/src/custom-smtp/commands/custom-smtp.update.command.ts`
- `packages/server/src/custom-smtp/commands/index.ts`
- `packages/server/src/custom-smtp/commands/custom-smtp.create.command.ts`
- `packages/server/src/custom-smtp/commands/handlers/custom-smtp.create.handler.ts`
- `packages/server/src/custom-smtp/commands/handlers/custom-smtp.update.handler.ts`
- `packages/server/src/custom-smtp/dto/create-custom-smtp.dto.ts`
- `packages/server/src/custom-smtp/dto/validate-custom-smtp.dto.ts`
- `packages/server/src/custom-smtp/dto/index.ts`
- `packages/server/src/custom-smtp/dto/update-custom-smtp.dto.ts`
- `packages/server/src/custom-smtp/dto/custom-smtp.query.dto.ts`
