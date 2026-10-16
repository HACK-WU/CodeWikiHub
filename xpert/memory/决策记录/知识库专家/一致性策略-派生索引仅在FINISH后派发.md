---
groupPath: 决策记录/知识库专家
relation: 一致性策略-派生索引仅在FINISH后派发
exportedAt: "2026-10-16T03:53:30.130Z"
---
【决策记录｜派生索引只在源文档 durable FINISH 之后派发】\n- 分类：一致性策略\n- 动机：派生索引（tags / questions / graph / wiki）都以 chunk 内容为输入；只有源文档已持久化终态，派发才有稳定输入\n- 决策：派发收敛到单一入口 `KnowledgeDerivedIndexPublicationService.publish`，类级逐字：「Dispatches optional derived indexes only after the source document is durably FINISH.」；派发时以 `contentChanged` 分流——为真发 `KnowledgeGraphEnqueueCommand` / `KnowledgeWikiEnqueueSourceCommand`；为假只发 `KnowledgeGraphRetryDocumentCommand`（保留重试语义而不重跑抽取）\n- 背景约束：主链（document → chunk → vector）要求 durable，派生侧接受最终一致；二者不能同事务（派生要调模型与外部队列）\n- 被否决方案：无\n- 重新评估触发条件：出现「主链与派生索引强一致」诉求（如合规要求标签与文档同时可见）\n- 关联代码：`KnowledgeDerivedIndexPublicationService.publish`；派发目标 `KnowledgeAutoTaggingEnqueueCommand` / `KnowledgeQuestionsEnqueueCommand` / `KnowledgeGraphEnqueueCommand` / `KnowledgeGraphRetryDocumentCommand` / `KnowledgeWikiEnqueueSourceCommand`\n- 证据来源：derived-index-publication.service.ts（类级 JSDoc 逐字 + publish 实现）