---
groupPath: 决策记录/对话与会话
relation: 架构设计-inbox与Invocation CAS同事务
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜outbox/inbox 与 Invocation CAS 同事务】
- 分类：架构设计
- 动机：避坑——现象：先把结果写进 Invocation、再单独入队通知；后果：队列或 Redis 抖动发生在两次写之间时，已提交的运行时结果永久丢失且无重试入口（Invocation 已是终态）
- 决策：appendRuntimeDelivery(manager, invocation) 必须与 Invocation CAS 在**同一事务**内执行，用 orIgnore() 幂等插入；RuntimeMessageInboxService.receive 同样把 lockInbox、input_request 的 processed/superseded 标记、delivery 置 received 放在同一事务
- 背景约束：事件只由 Invocation 事实派生（终态出 result、waiting 且有 interaction 出 input_request，progress 不产出）；messageId = runtime-{invocationId}-{kind}-{revision} 保证同版本重复提交被 orIgnore 吞掉
- 被否决方案：无（单向架构承诺，非方案比选）
- 重新评估触发条件：CAS 事务写放大成为瓶颈需把 outbox 拆出事务 —— 届时必须补「Invocation 终态 → 补投递意图」的对账扫描
- 关联代码：runtime-messaging/runtime-message-outbox.ts、agent-invocation/typeorm-invocation.store.ts、runtime-message-inbox.service.ts
- 证据来源：runtime-message-outbox.ts 逐字注释（Must share the Invocation CAS transaction: a queue outage cannot discard a committed result.）+ runtime-messaging/README.md