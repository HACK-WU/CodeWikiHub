---
groupPath: 关联关系/对话与会话
relation: 运行时投递-执行链Invocation
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 运行时投递（delivery/inbox）与 执行链 Invocation（跨专家）
强度：必改——改 `agent_runtime_delivery` / `agent_runtime_inbox` 的列语义或认领状态机（state/claim/phase=reserved|started/consumptionKey）→ agent-invocation 域（typeorm-invocation.store 的 CAS）必改；改 Invocation 终态/事件派生规则 → 本域 outbox 与续跑必改
原因：`appendRuntimeDelivery` **必须与 Invocation CAS 同事务**（队列故障不能丢弃已提交结果）；inbox 幂等键与 Invocation executionId 绑定

投递端：
- runtime-message-outbox.ts（appendRuntimeDelivery）@ packages/server-ai/src/handoff/runtime-messaging/
- RuntimeMessageInboxService.receive/lockInbox/claimWait @ packages/server-ai/src/handoff/runtime-messaging/runtime-message-inbox.service.ts
- runtime-message.entity.ts（AgentRuntimeDelivery / AgentRuntimeInbox）@ packages/server-ai/src/handoff/runtime-messaging/

执行链端：
- TypeormInvocationStore（CAS）@ packages/server-ai/src/agent-invocation/typeorm-invocation.store.ts
- RuntimeDeliveryController（delivery/redrive，物理注册在 agent-invocation.module.ts）@ packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts