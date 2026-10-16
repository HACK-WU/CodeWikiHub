# CurrencyModule（`currency`）

- **位置**：`packages/server/src/currency/` · 归属文件 **6** 个 · 约 **133** 行
- **定义**：`packages/server/src/currency/currency.module.ts:8`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/currency/currency.controller.ts`（CurrencyController） | `-` | 1 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `currency` | Currency | 3 | @Module imports forFeature | `packages/server/src/currency/currency.service.ts:10` |

## 归属文件（6）

- `packages/server/src/currency/currency.seed.ts`
- `packages/server/src/currency/currency.controller.ts`
- `packages/server/src/currency/index.ts`
- `packages/server/src/currency/currency.entity.ts`
- `packages/server/src/currency/currency.service.ts`
- `packages/server/src/currency/currency.module.ts`
