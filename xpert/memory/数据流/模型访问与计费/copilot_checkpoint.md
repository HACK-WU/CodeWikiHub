---
groupPath: 数据流/模型访问与计费
relation: copilot_checkpoint
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜copilot_checkpoint】
- 实体类型：表（LangGraph 检查点）+ copilot_checkpoint_writes（pending writes）
- 结构：thread_id、checkpoint_ns、checkpoint_id、parent_id、type、checkpoint/metadata（bytea）；writes 含 thread_id/task_id/idx/channel/value
- 生产方：CopilotCheckpointController.create / createWrites（POST /api/copilot-checkpoint[/writes]，先过 AssertChatConversationAccessQuery）
- 主要消费方：chat-conversation（7 次 + writes 3 次）、copilot-checkpoint（7 次 + 5 次）、conversation-branch（1 次）[基于引用扫描，未深入验证]
- 业务用途：会话图状态快照与待应用写入；RetentionService @Cron('0 0 3 * * *') 清理（PG advisory lock）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md