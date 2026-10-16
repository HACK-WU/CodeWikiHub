# ChatMessageModule（`chat-message`）

- **位置**：`packages/server-ai/src/chat-message/` · 归属文件 **26** 个 · 约 **2175** 行
- **定义**：`packages/server-ai/src/chat-message/chat-message.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/chat-message/chat-message.controller.ts`（ChatMessageController） | `-` | 1 | `:12` |

## 依赖关系

- **依赖**（改它要连带看）：`SharedModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatConversationModule`、`ChatMessageFeedbackModule`、`ConversationBranchModule`、`ServerAIModule`、`XpertToolsetModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`DiscoveryModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 5 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`ChatMessageUpsertCommand`、`RefreshConversationResourceCardsCommand`）
- ← `ChatConversationModule`（`ChatMessageUpdateJobCommand`）
- ← `ChatModule`（`ChatMessageUpsertCommand`）
- ← `EnterpriseChatkitModule`（`ChatMessageUpsertCommand`）
- ← `XpertModule`（`ChatMessageUpsertCommand`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_message` | ChatMessage | 3 | @Module imports forFeature | `packages/server-ai/src/chat-message/chat-message.service.ts:19` |
| `file_asset` | FileAsset | 1 | @Module imports forFeature | `-` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`ChatMessageUpsertCommand`、`SuggestedQuestionsCommand`、`ChatMessageUpdateJobCommand`、`RefreshConversationResourceCardsCommand`

## 归属文件（26）

- `packages/server-ai/src/chat-message/resource-card-event.ts`
- `packages/server-ai/src/chat-message/message-envelope.schema.ts`
- `packages/server-ai/src/chat-message/chat-message.module.ts`
- `packages/server-ai/src/chat-message/index.ts`
- `packages/server-ai/src/chat-message/chat-message.controller.ts`
- `packages/server-ai/src/chat-message/client-skill-usage.ts`
- `packages/server-ai/src/chat-message/chat-message.subscriber.ts`
- `packages/server-ai/src/chat-message/chat-message.service.ts`
- `packages/server-ai/src/chat-message/message-branching.ts`
- `packages/server-ai/src/chat-message/file-activity-event.ts`
- `packages/server-ai/src/chat-message/chat-message.entity.ts`
- `packages/server-ai/src/chat-message/types.ts`
- `packages/server-ai/src/chat-message/message-envelope.ts`
- `packages/server-ai/src/chat-message/task-summary.ts`
- `packages/server-ai/src/chat-message/message-step-persistence.ts`
- `packages/server-ai/src/chat-message/commands/upsert.command.ts`
- `packages/server-ai/src/chat-message/commands/suggested-questions.command.ts`
- `packages/server-ai/src/chat-message/commands/update-job.command.ts`
- `packages/server-ai/src/chat-message/commands/index.ts`
- `packages/server-ai/src/chat-message/commands/refresh-resource-cards.command.ts`
- `packages/server-ai/src/chat-message/commands/handlers/upsert.handler.ts`
- `packages/server-ai/src/chat-message/commands/handlers/index.ts`
- `packages/server-ai/src/chat-message/commands/handlers/suggested-questions.handler.ts`
- `packages/server-ai/src/chat-message/commands/handlers/update-job.handler.ts`
- `packages/server-ai/src/chat-message/resource-cards/refresh-resource-cards.handler.ts`
- `packages/plugin-sdk/src/lib/resource-card-provider/provider.registry.ts`
