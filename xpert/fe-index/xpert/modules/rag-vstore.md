# RagVStoreModule（`rag-vstore`）

- **位置**：`packages/server-ai/src/rag-vstore/` · 归属文件 **9** 个 · 约 **413** 行
- **定义**：`packages/server-ai/src/rag-vstore/vstore.module.ts:9`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`FileUnderstandingModule`、`KnowledgebaseModule`、`ServerAIModule`
- **依赖的库/框架模块**：`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgebaseModule`（`RagCreateVStoreCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（1）：`RagCreateVStoreCommand`

## 归属文件（9）

- `packages/server-ai/src/rag-vstore/index.ts`
- `packages/server-ai/src/rag-vstore/vstore.module.ts`
- `packages/server-ai/src/rag-vstore/knowledge-pg-vector.store.ts`
- `packages/server-ai/src/rag-vstore/vector-store-settings.service.ts`
- `packages/server-ai/src/rag-vstore/commands/create.command.ts`
- `packages/server-ai/src/rag-vstore/commands/index.ts`
- `packages/server-ai/src/rag-vstore/commands/handlers/create.handler.ts`
- `packages/server-ai/src/rag-vstore/commands/handlers/index.ts`
- `packages/plugin-sdk/src/lib/vectorstore/strategy.registry.ts`
