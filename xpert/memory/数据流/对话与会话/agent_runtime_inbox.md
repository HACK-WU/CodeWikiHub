---
groupPath: 数据流/对话与会话
relation: agent_runtime_inbox
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜agent_runtime_inbox】
- 实体类型：表（AgentRuntimeInbox，运行时消息 inbox）
- 结构：唯一索引 `(tenantId, organizationId, ownerId, consumptionKey)`；`messageId`、`invocationId`、`state`、`claim`、**`phase(reserved|started)`**、`attempts`、`lease`、`lastError`
- 生产方：RuntimeMessageProcessor（`@HandoffProcessorStrategy(AGENT_RUNTIME_EVENT_MESSAGE_TYPE)`）→ RuntimeMessageInboxService.receive/lockInbox
- 主要消费方：RuntimeMessageInboxService.claimWait（认领与等待）、runtime-message-continuation（续跑）、ClaimAgentRuntimeResultsCommand、ProjectRuntimeObservationCommand、runtime-observation-monitor [基于引用扫描，未深入验证]
- 业务用途：**幂等消费的收件箱**（lost ack 会重发，重复由唯一键 + orIgnore 吞掉）；`reserved` 可复用同 execution ID、`started` 后只查该执行；模糊结果 `consumer_outcome_unknown` 不重放
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md 与 handoff/runtime-messaging/README.md