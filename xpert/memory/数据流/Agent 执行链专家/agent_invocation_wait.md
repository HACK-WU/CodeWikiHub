---
groupPath: 数据流/Agent 执行链专家
relation: agent_invocation_wait
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜agent_invocation_wait】\n- 实体类型：有界等待/依赖组状态机\n- 结构：表 `agent_invocation_wait`（表名保留历史单任务 checkpoint 语义，**与当前语义已错位**）；索引 `(state, nextCheckAt)` 与 gin `(request->'taskIds')`；列 `state`(**`waiting|ready|delivered|stale|blocked`，唯一 CHECK 约束所在**)、`request`(jsonb = `TaskWaitRequest & scope`)、`outcome`、`deadlineAt`、`unknownSince`、`nextCheckAt`(**NOT NULL**)、`leaseToken/leaseUntil`、`lastError`\n- 生产方：`AgentInvocationWaitStore.register/registerTasks`；`replace` 同事务推进 `nextCheckAt`\n- 主要消费方：agent-invocation（唯一注册方）`[基于引用扫描，未深入验证]`\n- 业务用途：让 Agent **有界观察**依赖任务，超窗返回 `pending` 而不挂父级；只有人工交互才挂起父级\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §3