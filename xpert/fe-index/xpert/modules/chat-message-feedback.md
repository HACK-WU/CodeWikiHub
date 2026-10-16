# ChatMessageFeedbackModule（`chat-message-feedback`）

- **位置**：`packages/server-ai/src/chat-message-feedback/` · 归属文件 **9** 个 · 约 **407** 行
- **定义**：`packages/server-ai/src/chat-message-feedback/feedback.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `my`、`:id` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/chat-message-feedback/feedback.controller.ts`（ChatMessageFeedbackController） | `-` | 6 | `:41` |

## 依赖关系

- **依赖**（改它要连带看）：`ChatConversationModule`、`ChatMessageModule`、`SharedModule`
- **被依赖**（动它会影响）：`AIModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 2 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`FindMessageFeedbackQuery`）
- ← `XpertModule`（`FindMessageFeedbackQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_message_feedback` | ChatMessageFeedback | 3 | @Module imports forFeature | `packages/server-ai/src/chat-message-feedback/feedback.service.ts:24` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`FindMessageFeedbackQuery`

## 归属文件（9）

- `packages/server-ai/src/chat-message-feedback/feedback.entity.ts`
- `packages/server-ai/src/chat-message-feedback/feedback.service.ts`
- `packages/server-ai/src/chat-message-feedback/index.ts`
- `packages/server-ai/src/chat-message-feedback/feedback.controller.ts`
- `packages/server-ai/src/chat-message-feedback/feedback.module.ts`
- `packages/server-ai/src/chat-message-feedback/queries/feedback-find.query.ts`
- `packages/server-ai/src/chat-message-feedback/queries/index.ts`
- `packages/server-ai/src/chat-message-feedback/queries/handlers/feedback-find.handler.ts`
- `packages/server-ai/src/chat-message-feedback/queries/handlers/index.ts`
