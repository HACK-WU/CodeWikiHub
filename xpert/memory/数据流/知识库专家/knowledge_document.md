---
groupPath: 数据流/知识库专家
relation: knowledge_document
exportedAt: "2026-10-16T03:53:30.128Z"
---
【数据流｜knowledge_document】\n- 实体类型：表（`@Tree('closure-table')`，文档主行）\n- 结构：`sourceType/sourceConfig/sourceKey(512)/sourceHash(64)/processingHash(64)/contentHash(64)`、`publicationEpoch`(int 默认 0)、`hardDeletePendingAt`、`status/progress/processMsg`、`version`(`@VersionColumn`)、`tagRevision`/`autoTaggingInputHash`（`select:false`）、`metadata`(jsonb)/`options`(json)；索引 `IDX_knowledge_document_kb_source_hash`、`_kb_source_key`、`_kb_hard_delete_pending` 等\n- 生产方：`POST /api/knowledge-document`（createDocument）/ `bulk`（createBulkWithIncrementalSync）/ `connect`\n- 主要消费方：knowledge-document(11)、knowledge-processing-lifecycle(10)、knowledge-wiki(10)、graphrag(7)、knowledgebase(7)、knowledge-identity(1) `[基于引用扫描，未深入验证]`\n- 业务用途：文档主行——**幂等三元组**（sourceKey/sourceHash/processingHash）、发布位点（publicationEpoch）、摄取状态与元数据；读取侧统一过滤 `hardDeletePendingAt IS NULL`\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §3