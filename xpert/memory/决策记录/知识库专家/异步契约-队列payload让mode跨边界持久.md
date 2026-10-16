---
groupPath: 决策记录/知识库专家
relation: 异步契约-队列payload让mode跨边界持久
exportedAt: "2026-10-16T03:53:30.130Z"
---
【决策记录｜队列 payload 让处理模式跨 HTTP / worker 边界持久】\n- 分类：异步契约 / 幂等\n- 动机（避坑）：**现象** `mode` 若只作为 HTTP 请求参数，消费者侧无从得知本次走 `full` 还是 `rechunk`。**后果** 「重新切但复用转换快照」的意图丢失——要么退化成全量重跑（浪费转换器与视觉模型成本），要么错误复用快照\n- 决策：把 `mode?: KnowledgeDocumentProcessingMode` 放进 job data，由 `startProcessing(ids, kbId, mode)` 显式携带。源码逐字：「Queue payload keeps processing mode durable across the HTTP/background-worker boundary.」\n- 背景约束：Bull 任务体是唯一携带上下文的地方；消费者不持有原 HTTP 请求\n- 被否决方案：无\n- 重新评估触发条件：处理模式改由文档行上的列（而非 payload）持久化\n- 关联代码：`type KnowledgeDocumentJobData = { userId; docs; mode? }`；`KnowledgeDocumentService.startProcessing`；`KnowledgeDocumentConsumer`\n- 证据来源：document.job.ts（`KnowledgeDocumentJobData` 上方 JSDoc 逐字）