# KnowledgeWikiModule（`knowledge-wiki`）

- **位置**：`packages/server-ai/src/knowledgebase/wiki/` · 归属文件 **72** 个 · 约 **8357** 行
- **定义**：`packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.module.ts:61`（nestjs）
- **挂载前缀**：`/api/:knowledgebaseId/wiki` · 视图/接口入口 **18** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.controller.ts`（KnowledgeWikiController） | `:knowledgebaseId/wiki` | 7 | `:17` |
| `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-organization.controller.ts`（KnowledgeWikiOrganizationController） | `:knowledgebaseId/wiki` | 11 | `:30` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`KnowledgeDocumentModule`、`KnowledgeIdentityModule`、`KnowledgebaseModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`BullModule`、`JOB_KNOWLEDGE_WIKI_GENERATION`

## 事件/命令耦合（不经 imports，1 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgeDocumentModule`（`KnowledgeWikiRetractSourceCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`KnowledgeWikiRetractSourceCommand`）

## 数据表（18）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `knowledge_wiki_job` | KnowledgeWikiJob | 43 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-reconciler.service.ts:23` |
| `knowledge_wiki_page` | KnowledgeWikiPage | 24 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-reconciler.service.ts:25` |
| `knowledgebase` | Knowledgebase | 19 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-reconciler.service.ts:27` |
| `knowledge_wiki_page_version` | KnowledgeWikiPageVersion | 16 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts:53` |
| `knowledge_wiki_source_state` | KnowledgeWikiSourceState | 14 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts:63` |
| `knowledge_wiki_folder` | KnowledgeWikiFolder | 11 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-browse.service.ts:166` |
| `knowledge_wiki_page_contribution` | KnowledgeWikiPageContribution | 11 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-link.service.ts:35` |
| `knowledge_document` | KnowledgeDocument | 10 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-identity-resolver.service.ts:176` |
| `knowledge_wiki_model_invocation` | KnowledgeWikiModelInvocation | 9 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts:61` |
| `knowledge_wiki_source_map_result` | KnowledgeWikiSourceMapResult | 9 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-identity-resolver.service.ts:26` |
| `knowledge_wiki_placement` | KnowledgeWikiPlacement | 8 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-browse.service.ts:128` |
| `knowledge_wiki_page_link` | KnowledgeWikiPageLinkEntity | 8 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts:57` |
| `knowledge_wiki_page_evidence` | KnowledgeWikiPageEvidenceEntity | 7 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts:55` |
| `knowledge_document_chunk` | KnowledgeDocumentChunk | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-projection.service.ts:33` |
| `knowledge_wiki_page_reduce_input` | KnowledgeWikiPageReduceInput | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-page-reduce.service.ts:48` |
| `knowledge_wiki_page_reduce_input_source` | KnowledgeWikiPageReduceInputSource | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-page-reduce.service.ts:50` |
| `knowledge_wiki_projection_state` | KnowledgeWikiProjectionState | 3 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-projection.service.ts:37` |
| `knowledge_wiki_taxonomy` | KnowledgeWikiTaxonomy | 2 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-organization.service.ts:45` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`
- **CQRS Handler**（2）：`KnowledgeWikiEnqueueSourceCommand`、`KnowledgeWikiRetractSourceCommand`
- **定时任务**：1 处

## 归属文件（72）

- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-document-progress-query.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-reconciler.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-identity.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.job.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-classification.outbox.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-error.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-organization.utils.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-document-progress.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-link.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-dedup.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-search-scope.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-config.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-content-quality.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-index.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-job-dispatcher.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-browse.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/index.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-job-lease.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-finalize.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-identity-resolver.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-taxonomy.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-taxonomy.model.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-projection.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-generation.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-generation.utils.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-rebuild-coordinator.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-dedup-model.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-job-current.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-job-fence.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/types.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-classification.model.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-retraction.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-model-invocation.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-organization.controller.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-classification.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-organization.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-page-scheduler.service.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki-configuration.ts`
- `packages/server-ai/src/knowledgebase/wiki/knowledge-wiki.module.ts`
- ……其余 32 个见 JSON 输出（完整清单）
