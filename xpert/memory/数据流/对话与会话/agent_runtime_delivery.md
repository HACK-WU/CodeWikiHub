---
groupPath: 数据流/对话与会话
relation: agent_runtime_delivery
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜agent_runtime_delivery】
- 实体类型：表（AgentRuntimeDelivery，运行时投递 outbox）
- 结构：唯一索引 `(messageId)`；`state`、`attempts`、`nextAttemptAt`、`leaseToken`/`leaseUntil`、`lastError`
- 生产方：**appendRuntimeDelivery（必须与 Invocation CAS 同事务）**，经 agent-invocation/typeorm-invocation.store.ts
- 主要消费方：runtime-message-transport.service（lease 后 enqueue 到 handoff 队列）、runtime-message-continuation、runtime-observation-monitor [基于引用扫描，未深入验证]
- 业务用途：运行时结果的持久投递意图（队列故障不能丢弃已提交结果）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md 与 handoff/runtime-messaging/README.md