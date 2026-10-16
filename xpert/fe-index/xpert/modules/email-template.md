# EmailTemplateModule（`email-template`）

- **位置**：`packages/server/src/email-template/` · 归属文件 **23** 个 · 约 **977** 行
- **定义**：`packages/server/src/email-template/email-template.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `count`、`pagination`、`template` 等 4 个 · 视图/接口入口 **9** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/email-template/email-template.controller.ts`（EmailTemplateController） | `-` | 9 | `:49` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`EmailModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `email_template` | EmailTemplate | 5 | @Module imports forFeature | `packages/server/src/email-template/email-template.service.ts:19` |

## 非 HTTP 入口

- **CQRS Handler**（5）：`EmailTemplateSaveCommand`、`TenantCreatedEvent`、`EmailTemplateGeneratePreviewQuery`、`FindEmailTemplateQuery`、`EmailTemplateQuery`

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（23）

- `packages/server/src/email-template/index.ts`
- `packages/server/src/email-template/email-template.service.ts`
- `packages/server/src/email-template/default-email-template-path.ts`
- `packages/server/src/email-template/email-template.module.ts`
- `packages/server/src/email-template/email-template.subscriber.ts`
- `packages/server/src/email-template/email-template.entity.ts`
- `packages/server/src/email-template/email-template.controller.ts`
- `packages/server/src/email-template/email-template.seed.ts`
- `packages/server/src/email-template/commands/email-template.save.command.ts`
- `packages/server/src/email-template/commands/index.ts`
- `packages/server/src/email-template/commands/handlers/index.ts`
- `packages/server/src/email-template/commands/handlers/email-template.save.handler.ts`
- `packages/server/src/email-template/events/index.ts`
- `packages/server/src/email-template/events/handlers/index.ts`
- `packages/server/src/email-template/events/handlers/tenant.created.handler.ts`
- `packages/server/src/email-template/queries/email-template.query.ts`
- `packages/server/src/email-template/queries/index.ts`
- `packages/server/src/email-template/queries/email-template.generate-preview.query.ts`
- `packages/server/src/email-template/queries/email-template.find.query.ts`
- `packages/server/src/email-template/queries/handlers/email-template.generate-preview.handler.ts`
- `packages/server/src/email-template/queries/handlers/index.ts`
- `packages/server/src/email-template/queries/handlers/email-template.find.handler.ts`
- `packages/server/src/email-template/queries/handlers/email-template.handler.ts`
