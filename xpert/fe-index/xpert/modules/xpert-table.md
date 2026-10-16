# XpertTableModule（`xpert-table`）

- **位置**：`packages/server-ai/src/xpert-table/` · 归属文件 **18** 个 · 约 **1060** 行
- **定义**：`packages/server-ai/src/xpert-table/xpert-table.module.ts:12`（nestjs）
- **挂载前缀**：`/api/xpert-table` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-table/xpert-table.controller.ts`（XpertTableController） | `xpert-table` | 6 | `:26` |

## 依赖关系

- **依赖**（改它要连带看）：`DataSourceModule`、`TenantModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `DataSourceModule`（CQRS：`DataSourceStrategyQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_table` | XpertTable | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-table/xpert-table.service.ts:17` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`XpertDatabaseAdapterQuery`、`XpertDatabasesQuery`

## 守卫/权限

`PermissionGuard`

## 归属文件（18）

- `packages/server-ai/src/xpert-table/index.ts`
- `packages/server-ai/src/xpert-table/xpert-table.service.ts`
- `packages/server-ai/src/xpert-table/xpert-table.module.ts`
- `packages/server-ai/src/xpert-table/xpert-table.controller.ts`
- `packages/server-ai/src/xpert-table/xpert-table.entity.ts`
- `packages/server-ai/src/xpert-table/plugins/index.ts`
- `packages/server-ai/src/xpert-table/plugins/insert/validator.ts`
- `packages/server-ai/src/xpert-table/plugins/insert/strategy.ts`
- `packages/server-ai/src/xpert-table/plugins/insert/index.ts`
- `packages/server-ai/src/xpert-table/plugins/sql/validator.ts`
- `packages/server-ai/src/xpert-table/plugins/sql/strategy.ts`
- `packages/server-ai/src/xpert-table/plugins/sql/index.ts`
- `packages/server-ai/src/xpert-table/queries/get-database-adapter.query.ts`
- `packages/server-ai/src/xpert-table/queries/get-database-schemas.query.ts`
- `packages/server-ai/src/xpert-table/queries/get-databases.query.ts`
- `packages/server-ai/src/xpert-table/queries/handlers/xpert-database-adapter.handler.ts`
- `packages/server-ai/src/xpert-table/queries/handlers/xpert-databases.handler.ts`
- `packages/server-ai/src/xpert-table/queries/handlers/index.ts`
