# DataSourceTypeModule（`data-source-type`）

- **位置**：`packages/server/src/data-source-type/` · 归属文件 **7** 个 · 约 **224** 行
- **定义**：`packages/server/src/data-source-type/data-source-type.module.ts:12`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `sync` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/data-source-type/data-source-type.controller.ts`（DataSourceTypeController） | `-` | 1 | `:13` |

## 依赖关系

- **依赖**（改它要连带看）：`SharedModule`、`TenantModule`
- **被依赖**（动它会影响）：`DataSourceModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `data_source_type` | DataSourceType | 3 | @Module imports forFeature | `packages/server/src/data-source-type/data-source-type.service.ts:20` |

## 守卫/权限

`RoleGuard`

## 归属文件（7）

- `packages/server/src/data-source-type/data-source-type.controller.ts`
- `packages/server/src/data-source-type/data-source-type.module.ts`
- `packages/server/src/data-source-type/index.ts`
- `packages/server/src/data-source-type/data-source-type.entity.ts`
- `packages/server/src/data-source-type/data-source-type.service.ts`
- `packages/server/src/data-source-type/dto/simple-type.dto.ts`
- `packages/plugin-sdk/src/lib/data/datasource/strategy.registry.ts`
