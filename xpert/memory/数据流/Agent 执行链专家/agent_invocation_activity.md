---
groupPath: 数据流/Agent 执行链专家
relation: agent_invocation_activity
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜agent_invocation_activity_state / _item】\n- 实体类型：活动流游标账本（一个 Invocation 一行）+ 不可变切片\n- 结构：`_state`：`id`(uuid PK，FK→`agent_invocation(id)` CASCADE)、`seq`、**`bytes`（容量语义）**、`sourceCursor`、`closed`、`expiresAt`、`expired`、**`gaps`(jsonb，缺口显式记录)**；`_item`：**唯一 `(invocationId, seq)`** + 普通索引 `(invocationId, itemId, seq)`；列 `invocationId`(FK CASCADE)、`seq`、`firstSeq`、`itemId`、`hash`、`item`(jsonb)\n- 生产方：`InvocationActivityService`（写入时累积 `bytes`/`gaps`）\n- 主要消费方：agent-invocation（唯一注册方）`[基于引用扫描，未深入验证]`\n- 业务用途：为长任务输出提供**有界、可声明缺口**的观察游标；`gaps` 让「丢了多少」可查询而不是隐式\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §3