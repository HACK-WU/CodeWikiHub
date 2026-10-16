# ConversationBranchModule（`conversation-branch`）

- **位置**：`packages/server-ai/src/chat-conversation/conversation-branch/` · 归属文件 **8** 个 · 约 **746** 行
- **定义**：`packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.module.ts:13`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`ChatConversationModule`、`ChatMessageModule`、`CopilotCheckpointModule`、`FileUnderstandingModule`、`XpertModule`、`XpertProjectModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 2 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`ConversationBranchCommand`）
- ← `ConversationMapModule`（`ConversationBranchCommand`）

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_conversation` | ChatConversation | 4 | getRepository | `packages/server-ai/src/chat-conversation/conversation-branch/branch-title.ts:24` |
| `chat_message` | ChatMessage | 2 | getRepository | `packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.service.ts:114` |
| `copilot_checkpoint` | CopilotCheckpoint | 1 | getRepository | `packages/server-ai/src/chat-conversation/conversation-branch/branch-checkpoints.ts:130` |
| `chat_conversation_thread` | ChatConversationThread | 1 | getRepository | `packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.service.ts:90` |
| `conversation_file_link` | ConversationFileLink | 1 | getRepository | `packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.service.ts:170` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`ConversationBranchCommand`

## 归属文件（8）

- `packages/server-ai/src/chat-conversation/conversation-branch/branch-title.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/branch-message-references.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/branch-checkpoints.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/index.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.service.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/branch.handler.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/conversation-branch.module.ts`
- `packages/server-ai/src/chat-conversation/conversation-branch/branch.command.ts`
