# HealthModule（`health`）

- **位置**：`packages/server/src/health/` · 归属文件 **5** 个 · 约 **374** 行
- **定义**：`packages/server/src/health/health.module.ts:11`（nestjs）
- **挂载前缀**：`/api/health` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/health/health.controller.ts`（HealthController） | `health` | 2 | `:14` |

## 依赖关系

- **依赖**（改它要连带看）：`DatabaseModule`、`RuntimeControlModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`TerminusModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user` | User | 3 | @Module imports forFeature | `packages/server/src/health/health.controller.ts:23` |

## 归属文件（5）

- `packages/server/src/health/index.ts`
- `packages/server/src/health/health.controller.ts`
- `packages/server/src/health/health.module.ts`
- `packages/server/src/health/indicators/redis-health.indicator.ts`
- `packages/server/src/health/indicators/cache-health.indicator.ts`
