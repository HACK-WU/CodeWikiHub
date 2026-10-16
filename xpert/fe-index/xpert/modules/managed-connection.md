# ManagedConnectionModule（`managed-connection`）

- **位置**：`packages/server/src/managed-connection/` · 归属文件 **7** 个 · 约 **1004** 行
- **定义**：`packages/server/src/managed-connection/managed-connection.module.ts:12`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`
- **被依赖**（动它会影响）：`RuntimeControlModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `managed_connection` | ManagedConnectionEntity | 4 | @Module imports forFeature | `packages/server/src/managed-connection/managed-connection-registry.service.ts:21` |

## 非 HTTP 入口

- **定时任务**：1 处

## 归属文件（7）

- `packages/server/src/managed-connection/managed-connection-cleanup.service.ts`
- `packages/server/src/managed-connection/managed-connection.entity.ts`
- `packages/server/src/managed-connection/index.ts`
- `packages/server/src/managed-connection/managed-connection.module.ts`
- `packages/server/src/managed-connection/managed-connection-registry.service.ts`
- `packages/server/src/managed-connection/connection-command-router.service.ts`
- `packages/server/src/managed-connection/instance-registry.service.ts`
