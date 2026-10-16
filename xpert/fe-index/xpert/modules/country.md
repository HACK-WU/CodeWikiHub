# CountryModule（`country`）

- **位置**：`packages/server/src/country/` · 归属文件 **7** 个 · 约 **386** 行
- **定义**：`packages/server/src/country/country.module.ts:8`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/country/country.controller.ts`（CountryController） | `-` | 1 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `country` | Country | 3 | @Module imports forFeature | `packages/server/src/country/country.service.ts:10` |

## 归属文件（7）

- `packages/server/src/country/country.entity.ts`
- `packages/server/src/country/country.module.ts`
- `packages/server/src/country/country.service.ts`
- `packages/server/src/country/index.ts`
- `packages/server/src/country/default-countries.ts`
- `packages/server/src/country/country.controller.ts`
- `packages/server/src/country/country.seed.ts`
