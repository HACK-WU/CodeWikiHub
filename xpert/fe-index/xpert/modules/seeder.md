# SeederModule（`seeder`）

- **位置**：`packages/server/src/core/seeds/` · 归属文件 **5** 个 · 约 **701** 行
- **定义**：`packages/server/src/core/seeds/seeder.module.ts:7`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ApiWorkerBootstrapModule`、`AppModule`、`BootstrapModule`

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tenant` | Tenant | 2 | getRepository | `packages/server/src/core/seeds/seed-data.service.ts:174` |
| `role` | Role | 1 | getRepository | `packages/server/src/core/seeds/seed-data.service.ts:364` |

## 归属文件（5）

- `packages/server/src/core/seeds/index.ts`
- `packages/server/src/core/seeds/seed-data.service.ts`
- `packages/server/src/core/seeds/seed.ts`
- `packages/server/src/core/seeds/seeder.module.ts`
- `packages/server/src/core/seeds/seed-module.ts`
