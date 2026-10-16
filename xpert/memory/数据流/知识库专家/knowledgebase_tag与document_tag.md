---
groupPath: 数据流/知识库专家
relation: knowledgebase_tag与document_tag
exportedAt: "2026-10-16T03:53:30.128Z"
---
【数据流｜knowledgebase_tag 与 knowledge_document_tag】\n- 实体类型：两张关联表（KB 选中标签 / 文档级标签归属）\n- 结构：`knowledgebase_tag`：`knowledgebaseId`+`tagId`，唯一 `UQ_knowledgebase_tag(knowledgebaseId,tagId)`，Tag 侧 `RESTRICT`；`knowledge_document_tag`：`documentId`+`tagId`+`source`(默认 `manual`，含 `automatic`)+`confidence`(float)，唯一 `UQ_knowledge_document_tag(documentId,tagId)`\n- 生产方：KB 选中走 `PUT|DELETE :knowledgebaseId/tags/:tagId`；文档标注走手工端点 + **自动打标消费者**（队列 `knowledge-automatic-tagging`）\n- 主要消费方：knowledgebase(3/5) `[基于引用扫描，未深入验证]`\n- 业务用途：标签定义归组织目录（`tag` 表），两张关联表只保存归属；文档侧记录人工/自动来源与置信度\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §2