# KnowledgebaseModule（`knowledgebase`）

- **位置**：`packages/server-ai/src/knowledgebase/` · 归属文件 **185** 个 · 约 **30433** 行
- **定义**：`packages/server-ai/src/knowledgebase/knowledgebase.module.ts:78`（nestjs）
- **挂载前缀**：`/api/:knowledgebaseId`、`/api/:knowledgebaseId/faqs` · 视图/接口入口 **43** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/knowledgebase/knowledgebase.controller.ts`（KnowledgebaseController） | `-` | 27 | `:66` |
| `packages/server-ai/src/knowledgebase/faq/knowledge-faq.controller.ts`（KnowledgeFAQController） | `:knowledgebaseId/faqs` | 9 | `:111` |
| `packages/server-ai/src/knowledgebase/tags/knowledge-tag.controller.ts`（KnowledgeTagController） | `:knowledgebaseId` | 7 | `:8` |

## 依赖关系

- **依赖**（改它要连带看）：`CopilotModule`、`DatabaseModule`、`IntegrationModule`、`KnowledgeDocumentModule`、`RagVStoreModule`、`TenantModule`、`UserModule`、`XpertModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatModule`、`GraphragModule`、`KnowledgeDocumentModule`、`KnowledgeIdentityModule`、`KnowledgeWikiModule`、`PluginResourceModule`、`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`、`BullModule`、`JOB_REBUILD_KNOWLEDGEBASE_EMBEDDING`、`JOB_FAQ_SEMANTIC_PREWARM`

## 事件/命令耦合（不经 imports，10 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）
- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）
- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）
- → `FileUploadModule`（CQRS：`UploadFileCommand`）
- → `GraphragModule`（CQRS：`KnowledgeGraphEntitySearchQuery`、`KnowledgeGraphViewQuery`）
- → `IntegrationModule`（CQRS：`GetIntegrationQuery`）
- → `RagVStoreModule`（CQRS：`RagCreateVStoreCommand`）
- → `XpertAgentModule`（CQRS：`ConnectAgentKnowledgebasesCommand`）
- → `XpertModule`（CQRS：`XpertEnqueueTriggerDispatchCommand`、`XpertPublishTriggersCommand`）
- → `XpertWorkspaceModule`（CQRS：`GetXpertWorkspaceQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgeDocumentModule`（`PluginPermissionsCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`PluginPermissionsCommand`）

## 数据表（13）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `knowledgebase` | Knowledgebase | 19 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/knowledgebase.service.ts:325` |
| `knowledge_document` | KnowledgeDocument | 7 | getRepository | `packages/server-ai/src/knowledgebase/analyzer/keyword-title.subscriber.ts:42` |
| `tag` | Tag | 5 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/tags/knowledge-tag.service.ts:29` |
| `knowledge_document_tag` | KnowledgeDocumentTag | 5 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/tags/knowledge-tag.service.ts:150` |
| `knowledgebase_task` | KnowledgebaseTask | 4 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/task/task.service.ts:40` |
| `knowledge_document_chunk` | KnowledgeDocumentChunk | 4 | getRepository | `packages/server-ai/src/knowledgebase/knowledgebase.service.ts:1508` |
| `knowledgebase_tag` | KnowledgebaseTag | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/tags/knowledge-tag.service.ts:84` |
| `knowledge_retrieval_log` | KnowledgeRetrievalLog | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/logs/log.service.ts:16` |
| `knowledge_wiki_page` | KnowledgeWikiPage | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-search-scope.service.ts:21` |
| `knowledge_wiki_page_version` | KnowledgeWikiPageVersion | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-search-scope.service.ts:23` |
| `knowledge_wiki_page_evidence` | KnowledgeWikiPageEvidenceEntity | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-search-scope.service.ts:25` |
| `knowledge_wiki_source_state` | KnowledgeWikiSourceState | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-search-scope.service.ts:27` |
| `xpert` | Xpert | 2 | getRepository | `packages/server-ai/src/knowledgebase/migration/knowledge-filter-v2-migration.service.ts:128` |

## 非 HTTP 入口

- **MQ 消费者**（2）：`(匿名队列)`、`(匿名队列)`
- **CQRS Handler**（28）：`PluginPermissionsCommand`、`WriteAgentKnowledgeChunkCommand`、`GetKnowledgebaseProcessingOptionsCommand`、`DeleteAgentKnowledgeChunksCommand`、`ListKnowledgebaseDocumentsCommand`、`CreateKnowledgebaseFolderCommand` 等 28

## 守卫/权限

`PermissionGuard`、`WorkspaceAuthoringGuard`

## 归属文件（185）

- `packages/server-ai/src/knowledgebase/knowledgebase-writer.middleware.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase.controller.ts`
- `packages/server-ai/src/knowledgebase/citation.ts`
- `packages/server-ai/src/knowledgebase/agent-knowledge-writer.constants.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase.subscriber.ts`
- `packages/server-ai/src/knowledgebase/index.ts`
- `packages/server-ai/src/knowledgebase/retriever.ts`
- `packages/server-ai/src/knowledgebase/embedding-state.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase.service.ts`
- `packages/server-ai/src/knowledgebase/parser-settings.service.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase-rebuild-embedding.job.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase.entity.ts`
- `packages/server-ai/src/knowledgebase/types.ts`
- `packages/server-ai/src/knowledgebase/knowledgebase.module.ts`
- `packages/server-ai/src/knowledgebase/vector-store.ts`
- `packages/server-ai/src/knowledgebase/retrieval-settings-validation.ts`
- `packages/server-ai/src/knowledgebase/analyzer/keyword-query.ts`
- `packages/server-ai/src/knowledgebase/analyzer/basic.strategy.ts`
- `packages/server-ai/src/knowledgebase/analyzer/keyword-chunk.subscriber.ts`
- `packages/server-ai/src/knowledgebase/analyzer/keyword-title.subscriber.ts`
- `packages/server-ai/src/knowledgebase/analyzer/keyword-lexemes.ts`
- `packages/server-ai/src/knowledgebase/analyzer/keyword-analyzer.service.ts`
- `packages/server-ai/src/knowledgebase/catalog/knowledgebase-catalog.schema.ts`
- `packages/server-ai/src/knowledgebase/catalog/knowledgebase-catalog-access.service.ts`
- `packages/server-ai/src/knowledgebase/catalog/knowledgebase-catalog.service.ts`
- `packages/server-ai/src/knowledgebase/commands/delete-agent-knowledge-chunks.command.ts`
- `packages/server-ai/src/knowledgebase/commands/knowledgebase-documents.command.ts`
- `packages/server-ai/src/knowledgebase/commands/index.ts`
- `packages/server-ai/src/knowledgebase/commands/write-agent-knowledge-chunk.command.ts`
- `packages/server-ai/src/knowledgebase/commands/plugin-permissions.command.ts`
- `packages/server-ai/src/knowledgebase/commands/ensure-knowledgebases.command.ts`
- `packages/server-ai/src/knowledgebase/commands/knowledge.clear.command.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/plugin-permissions.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/write-agent-knowledge-chunk.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/knowledgebase-processing-options.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/index.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/delete-agent-knowledge-chunks.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/knowledgebase-documents.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/knowledge.clear.handler.ts`
- `packages/server-ai/src/knowledgebase/commands/handlers/ensure-knowledgebases.handler.ts`
- ……其余 145 个见 JSON 输出（完整清单）
