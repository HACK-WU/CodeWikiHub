---
groupPath: 数据流/对话与会话
relation: chat_group_interaction
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_group_interaction】
- 实体类型：表（ChatGroupInteraction）
- 结构：唯一索引 `(groupId, interactionId)`；`status`、`claimedBy`、`claimId`、`runId`、`payload`
- 生产方：GroupInteractionsService（HITL 交互创建与 claim）
- 主要消费方：chat-group（HITL claim 与状态推进）、GroupRuntimeService [基于引用扫描，未深入验证]
- 业务用途：人在环（HITL）交互的唯一认领记录（同一 interaction 只能被一个 claim 持有）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md