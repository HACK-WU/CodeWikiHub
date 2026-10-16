---
groupPath: 数据流/知识库专家
relation: knowledge_retrieval_log
exportedAt: "2026-10-16T03:53:30.128Z"
---
【数据流｜knowledge_retrieval_log】\n- 实体类型：表（检索审计）\n- 结构：`query`、`source`、`hitCount`、`requestId`、`filterVersion`、`fixed|dynamic|request|effectiveFilter`(jsonb)、`filterHash`、`filterStatus`、`fallbackReason`、`candidateChunkCount`、`vectorLatency`、`diagnostics`；无唯一索引\n- 生产方：检索链（`KnowledgeSearchQueryHandler` / `KnowledgeDocumentStore` 搜索路径）\n- 主要消费方：knowledgebase(3) `[基于引用扫描，未深入验证]`\n- 业务用途：检索可审计性——过滤回退（`fallbackReason`，如 `invalid_dynamic_filter`）、候选量与时延\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §2