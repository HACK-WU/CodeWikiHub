# CopilotStoreModule（`copilot-store`）

- **位置**：`packages/server-ai/src/copilot-store/` · 归属文件 **19** 个 · 约 **1448** 行
- **定义**：`packages/server-ai/src/copilot-store/copilot-store.module.ts:12`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-store/copilot-store.controller.ts`（CopilotStoreController） | `-` | 0 | `:11` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 2 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`CopilotStoreBulkPutCommand`）
- ← `XpertModule`（`CopilotStoreBulkPutCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_store` | CopilotStore | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-store/copilot-store.service.ts:11` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`CopilotStorePutCommand`、`CreateCopilotStoreCommand`、`CopilotStoreBulkPutCommand`

## 归属文件（19）

- `packages/server-ai/src/copilot-store/copilot-store.service.ts`
- `packages/server-ai/src/copilot-store/utils.ts`
- `packages/server-ai/src/copilot-store/store.ts`
- `packages/server-ai/src/copilot-store/copilot-store.entity.ts`
- `packages/server-ai/src/copilot-store/index.ts`
- `packages/server-ai/src/copilot-store/tools.ts`
- `packages/server-ai/src/copilot-store/copilot-store.controller.ts`
- `packages/server-ai/src/copilot-store/copilot-store.module.ts`
- `packages/server-ai/src/copilot-store/commands/index.ts`
- `packages/server-ai/src/copilot-store/commands/put.command.ts`
- `packages/server-ai/src/copilot-store/commands/bulk-put.command.ts`
- `packages/server-ai/src/copilot-store/commands/create-store.command.ts`
- `packages/server-ai/src/copilot-store/commands/handlers/index.ts`
- `packages/server-ai/src/copilot-store/commands/handlers/put.handler.ts`
- `packages/server-ai/src/copilot-store/commands/handlers/create-store.handler.ts`
- `packages/server-ai/src/copilot-store/commands/handlers/bulk-put.handler.ts`
- `packages/server-ai/src/copilot-store/dto/index.ts`
- `packages/server-ai/src/copilot-store/dto/item.dto.ts`
- `packages/server-ai/src/copilot-store/vectors/vectors.entity.ts`
