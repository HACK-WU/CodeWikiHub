---
groupPath: 数据流/知识库专家
relation: knowledge_graph索引与贡献
exportedAt: "2026-10-16T03:53:30.129Z"
---
【数据流｜knowledge_graph 索引 job 与来源贡献（3 表）】\n- 实体类型：三张表（index_job / entity_contribution / relation_contribution）\n- 结构：`knowledge_graph_index_job`：`documentId`(SET NULL)、`sourceContentHash(128)`、`sourcePublicationEpoch`、`extractionSnapshot`(jsonb，`select:false`)、`dispatchError`、`type(30)`、`status(30，默认 QUEUED)`、`stage`、`result`、`revision`、`totalChunks/processedChunks`，索引 `(knowledgebaseId, documentId, status)`；`_entity_contribution` / `_relation_contribution`：`sourceDocumentIdSnapshot`、`sourceContentHash(128)`、`sourcePublicationEpoch`、属性列、`revision`，**唯一含 `sourceDocumentIdSnapshot`**\n- 生产方：`GraphragService.enqueueDocuments` / `dispatchJobs`（job）与结构化写图（贡献）\n- 主要消费方：graphrag(job 24 / contribution 各 6) `[基于引用扫描，未深入验证]`\n- 业务用途：图谱索引的队列化 job 与进度；贡献表按**来源文档快照**定格属性，使图谱可从来源重建而不丢溯源\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §6