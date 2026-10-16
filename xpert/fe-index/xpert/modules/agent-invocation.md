# AgentInvocationModule（`agent-invocation`）

- **位置**：`packages/server-ai/src/agent-invocation/` · 归属文件 **59** 个 · 约 **7295** 行
- **定义**：`packages/server-ai/src/agent-invocation/agent-invocation.module.ts:47`（nestjs）
- **挂载前缀**：`/api/agent-invocations`、`/api/agent-runtime-bindings` · 视图/接口入口 **8** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts`（RuntimeDeliveryController） | `agent-invocations` | 2 | `:15` |
| `packages/server-ai/src/agent-invocation/runtime-bindings.controller.ts`（AgentRuntimeBindingsController） | `agent-runtime-bindings` | 3 | `:25` |
| `packages/server-ai/src/agent-invocation/invocations.controller.ts`（AgentInvocationsController） | `agent-invocations` | 3 | `:17` |

## 依赖关系

- **依赖**（改它要连带看）：`ArtifactsModule`
- **被依赖**（动它会影响）：`XpertAgentModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，5 出 / 1 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AIModule`（CQRS：`RunCreateStreamCommand`）
- → `ChatGroupModule`（CQRS：`ExecuteGroupTaskCommand`、`ListGroupTaskTargetsCommand`、`ResolveGroupTaskTargetCommand`）
- → `HandoffQueueModule`（CQRS：`ClaimAgentRuntimeResultsCommand`）
- → `XpertAgentExecutionModule`（CQRS：`AssertXpertAgentExecutionAccessQuery`、`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`GetXpertWorkflowQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ChatConversationModule`（`CancelTaskWaitsCommand`）

## 数据表（15）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `agent_invocation` | AgentInvocationEntity | 17 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/typeorm-invocation.store.ts:16` |
| `agent_runtime_inbox` | AgentRuntimeInbox | 11 | @Module imports forFeature | `packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts:50` |
| `agent_runtime_delivery` | AgentRuntimeDelivery | 7 | @Module imports forFeature | `packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts:38` |
| `xpert_agent_execution` | XpertAgentExecution | 7 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/invocation-monitor.service.ts:43` |
| `agent_invocation_activity_state` | InvocationActivityState | 6 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/activity/activity.service.ts:34` |
| `agent_runtime_binding` | AgentRuntimeBindingEntity | 6 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/runtime-bindings.controller.ts:28` |
| `agent_invocation_activity_item` | InvocationActivityItem | 4 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/activity/activity.service.ts:55` |
| `user` | User | 4 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/invocation-monitor.service.ts:41` |
| `user_organization` | UserOrganization | 4 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/invocation-monitor.service.ts:42` |
| `agent_invocation_wait` | AgentInvocationWaitEntity | 3 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/invocation-wait.store.ts:19` |
| `chat_conversation_thread` | ChatConversationThread | 3 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:155` |
| `agent_invocation_event` | AgentInvocationEventEntity | 2 | @Module imports forFeature | `packages/server-ai/src/agent-invocation/typeorm-invocation.store.ts:113` |
| `xpert_workspace` | XpertWorkspace | 1 | getRepository | `packages/server-ai/src/agent-invocation/runtime-bindings.controller.ts:44` |
| `xpert_project` | XpertProject | 1 | getRepository | `packages/server-ai/src/agent-invocation/invocation-factory.service.ts:149` |
| `chat_conversation` | ChatConversation | 1 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:123` |

## 非 HTTP 入口

- **CQRS Handler**（5）：`TaskObservationCommittedEvent`、`CancelTaskWaitsCommand`、`CheckTaskWaitClaimQuery`、`RequestRuntimeResultCheckCommand`、`ClaimAgentRuntimeResultsCommand`
- **定时任务**：6 处

## 归属文件（59）

- `packages/server-ai/src/agent-invocation/invocation-store.ts`
- `packages/server-ai/src/agent-invocation/invocation-continuation-dispatcher.service.ts`
- `packages/server-ai/src/agent-invocation/agent-invocation.module.ts`
- `packages/server-ai/src/agent-invocation/invocation-wait.ts`
- `packages/server-ai/src/agent-invocation/invocation-resume.ts`
- `packages/server-ai/src/agent-invocation/invocation.entity.ts`
- `packages/server-ai/src/agent-invocation/typeorm-invocation.store.ts`
- `packages/server-ai/src/agent-invocation/invocation-monitor.service.ts`
- `packages/server-ai/src/agent-invocation/invocation-task-wait.ts`
- `packages/server-ai/src/agent-invocation/invocation-continuation.ts`
- `packages/server-ai/src/agent-invocation/assistant-task-execution.ts`
- `packages/server-ai/src/agent-invocation/native-invocation-reader.ts`
- `packages/server-ai/src/agent-invocation/native-agent.compiler.ts`
- `packages/server-ai/src/agent-invocation/native-graph-adapter.ts`
- `packages/server-ai/src/agent-invocation/native-agent.strategy.ts`
- `packages/server-ai/src/agent-invocation/parallel-delegation.ts`
- `packages/server-ai/src/agent-invocation/invocation-wait.store.ts`
- `packages/server-ai/src/agent-invocation/runtime-bindings.controller.ts`
- `packages/server-ai/src/agent-invocation/invocation-factory.service.ts`
- `packages/server-ai/src/agent-invocation/assistant-task-adapter.ts`
- `packages/server-ai/src/agent-invocation/invocation-test-store.ts`
- `packages/server-ai/src/agent-invocation/invocation-task-wait.schema.ts`
- `packages/server-ai/src/agent-invocation/agent-invocation-graph.service.ts`
- `packages/server-ai/src/agent-invocation/graph-tool.ts`
- `packages/server-ai/src/agent-invocation/invocation-errors.ts`
- `packages/server-ai/src/agent-invocation/task-wait-control.ts`
- `packages/server-ai/src/agent-invocation/invocations.controller.ts`
- `packages/server-ai/src/agent-invocation/invocation-runtime.ts`
- `packages/server-ai/src/agent-invocation/invocation-results.provider.ts`
- `packages/server-ai/src/agent-invocation/activity/activity.entity.ts`
- `packages/server-ai/src/agent-invocation/activity/activity.service.ts`
- `packages/server-ai/src/agent-invocation/execution-view/coding-execution.provider.ts`
- `packages/server-ai/src/agent-invocation/execution-view/invocation-card.provider.ts`
- `packages/server-ai/src/agent-invocation/execution-view/execution-reader.service.ts`
- `packages/server-ai/src/agent-invocation/remote-components/agent-results/build.mjs`
- `packages/server-ai/src/agent-invocation/remote-components/agent-results/src/main.ts`
- `packages/server-ai/src/agent-invocation/remote-components/agent-results/test/results.test.mjs`
- `packages/server-ai/src/agent-invocation/remote-components/coding-execution/build.mjs`
- `packages/server-ai/src/agent-invocation/remote-components/coding-execution/view.test.mjs`
- `packages/server-ai/src/agent-invocation/remote-components/coding-execution/preview.config.mjs`
- ……其余 19 个见 JSON 输出（完整清单）
