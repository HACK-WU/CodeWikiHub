---
groupPath: 关联关系/项目与任务协作专家
relation: 项目域-Agent执行链与会话
exportedAt: "2026-10-16T06:44:03.371Z"
---
[强关联] 项目与任务协作专家 与 Agent 执行链专家 + 对话与会话专家（执行派发与回执投影）
强度：必改——改 B 端 Invocation 的启动/回执/状态机或会话 upsert 契约 → 本域派发、投影与验收决策必改；改 A 端派发意图、`dispatchRequestId`/`invocationId` 派生或投影位语义 → B 端启动幂等与回执消费必改
原因：本域**不持有运行时账本**——执行由 `AgentInvocationModule` 与 `XpertAgentExecution` 承载，本域只 pin 出 `invocationId`/`dispatchIntent` 并做**单向回执投影**（`ProjectRuntimeObservationCommand` → `ProjectRuntimeObservationHandler`）；源码注释逐字「Read projection from the associated Invocation, never a second runtime ledger.」
A 端（本域）：`ProjectTaskDispatchService.dispatch/submit`（写 `dispatchState='pending'` + `dispatchIntent`，`submit` 成功后 CAS 成 `submitted`）@ file://packages/server-ai/src/xpert-project/runtime/project-task-dispatch.service.ts
A 端（本域）：`XpertProjectTaskExecution` 三唯一索引 + 投影位（`projectedTaskRevision`/`projectedInvocationRevision`）@ file://packages/server-ai/src/xpert-project/entities/project-task-execution.entity.ts
A 端（本域）：`ProjectRuntimeObservationHandler.execute`（`runtimeTaskStatus` 三映射 + CAS 投影，拦绕锁历史写者）@ file://packages/server-ai/src/xpert-project/runtime/project-runtime-observation.handler.ts
A 端（本域）：`ProjectTaskDecisionService.decide`（业务完成唯一出口）与 `projectTaskInvocationView`（读投影）@ file://packages/server-ai/src/xpert-project/runtime/project-task-decision.service.ts
A 端（本域）：`xpert-task` 执行链 `ChatConversationUpsertCommand → XpertAgentExecutionUpsertCommand → XpertChatCommand`（只透传 `execution.id` 作 runId，不订阅执行状态）@ file://packages/server-ai/src/xpert-task/xpert-task.service.ts
B 端（Agent 执行链专家）：`AgentInvocationEntity`（`agent_invocation`：`revision` 应用层 CAS、`invocation jsonb`、`observationLeaseToken/Until`、`nextObservationAt`）@ file://packages/server-ai/src/agent-invocation/invocation.entity.ts
B 端（Agent 执行链专家）：`XpertAgentExecution` 行 @ file://packages/server-ai/src/xpert-agent-execution/agent-execution.entity.ts
B 端（对话与会话专家）：`ChatConversation`（`projectId`/`taskId`/`xpertId` 列，本域经跨域命令写）@ file://packages/server-ai/src/chat-conversation/conversation.entity.ts
B 端（传递面）：`handoff/runtime-messaging` 的 outbox 与 observation 监视（`ProjectRuntimeObservationCommand` 投递与可靠回执）@ file://packages/server-ai/src/handoff/runtime-messaging/runtime-message-outbox.ts
改哪一侧会连带改另一侧：① 改 B 端 Invocation 的 `revision` 或回执字段 → A 端 `projectedInvocationRevision` 比较与「旧观察不得覆盖新事实」的 CAS 判定必须同步；② 改 A 端 `invocationId = agentInvocationId(scope,'project-task:<requestId>')` 派生 → B 端幂等键与重放语义破裂（重放不得新造 callId）；③ 改会话 upsert 契约 → `xpert_project_task_conversation` 四元组链接与执行行 `conversationId`（易被误读的弱引用）语义要一起复核
边界面：执行行 `conversationId` 是**弱引用**（`onDelete: 'SET NULL'`，语义「这次执行发生在哪个线程」），任务讨论过哪些会话由 `xpert_project_task_conversation`（四元组唯一）承担；会话被删时执行行只丢引用、不丢执行记录
资产与证据：本域 C0-使用总览.md「边界」（不含 Agent 调用/执行账本）与已知问题 10-11；C4-数据流向与消费.md「本域写 vs 跨域投影写」；B 端 .module-experts/后端专题/{Agent 执行链专家,对话与会话专家}/ 与 memory/数据流/Agent 执行链专家/agent_invocation.md