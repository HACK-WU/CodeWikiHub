# GraphragModule（`graphrag`）

- **位置**：`packages/server-ai/src/graphrag/` · 归属文件 **48** 个 · 约 **5339** 行
- **定义**：`packages/server-ai/src/graphrag/graphrag.module.ts:30`（nestjs）
- **挂载前缀**：`/api/:id/graph` · 视图/接口入口 **18** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/graphrag/graphrag.controller.ts`（GraphragController） | `:id/graph` | 18 | `:19` |

## 依赖关系

- **依赖**（改它要连带看）：`KnowledgeDocumentModule`、`KnowledgeIdentityModule`、`KnowledgebaseModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`BullModule`、`JOB_KNOWLEDGE_GRAPH_INDEX`

## 事件/命令耦合（不经 imports，0 出 / 3 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgeDocumentModule`（`KnowledgeGraphClearDocumentCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`KnowledgeGraphClearDocumentCommand`）
- ← `KnowledgebaseModule`（`KnowledgeGraphEntitySearchQuery`、`KnowledgeGraphViewQuery`）

## 数据表（13）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `knowledge_graph_index_job` | KnowledgeGraphIndexJob | 24 | @Module imports forFeature | `packages/server-ai/src/graphrag/graph-index-job.ts:15` |
| `knowledge_graph_entity` | KnowledgeGraphEntity | 10 | @Module imports forFeature | `packages/server-ai/src/graphrag/graph-explorer.ts:9` |
| `knowledgebase` | Knowledgebase | 9 | @Module imports forFeature | `packages/server-ai/src/graphrag/graph-index-job.ts:16` |
| `knowledge_graph_relation` | KnowledgeGraphRelation | 8 | @Module imports forFeature | `packages/server-ai/src/graphrag/graph-explorer.ts:17` |
| `knowledge_document` | KnowledgeDocument | 7 | getRepository | `packages/server-ai/src/graphrag/structured-graph-runtime.service.ts:69` |
| `knowledge_graph_entity_contribution` | KnowledgeGraphEntityContribution | 6 | @Module imports forFeature | `packages/server-ai/src/graphrag/graphrag.service.ts:200` |
| `knowledge_graph_relation_contribution` | KnowledgeGraphRelationContribution | 6 | @Module imports forFeature | `packages/server-ai/src/graphrag/graphrag.service.ts:202` |
| `knowledge_graph_mention` | KnowledgeGraphMention | 5 | @Module imports forFeature | `packages/server-ai/src/graphrag/graphrag.service.ts:186` |
| `knowledge_graph_community` | KnowledgeGraphCommunity | 3 | @Module imports forFeature | `packages/server-ai/src/graphrag/graphrag.service.ts:188` |
| `knowledge_document_chunk` | KnowledgeDocumentChunk | 1 | getRepository | `packages/server-ai/src/graphrag/structured-graph-runtime.service.ts:75` |
| `xpert_agent` | XpertAgent | 1 | getRepository | `packages/server-ai/src/graphrag/bounded-graph-reader.ts:97` |
| `knowledge_identity_observation` | KnowledgeIdentityObservation | 1 | getRepository | `packages/server-ai/src/graphrag/structured-graph-writer.ts:35` |
| `knowledge_identity` | KnowledgeIdentity | 1 | getRepository | `packages/server-ai/src/graphrag/structured-graph-writer.ts:48` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`
- **CQRS Handler**（7）：`KnowledgeGraphClearDocumentCommand`、`KnowledgeGraphRetryDocumentCommand`、`KnowledgeGraphEnqueueCommand`、`KnowledgeGraphNodeDetailQuery`、`KnowledgeGraphSearchQuery`、`KnowledgeGraphViewQuery` 等 7

## 归属文件（48）

- `packages/server-ai/src/graphrag/graph-extraction-model.ts`
- `packages/server-ai/src/graphrag/graph-index-job.ts`
- `packages/server-ai/src/graphrag/graph-explorer-model.ts`
- `packages/server-ai/src/graphrag/structured-graph-runtime.service.ts`
- `packages/server-ai/src/graphrag/document-progress.service.ts`
- `packages/server-ai/src/graphrag/graphrag.job.ts`
- `packages/server-ai/src/graphrag/structured-graph-source.ts`
- `packages/server-ai/src/graphrag/graph-extraction-batches.ts`
- `packages/server-ai/src/graphrag/document-progress.ts`
- `packages/server-ai/src/graphrag/index.ts`
- `packages/server-ai/src/graphrag/graph-explorer.ts`
- `packages/server-ai/src/graphrag/graph-extraction.service.ts`
- `packages/server-ai/src/graphrag/graphrag.module.ts`
- `packages/server-ai/src/graphrag/graphrag.controller.ts`
- `packages/server-ai/src/graphrag/graphrag.service.ts`
- `packages/server-ai/src/graphrag/structured-graph-model.ts`
- `packages/server-ai/src/graphrag/bounded-graph-reader.ts`
- `packages/server-ai/src/graphrag/types.ts`
- `packages/server-ai/src/graphrag/identity-write.ts`
- `packages/server-ai/src/graphrag/graph-contribution-writer.ts`
- `packages/server-ai/src/graphrag/graph-projection-writer.ts`
- `packages/server-ai/src/graphrag/structured-graph-writer.ts`
- `packages/server-ai/src/graphrag/commands/knowledge-graph-clear-document.command.ts`
- `packages/server-ai/src/graphrag/commands/knowledge-graph-retry-document.command.ts`
- `packages/server-ai/src/graphrag/commands/index.ts`
- `packages/server-ai/src/graphrag/commands/knowledge-graph-enqueue.command.ts`
- `packages/server-ai/src/graphrag/commands/handlers/clear-document.handler.ts`
- `packages/server-ai/src/graphrag/commands/handlers/retry-document.handler.ts`
- `packages/server-ai/src/graphrag/commands/handlers/index.ts`
- `packages/server-ai/src/graphrag/commands/handlers/enqueue.handler.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-mention.entity.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-community.entity.ts`
- `packages/server-ai/src/graphrag/entities/index.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-relation.entity.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-entity.entity.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-index-job.entity.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-relation-contribution.entity.ts`
- `packages/server-ai/src/graphrag/entities/knowledge-graph-entity-contribution.entity.ts`
- `packages/server-ai/src/graphrag/queries/knowledge-graph-search.query.ts`
- `packages/server-ai/src/graphrag/queries/index.ts`
- ……其余 8 个见 JSON 输出（完整清单）
