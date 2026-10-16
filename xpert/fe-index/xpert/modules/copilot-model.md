# CopilotModelModule（`copilot-model`）

- **位置**：`packages/server-ai/src/copilot-model/` · 归属文件 **19** 个 · 约 **812** 行
- **定义**：`packages/server-ai/src/copilot-model/copilot-model.module.ts:13`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-model/copilot-model.controller.ts`（CopilotModelController） | `-` | 0 | `:11` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`KnowledgeDocumentModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，3 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）
- → `CopilotProviderModule`（CQRS：`GetCopilotProviderModelQuery`）
- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ChatModule`（`CopilotModelGetChatModelQuery`）
- ← `SuperAdminOrganizationScopeModule`（`CopilotModelGetChatModelQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_model` | CopilotModel | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-model/copilot-model.service.ts:10` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`CreateModelClientCommand`、`CopilotModelGetRerankQuery`、`CopilotModelGetChatModelQuery`、`CopilotModelGetEmbeddingsQuery`

## 归属文件（19）

- `packages/server-ai/src/copilot-model/copilot-model.controller.ts`
- `packages/server-ai/src/copilot-model/index.ts`
- `packages/server-ai/src/copilot-model/copilot-model.subscriber.ts`
- `packages/server-ai/src/copilot-model/copilot-model.module.ts`
- `packages/server-ai/src/copilot-model/model-selection-metadata.ts`
- `packages/server-ai/src/copilot-model/copilot-model.service.ts`
- `packages/server-ai/src/copilot-model/model-capabilities.ts`
- `packages/server-ai/src/copilot-model/copilot-model.entity.ts`
- `packages/server-ai/src/copilot-model/commands/index.ts`
- `packages/server-ai/src/copilot-model/commands/handlers/create-model-client.handler.ts`
- `packages/server-ai/src/copilot-model/queries/get-embeddings.query.ts`
- `packages/server-ai/src/copilot-model/queries/get-chat-model.query.ts`
- `packages/server-ai/src/copilot-model/queries/index.ts`
- `packages/server-ai/src/copilot-model/queries/get-rerank.query.ts`
- `packages/server-ai/src/copilot-model/queries/handlers/index.ts`
- `packages/server-ai/src/copilot-model/queries/handlers/get-rerank.handler.ts`
- `packages/server-ai/src/copilot-model/queries/handlers/get-chat-model.handler.ts`
- `packages/server-ai/src/copilot-model/queries/handlers/get-embeddings.handler.ts`
- `packages/server-ai/src/copilot-model/utils/context-size.ts`
