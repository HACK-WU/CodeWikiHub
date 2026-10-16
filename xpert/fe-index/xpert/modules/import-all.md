# ImportAllModule（`import-all`）

- **位置**：`packages/server/src/export-import/import/` · 归属文件 **7** 个 · 约 **219** 行
- **定义**：`packages/server/src/export-import/import/import-all.module.ts:13`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/export-import/import/import-all.controller.ts`（ImportAllController） | `-` | 2 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`ImportHistoryModule`、`ImportRecordModule`
- **被依赖**（动它会影响）：无
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`MulterModule`、`ApiKey`、`Organization`、`PasswordReset`、`User`、`EmailVerification`、`UserOrganization`、`UserGroup`、`Tenant`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ImportHistoryModule`（CQRS：`ImportHistoryCreateCommand`）
- → `ImportRecordModule`（CQRS：`ImportRecordFindOrFailCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（1）：`ImportEntityFieldMapOrCreateCommand`

## 归属文件（7）

- `packages/server/src/export-import/import/index.ts`
- `packages/server/src/export-import/import/import-all.module.ts`
- `packages/server/src/export-import/import/import-all.controller.ts`
- `packages/server/src/export-import/import/commands/index.ts`
- `packages/server/src/export-import/import/commands/import-entity-field-map-or-create.command.ts`
- `packages/server/src/export-import/import/commands/handlers/index.ts`
- `packages/server/src/export-import/import/commands/handlers/import-entity-field-map-or-create.handler.ts`
