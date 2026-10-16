# KnowledgeDocumentModule（`knowledge-document`）

- **位置**：`packages/server-ai/src/knowledge-document/` · 归属文件 **65** 个 · 约 **12128** 行
- **定义**：`packages/server-ai/src/knowledge-document/document.module.ts:42`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `count`、`pagination`、`my` 等 6 个 · 视图/接口入口 **41** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/knowledge-document/document.controller.ts`（KnowledgeDocumentController） | `-` | 38 | `:189` |
| `packages/server-ai/src/knowledge-document/questions/question-generation.controller.ts`（KnowledgeQuestionGenerationController） | `-` | 3 | `:7` |

## 依赖关系

- **依赖**（改它要连带看）：`CopilotModelModule`、`CopilotModule`、`IntegrationModule`、`KnowledgeProcessingLifecycleModule`、`KnowledgebaseModule`、`RuntimeCapabilityModule`、`StorageFileModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`GraphragModule`、`KnowledgeWikiModule`、`KnowledgebaseModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`、`BullModule`、`JOB_KNOWLEDGE_AUTO_TAGGING`、`JOB_EMBEDDING_DOCUMENT`、`JOB_KNOWLEDGE_QUESTIONS`

## 事件/命令耦合（不经 imports，6 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）
- → `GraphragModule`（CQRS：`KnowledgeGraphClearDocumentCommand`）
- → `KnowledgeWikiModule`（CQRS：`KnowledgeWikiRetractSourceCommand`）
- → `KnowledgebaseModule`（CQRS：`PluginPermissionsCommand`）
- → `RagWebModule`（CQRS：`GetRagWebDocCacheQuery`、`GetRagWebOptionsQuery`、`RagWebLoadCommand`）
- → `SuperAdminOrganizationScopeModule`（CQRS：`LoadStorageSheetCommand`）

## 数据表（8）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `knowledge_document` | KnowledgeDocument | 11 | @Module imports forFeature | `packages/server-ai/src/knowledge-document/document.service.ts:360` |
| `knowledge_document_chunk` | KnowledgeDocumentChunk | 9 | @Module imports forFeature | `packages/server-ai/src/knowledge-document/chunk/chunk.service.ts:31` |
| `knowledge_document_page` | KnowledgeDocumentPage | 3 | @Module imports forFeature | `packages/server-ai/src/knowledge-document/document.service.ts:347` |
| `knowledge_document_deletion_intent` | KnowledgeDocumentDeletionIntent | 1 | @Module imports forFeature | `-` |
| `knowledge_document_deletion_cleanup_receipt` | KnowledgeDocumentDeletionCleanupReceipt | 1 | @Module imports forFeature | `-` |
| `knowledge_document_publication_attempt` | KnowledgeDocumentPublicationAttempt | 1 | @Module imports forFeature | `-` |
| `knowledge_document_publication_attempt_source` | KnowledgeDocumentPublicationAttemptSource | 1 | @Module imports forFeature | `-` |
| `knowledgebase` | Knowledgebase | 1 | getRepository | `packages/server-ai/src/knowledge-document/document.subscriber.ts:36` |

## 非 HTTP 入口

- **MQ 消费者**（3）：`(匿名队列)`、`(匿名队列)`、`(匿名队列)`
- **CQRS Handler**（3）：`KnowledgeDocLoadCommand`、`KnowledgeQuestionsEnqueueCommand`、`KnowledgeAutoTaggingEnqueueCommand`

## 归属文件（65）

- `packages/server-ai/src/knowledge-document/document-import.service.ts`
- `packages/server-ai/src/knowledge-document/table-metadata-input.ts`
- `packages/server-ai/src/knowledge-document/spreadsheet-document.ts`
- `packages/server-ai/src/knowledge-document/document.service.ts`
- `packages/server-ai/src/knowledge-document/parser-diagnostics.ts`
- `packages/server-ai/src/knowledge-document/document-publication.ts`
- `packages/server-ai/src/knowledge-document/derived-index-publication.service.ts`
- `packages/server-ai/src/knowledge-document/analysis-snapshot.service.ts`
- `packages/server-ai/src/knowledge-document/document.subscriber.ts`
- `packages/server-ai/src/knowledge-document/processing-lifecycle.module.ts`
- `packages/server-ai/src/knowledge-document/document.job.ts`
- `packages/server-ai/src/knowledge-document/index.ts`
- `packages/server-ai/src/knowledge-document/token-limited-chunks.ts`
- `packages/server-ai/src/knowledge-document/visual-assets-runtime.service.ts`
- `packages/server-ai/src/knowledge-document/document.controller.ts`
- `packages/server-ai/src/knowledge-document/parser-provider.ts`
- `packages/server-ai/src/knowledge-document/document-list-filter.ts`
- `packages/server-ai/src/knowledge-document/document.entity.ts`
- `packages/server-ai/src/knowledge-document/chunk-language.ts`
- `packages/server-ai/src/knowledge-document/document.module.ts`
- `packages/server-ai/src/knowledge-document/split-documents.ts`
- `packages/server-ai/src/knowledge-document/parser-config.ts`
- `packages/server-ai/src/knowledge-document/document-hash.ts`
- `packages/server-ai/src/knowledge-document/chunking-revision.ts`
- `packages/server-ai/src/knowledge-document/types.ts`
- `packages/server-ai/src/knowledge-document/document-chunk-order.ts`
- `packages/server-ai/src/knowledge-document/embedding-input-guard.ts`
- `packages/server-ai/src/knowledge-document/execute-splitter.ts`
- `packages/server-ai/src/knowledge-document/document-management.ts`
- `packages/server-ai/src/knowledge-document/parser-error.ts`
- `packages/server-ai/src/knowledge-document/transform-snapshot.service.ts`
- `packages/server-ai/src/knowledge-document/parser-validation.ts`
- `packages/server-ai/src/knowledge-document/tenant-library-read.ts`
- `packages/server-ai/src/knowledge-document/chunk/chunk.service.ts`
- `packages/server-ai/src/knowledge-document/chunk/chunk.entity.ts`
- `packages/server-ai/src/knowledge-document/commands/index.ts`
- `packages/server-ai/src/knowledge-document/commands/load.command.ts`
- `packages/server-ai/src/knowledge-document/commands/handlers/index.ts`
- `packages/server-ai/src/knowledge-document/commands/handlers/load.handler.ts`
- `packages/server-ai/src/knowledge-document/deletion/entities.ts`
- ……其余 25 个见 JSON 输出（完整清单）
