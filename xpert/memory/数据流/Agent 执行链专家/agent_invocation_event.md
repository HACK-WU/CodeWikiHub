---
groupPath: 数据流/Agent 执行链专家
relation: agent_invocation_event
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜agent_invocation_event】\n- 实体类型：append-only 观察历史\n- 结构：表 `agent_invocation_event`；**唯一索引 `(invocationId, revision)`**；列 `invocationId`(uuid，FK→`agent_invocation(id)` CASCADE)、`ownerId`、`revision`、`observation`(jsonb，**仅存 `status/handle/interaction/progress/result/error`**)；**无 `type`/`createdAt` 自定义列**（注释明确忽略它们）\n- 生产方：`TypeOrmAgentInvocationStore.replace` 同事务 `appendEvent`\n- 主要消费方：agent-invocation（唯一注册方）`[基于引用扫描，未深入验证]`\n- 业务用途：事件级幂等兜底与审计；**重复 revision 直接约束报错并回滚整个 `replace` 事务**（即事件表是 CAS 的守门人）\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §2