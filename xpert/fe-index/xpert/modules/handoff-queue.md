# HandoffQueueModule（`handoff-queue`）

- **位置**：`packages/server-ai/src/handoff/` · 归属文件 **44** 个 · 约 **5395** 行
- **定义**：`packages/server-ai/src/handoff/message-queue.module.ts:37`（nestjs）
- **挂载前缀**：`/api/agent-invocations` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts` | `agent-invocations` | 2 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`ConfigModule`、`RedisModule`
- **被依赖**（动它会影响）：`ChatGroupModule`、`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`DiscoveryModule`、`CqrsModule`、`BullModule`、`XPERT_HANDOFF_QUEUE`、`XPERT_HANDOFF_QUEUE_REALTIME`、`XPERT_HANDOFF_QUEUE_BATCH`、`XPERT_HANDOFF_QUEUE_INTEGRATION`

## 事件/命令耦合（不经 imports，4 出 / 5 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatGroupModule`（CQRS：`DeliverGroupTaskResultCommand`、`FinishGroupChatCommand`、`PrepareGroupChatCommand`、`ResolveGroupDeliveryContextCommand`）
- → `ChatModule`（CQRS：`ChatCommonCommand`）
- → `XpertModule`（CQRS：`XpertChatCommand`）
- → `XpertProjectModule`（CQRS：`ProjectRuntimeObservationCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AgentInvocationModule`（`ClaimAgentRuntimeResultsCommand`）
- ← `ChatConversationModule`（`StopHandoffMessageCommand`）
- ← `ServerAIModule`（`StopHandoffMessageCommand`）
- ← `XpertProjectAccessModule`（`RequestRuntimeResultCheckCommand`）
- ← `XpertProjectModule`（`RequestRuntimeResultCheckCommand`）

## 数据表（11）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `agent_runtime_inbox` | AgentRuntimeInbox | 42 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-inbox.service.ts:56` |
| `agent_runtime_delivery` | AgentRuntimeDelivery | 19 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-inbox.service.ts:37` |
| `chat_conversation_thread` | ChatConversationThread | 15 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:155` |
| `xpert_agent_execution` | XpertAgentExecution | 14 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-inbox.service.ts:131` |
| `xpert_project_task` | XpertProjectTask | 8 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/testing/reliable-return.cases.ts:273` |
| `agent_invocation` | AgentInvocationEntity | 5 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-observation-monitor.service.ts:30` |
| `chat_conversation` | ChatConversation | 4 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:123` |
| `agent_runtime_binding` | AgentRuntimeBindingEntity | 3 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/testing/reliable-return.cases.ts:588` |
| `xpert_project_task_execution` | XpertProjectTaskExecution | 2 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/testing/reliable-return.cases.ts:669` |
| `user` | User | 1 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:56` |
| `user_organization` | UserOrganization | 1 | getRepository | `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts:58` |

## 非 HTTP 入口

- **MQ 消费者**（4）：`(匿名队列)`、`(匿名队列)`、`(匿名队列)`、`(匿名队列)`
- **CQRS Handler**（4）：`StopHandoffMessageCommand`、`EnqueueAgentChatMessageCommand`、`ClaimAgentRuntimeResultsCommand`、`RequestRuntimeResultCheckCommand`
- **定时任务**：3 处

## 归属文件（44）

- `packages/server-ai/src/handoff/message-dispatcher.service.ts`
- `packages/server-ai/src/handoff/cancel-reason.ts`
- `packages/server-ai/src/handoff/message-queue.service.ts`
- `packages/server-ai/src/handoff/constants.ts`
- `packages/server-ai/src/handoff/pending-result.service.ts`
- `packages/server-ai/src/handoff/handoff-permission.ts`
- `packages/server-ai/src/handoff/dead-letter.service.ts`
- `packages/server-ai/src/handoff/agent-chat-realtime.service.ts`
- `packages/server-ai/src/handoff/message-context.ts`
- `packages/server-ai/src/handoff/handoff-cancel.service.ts`
- `packages/server-ai/src/handoff/local-sync-task.service.ts`
- `packages/server-ai/src/handoff/message-queue.processor.ts`
- `packages/server-ai/src/handoff/outbox-adapters.service.ts`
- `packages/server-ai/src/handoff/types.ts`
- `packages/server-ai/src/handoff/message-queue.module.ts`
- `packages/server-ai/src/handoff/commands/enqueue-agent-chat-message.command.ts`
- `packages/server-ai/src/handoff/commands/index.ts`
- `packages/server-ai/src/handoff/commands/stop-handoff-message.command.ts`
- `packages/server-ai/src/handoff/commands/handlers/stop-handoff-message.handler.ts`
- `packages/server-ai/src/handoff/commands/handlers/enqueue-agent-chat-message.handler.ts`
- `packages/server-ai/src/handoff/commands/handlers/index.ts`
- `packages/server-ai/src/handoff/dispatcher/handoff-route-resolver.service.ts`
- `packages/server-ai/src/handoff/dispatcher/handoff-routing-config.service.ts`
- `packages/server-ai/src/handoff/dispatcher/handoff-queue-gateway.service.ts`
- `packages/server-ai/src/handoff/plugins/index.ts`
- `packages/server-ai/src/handoff/plugins/agent-chat/agent-chat-callback-noop.processor.ts`
- `packages/server-ai/src/handoff/plugins/agent-chat/agent-chat-dispatch.processor.ts`
- `packages/server-ai/src/handoff/plugins/agent-chat/agent-chat.processor.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message-inbox.service.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message.processor.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message-outbox.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message.commands.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message-transport.service.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-delivery.controller.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-observation-monitor.service.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message-access.service.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message.entity.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message-continuation.service.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-result-check.handler.ts`
- `packages/server-ai/src/handoff/runtime-messaging/runtime-message.errors.ts`
- ……其余 4 个见 JSON 输出（完整清单）
