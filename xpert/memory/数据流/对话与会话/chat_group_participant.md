---
groupPath: 数据流/对话与会话
relation: chat_group_participant
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜chat_group_participant】
- 实体类型：表（ChatGroupParticipant）
- 结构：唯一索引 `(groupId, kind, subjectId)`；`role`、`active`、**`runtimeConversationId` / `runtimeThreadId`**（群内 Agent 成员各持运行时会话/线程）、`principalUserId`、`contextSequence`/`readSequence`、`pinned`、`archived`
- 生产方：GroupMembersService（增删成员）；GroupRuntimeService（分配 runtimeConversationId/runtimeThreadId）；GroupControlService
- 主要消费方：chat-group（发送/发布/投影/偏好）、ai（/api/ai/groups 适配）、GroupAccessService [基于引用扫描，未深入验证]
- 业务用途：群成员模型与运行时会话绑定（决定成员可见投影与上下文序列）
- 详细流向：见 .module-experts/后端专题/对话与会话专家/C4-数据流向与消费.md