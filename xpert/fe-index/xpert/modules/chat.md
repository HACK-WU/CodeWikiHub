# ChatModule（`chat`）

- **位置**：`packages/server-ai/src/chat/` · 归属文件 **27** 个 · 约 **3714** 行
- **定义**：`packages/server-ai/src/chat/chat.module.ts:28`（nestjs）
- **挂载前缀**：`/api/chat` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/chat/chat.controller.ts`（ChatController） | `chat` | 3 | `:29` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`ChatConversationModule`、`CopilotCheckpointModule`、`CopilotModule`、`KnowledgebaseModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`、`XpertToolsetModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，7 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`ChatConversationUpsertCommand`、`GetChatConversationQuery`）
- → `ChatMessageModule`（CQRS：`ChatMessageUpsertCommand`）
- → `CopilotModelModule`（CQRS：`CopilotModelGetChatModelQuery`）
- → `CopilotModule`（CQRS：`CopilotGetChatQuery`、`CopilotGetOneQuery`）
- → `XpertAgentExecutionModule`（CQRS：`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`FindXpertQuery`、`XpertChatCommand`）
- → `XpertProjectModule`（CQRS：`GetVcsCredentialsCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`ChatCommand`）
- ← `HandoffQueueModule`（`ChatCommonCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（6）：`CancelChatCommand`、`ChatCommand`、`ChatCommonCommand`、`SpeechToTextCommand`、`ChatCommonCommand`、`SynthesizeCommand`

## 守卫/权限

`WsJWTGuard`

## 归属文件（27）

- `packages/server-ai/src/chat/video-generation-permission.ts`
- `packages/server-ai/src/chat/index.ts`
- `packages/server-ai/src/chat/chat.module.ts`
- `packages/server-ai/src/chat/chat.controller.ts`
- `packages/server-ai/src/chat/speech-to-text.service.ts`
- `packages/server-ai/src/chat/speech-to-text-permission.ts`
- `packages/server-ai/src/chat/chat.gateway.ts`
- `packages/server-ai/src/chat/video-generation.service.ts`
- `packages/server-ai/src/chat/commands/index.ts`
- `packages/server-ai/src/chat/commands/chat-ws.command.ts`
- `packages/server-ai/src/chat/commands/chat.command.ts`
- `packages/server-ai/src/chat/commands/synthesize.command.ts`
- `packages/server-ai/src/chat/commands/chat-common.command.ts`
- `packages/server-ai/src/chat/commands/cancel-chat.command.ts`
- `packages/server-ai/src/chat/commands/speed-to-text.command.ts`
- `packages/server-ai/src/chat/commands/handlers/cancel-chat.handler.ts`
- `packages/server-ai/src/chat/commands/handlers/chat.handler.ts`
- `packages/server-ai/src/chat/commands/handlers/supervisor.ts`
- `packages/server-ai/src/chat/commands/handlers/chat-common-input.ts`
- `packages/server-ai/src/chat/commands/handlers/chat-common.handler.ts`
- `packages/server-ai/src/chat/commands/handlers/speech-to-text.handler.ts`
- `packages/server-ai/src/chat/commands/handlers/index.ts`
- `packages/server-ai/src/chat/commands/handlers/admitted-chat-common.handler.ts`
- `packages/server-ai/src/chat/commands/handlers/handoff.ts`
- `packages/server-ai/src/chat/commands/handlers/chat-common-agent-builder.ts`
- `packages/server-ai/src/chat/commands/handlers/synthesize.handler.ts`
- `packages/server-ai/src/shared/agent/conversation-title.service.ts`
