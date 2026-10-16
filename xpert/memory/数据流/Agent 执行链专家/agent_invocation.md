---
groupPath: 数据流/Agent 执行链专家
relation: agent_invocation
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜agent_invocation】\n- 实体类型：运行时账本（`AgentInvocationEntity extends TenantOrganizationBaseEntity`）\n- 结构：表 `agent_invocation`；关键列 `ownerId`、**`revision`（CAS 版本，int default 0，应用层乐观锁，不是 `@VersionColumn`）**、`invocation`(jsonb)、`providerSource`(jsonb，固定策略快照)、`nextObservationAt`、`observationLeaseToken/observationLeaseUntil`、`observationError`；索引 `(tenantId,organizationId,ownerId)` + `IDX_invocation_observation_due(nextObservationAt)`\n- 生产方：`AgentInvocationRuntime.start/save`（唯一状态写入面）与 `TypeOrmAgentInvocationStore.insert/replace`\n- 主要消费方：agent-invocation、xpert-project、xpert-project-access、handoff-queue、chat-group、model-execution（6 个，归纳为「本域运行时 + 项目投影/鉴权 + 传输与执行面」）`[基于引用扫描，未深入验证]`\n- 业务用途：一次逻辑调用操作的授权、幂等键、pin 快照与状态机载体；**任何绕过 store 直写 `invocation` 列的代码都会静默破坏一致性**（唯一约束只保护事件表）\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §2