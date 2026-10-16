# DataSourceModule（`data-source`）

- **位置**：`packages/server/src/data-source/` · 归属文件 **34** 个 · 约 **1689** 行
- **定义**：`packages/server/src/data-source/data-source.module.ts:18`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `sql-select-options`、`sql-schema-select-options`、`:id` 等 4 个 · 视图/接口入口 **16** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/data-source/data-source.controller.ts`（DataSourceController） | `-` | 16 | `:52` |

## 依赖关系

- **依赖**（改它要连带看）：`DataSourceTypeModule`、`SharedModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAppModule`、`XpertTableModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `XpertTableModule`（`DataSourceStrategyQuery`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `data_source` | DataSource | 5 | @Module imports forFeature | `packages/server/src/data-source/data-source-runtime.service.ts:26` |
| `data_source_authentication` | DataSourceAuthentication | 3 | @Module imports forFeature | `packages/server/src/data-source/data-source.service.ts:31` |

## 非 HTTP 入口

- **CQRS Handler**（8）：`ListTablesCommand`、`DataSourcePingCommand`、`QuerySchemaCommand`、`QuerySqlCommand`、`DataLoadCommand`、`DataSourceQuery` 等 8

## 守卫/权限

`PermissionGuard`

## 归属文件（34）

- `packages/server/src/data-source/data-source-runtime.service.ts`
- `packages/server/src/data-source/data-source.entity.ts`
- `packages/server/src/data-source/utils.ts`
- `packages/server/src/data-source/index.ts`
- `packages/server/src/data-source/data-source.module.ts`
- `packages/server/src/data-source/subscriber.ts`
- `packages/server/src/data-source/data-source.controller.ts`
- `packages/server/src/data-source/data-source.service.ts`
- `packages/server/src/data-source/authentication/authentication.entity.ts`
- `packages/server/src/data-source/commands/query-schema.command.ts`
- `packages/server/src/data-source/commands/list-tables.command.ts`
- `packages/server/src/data-source/commands/index.ts`
- `packages/server/src/data-source/commands/ping.command.ts`
- `packages/server/src/data-source/commands/query-sql.command.ts`
- `packages/server/src/data-source/commands/load.command.ts`
- `packages/server/src/data-source/commands/handlers/list-tables.handler.ts`
- `packages/server/src/data-source/commands/handlers/ping.handler.ts`
- `packages/server/src/data-source/commands/handlers/index.ts`
- `packages/server/src/data-source/commands/handlers/query-schema.handler.ts`
- `packages/server/src/data-source/commands/handlers/query-sql.handler.ts`
- `packages/server/src/data-source/commands/handlers/load.handler.ts`
- `packages/server/src/data-source/dto/index.ts`
- `packages/server/src/data-source/dto/public.dto.ts`
- `packages/server/src/data-source/events/updated.event.ts`
- `packages/server/src/data-source/events/index.ts`
- `packages/server/src/data-source/events/handlers/index.ts`
- `packages/server/src/data-source/queries/olap.query.ts`
- `packages/server/src/data-source/queries/query.query.ts`
- `packages/server/src/data-source/queries/index.ts`
- `packages/server/src/data-source/queries/datasource.strategy.query.ts`
- `packages/server/src/data-source/queries/handlers/query.handler.ts`
- `packages/server/src/data-source/queries/handlers/index.ts`
- `packages/server/src/data-source/queries/handlers/olap-query.handler.ts`
- `packages/server/src/data-source/queries/handlers/datasource.strategy.handler.ts`
