---
groupPath: 数据流/知识库专家
relation: knowledge_document_page与chunk
exportedAt: "2026-10-16T03:53:30.128Z"
---
【数据流｜knowledge_document_page 与 knowledge_document_chunk】\n- 实体类型：两张表（页级快照 / 最小文本单元，均为 `@Tree('closure-table')`）\n- 结构：`knowledge_document_page`：`pageContent`、`metadata`(json)、`status`(`wasted|validate|running|cancel|finish|error`)，实体注释标 **`@deprecated use chunks instead`**；`knowledge_document_chunk`：`pageContent`、`contentHash(64)`、`keywordVector`(tsvector，`select:false`)、`metadata`(jsonb)、`version`(`@VersionColumn`)、`status`，索引 `IDX_knowledge_document_chunk_doc_content_hash`\n- 生产方：页由解析阶段写入；chunk 由消费者 `syncChunksIncrementally` 写入（chunk 级幂等键 = `contentHash` + exact/position match）\n- 主要消费方：chunk → knowledge-document(9)、knowledge-processing-lifecycle(8)、knowledgebase(4，检索侧 JOIN)、knowledge-wiki(3)、graphrag(1) `[基于引用扫描，未深入验证]`\n- 业务用途：检索与图谱抽取的最小单元；页表现在只为预览与资产流保留\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §3