# ChatGroupModule（`chat-group`）

- **位置**：`packages/server-ai/src/chat-group/` · 归属文件 **40** 个 · 约 **4638** 行
- **定义**：`packages/server-ai/src/chat-group/chat-group.module.ts:38`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`AgentPluginModule`、`ChatConversationModule`、`HandoffQueueModule`、`SseStreamModule`、`XpertModule`、`XpertProjectModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，3 出 / 8 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`CancelConversationCommand`）
- → `XpertModule`（CQRS：`GetRuntimeCapabilitiesCommand`）
- → `XpertProjectModule`（CQRS：`ProjectRuntimeObservationCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`GetGroupConversationEntryCommand`）
- ← `AgentInvocationModule`（`ExecuteGroupTaskCommand`、`ListGroupTaskTargetsCommand`、`ResolveGroupTaskTargetCommand`）
- ← `ChatConversationModule`（`GetGroupConversationEntryCommand`）
- ← `HandoffQueueModule`（`DeliverGroupTaskResultCommand`、`FinishGroupChatCommand`、`PrepareGroupChatCommand`、`ResolveGroupDeliveryContextCommand`）
- ← `ModelExecutionModule`（`ResolveGroupRuntimeAccessCommand`）
- ← `SandboxModule`（`ResolveGroupRuntimeAccessCommand`）
- ← `XpertProjectAccessModule`（`AuthorizeGroupTaskCallerCommand`）
- ← `XpertProjectModule`（`AuthorizeGroupTaskCallerCommand`）

## 数据表（12）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_group_participant` | GroupParticipant | 35 | @Module imports forFeature | `packages/server-ai/src/chat-group/group-control.service.ts:35` |
| `chat_message` | ChatMessage | 30 | getRepository | `packages/server-ai/src/chat-group/group-tools.service.ts:46` |
| `chat_conversation` | ChatConversation | 29 | getRepository | `packages/server-ai/src/chat-group/group-control.service.ts:103` |
| `chat_message_recipient` | GroupMessageRecipient | 25 | @Module imports forFeature | `packages/server-ai/src/chat-group/group-control.service.ts:59` |
| `chat_conversation_thread` | ChatConversationThread | 9 | getRepository | `packages/server-ai/src/chat-group/group-control.service.ts:40` |
| `xpert_agent_execution` | XpertAgentExecution | 9 | getRepository | `packages/server-ai/src/chat-group/group-messages.service.ts:376` |
| `chat_group_interaction` | GroupInteraction | 6 | @Module imports forFeature | `packages/server-ai/src/chat-group/group-control.service.ts:46` |
| `agent_invocation` | AgentInvocationEntity | 3 | getRepository | `packages/server-ai/src/chat-group/group-project/group-task-result.handler.ts:39` |
| `agent_runtime_inbox` | AgentRuntimeInbox | 3 | getRepository | `packages/server-ai/src/chat-group/group-project/group-task-result.handler.ts:43` |
| `user` | User | 2 | getRepository | `packages/server-ai/src/chat-group/group-members.service.ts:43` |
| `xpert` | Xpert | 2 | getRepository | `packages/server-ai/src/chat-group/group-members.service.ts:49` |
| `user_organization` | UserOrganization | 2 | getRepository | `packages/server-ai/src/chat-group/group-catalog.service.ts:119` |

## 非 HTTP 入口

- **CQRS Handler**（10）：`ResolveGroupRuntimeAccessCommand`、`ResolveGroupDeliveryContextCommand`、`PrepareGroupChatCommand`、`FinishGroupChatCommand`、`GetGroupConversationEntryCommand`、`DeliverGroupTaskResultCommand` 等 10

## 归属文件（40）

- `packages/server-ai/src/chat-group/group.errors.ts`
- `packages/server-ai/src/chat-group/group-runtime-context.ts`
- `packages/server-ai/src/chat-group/group.schema.ts`
- `packages/server-ai/src/chat-group/group-context.ts`
- `packages/server-ai/src/chat-group/group-control.service.ts`
- `packages/server-ai/src/chat-group/group-outbox.service.ts`
- `packages/server-ai/src/chat-group/group-mentions.ts`
- `packages/server-ai/src/chat-group/group-tools.service.ts`
- `packages/server-ai/src/chat-group/group-members.service.ts`
- `packages/server-ai/src/chat-group/group-dispatch.commands.ts`
- `packages/server-ai/src/chat-group/group-composer.schema.ts`
- `packages/server-ai/src/chat-group/group.entities.ts`
- `packages/server-ai/src/chat-group/group-stream.service.ts`
- `packages/server-ai/src/chat-group/group-runtime-access.handler.ts`
- `packages/server-ai/src/chat-group/group.entity.ts`
- `packages/server-ai/src/chat-group/group-messages.service.ts`
- `packages/server-ai/src/chat-group/index.ts`
- `packages/server-ai/src/chat-group/group-delivery-actor.ts`
- `packages/server-ai/src/chat-group/group-interactions.service.ts`
- `packages/server-ai/src/chat-group/group-delivery-context.handler.ts`
- `packages/server-ai/src/chat-group/group-composer.service.ts`
- `packages/server-ai/src/chat-group/group-catalog.service.ts`
- `packages/server-ai/src/chat-group/group-conversation-entry.command.ts`
- `packages/server-ai/src/chat-group/group-access.service.ts`
- `packages/server-ai/src/chat-group/group-runtime.service.ts`
- `packages/server-ai/src/chat-group/group-conversation-entry.handler.ts`
- `packages/server-ai/src/chat-group/group-tools.schema.ts`
- `packages/server-ai/src/chat-group/group-runtime-access.command.ts`
- `packages/server-ai/src/chat-group/group-candidates-test.fixture.ts`
- `packages/server-ai/src/chat-group/group-interactions.schema.ts`
- `packages/server-ai/src/chat-group/group-runtime-view.service.ts`
- `packages/server-ai/src/chat-group/group-user-name.ts`
- `packages/server-ai/src/chat-group/chat-group.module.ts`
- `packages/server-ai/src/chat-group/group-project/group-project.schema.ts`
- `packages/server-ai/src/chat-group/group-project/group-task-result.handler.ts`
- `packages/server-ai/src/chat-group/group-project/group-task-execution.handler.ts`
- `packages/server-ai/src/chat-group/group-project/group-task-target.service.ts`
- `packages/server-ai/src/chat-group/group-project/group-project.service.ts`
- `packages/server-ai/src/chat-group/group-project/group-task.commands.ts`
- `packages/server-ai/src/chat-group/group-project/testing/group-task-result.postgres.cases.ts`
