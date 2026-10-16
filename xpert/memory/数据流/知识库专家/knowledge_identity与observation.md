---
groupPath: 数据流/知识库专家
relation: knowledge_identity与observation
exportedAt: "2026-10-16T03:53:30.129Z"
---
【数据流｜knowledge_identity 与 knowledge_identity_observation】\n- 实体类型：两张表（归一身份 / 观察记录）\n- 结构：`knowledge_identity`：`knowledgebaseId`(CASCADE)、`kind(32)`、`embedding`(jsonb，注释标为**可丢弃缓存**)、`revision`(默认 1)，索引 `(knowledgebaseId, kind)`（**非唯一**）；`knowledge_identity_observation`：`sourceDocumentIdSnapshot`、`sourceContentHash(128)`、`sourcePublicationEpoch`、`consumer(wiki|graph)`、`extractionId`、`isCurrent`(默认 true)、`candidateKey(512)`、`payload`(jsonb)、`decision`(jsonb)，唯一 `(knowledgebaseId, sourceKey)`\n- 生产方：`KnowledgeIdentityService.resolve/resolveBatch/judge/lockSource/assertSource`\n- 主要消费方：knowledge-identity(4)、graphrag(1) `[基于引用扫描，未深入验证]`\n- 业务用途：**观察记录而非任一投影拥有持久身份归属**（「Observations, not either projection, own durable identity assignments」）；仅 `isCurrent` 提供有效证据；`embedding` 是可丢弃缓存\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §7