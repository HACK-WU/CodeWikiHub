# ManagedQueueModule（`managed-queue`）

- **位置**：`packages/server/src/managed-queue/` · 归属文件 **7** 个 · 约 **1050** 行
- **定义**：`packages/server/src/managed-queue/managed-queue.module.ts:32`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`DiscoveryModule`、`BullModule`、`REDIS_OPTIONS`、`RedisOptions`、`MANAGED_QUEUE_PHYSICAL_QUEUE_NAME`、`MANAGED_QUEUE_PHYSICAL_QUEUE_PREFIX`、`MANAGED_QUEUE_SANDBOX_BROWSER_QUEUE_NAME`

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **MQ 消费者**（2）：`(匿名队列)`、`(匿名队列)`

## 归属文件（7）

- `packages/server/src/managed-queue/managed-queue.processor.ts`
- `packages/server/src/managed-queue/managed-queue-handler-explorer.service.ts`
- `packages/server/src/managed-queue/constants.ts`
- `packages/server/src/managed-queue/managed-queue.service.ts`
- `packages/server/src/managed-queue/index.ts`
- `packages/server/src/managed-queue/managed-queue-handler-registry.service.ts`
- `packages/server/src/managed-queue/managed-queue.module.ts`
