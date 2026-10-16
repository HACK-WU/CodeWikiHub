# ConversationMapModule（`conversation-map`）

- **位置**：`packages/server-ai/src/chat-conversation/conversation-map/` · 归属文件 **17** 个 · 约 **1760** 行
- **定义**：`packages/server-ai/src/chat-conversation/conversation-map/conversation-map.module.ts:10`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`ChatConversationModule`、`XpertModule`、`XpertProjectAccessModule`、`XpertProjectModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ConversationBranchModule`（CQRS：`ConversationBranchCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_message` | ChatMessage | 2 | Repository<T> | `packages/server-ai/src/chat-conversation/conversation-map/segment-reader.ts:12` |

## 归属文件（17）

- `packages/server-ai/src/chat-conversation/conversation-map/schema.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/conversation-map.module.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/segments.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/segment-reader.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/index.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/service.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/provider.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/presentation.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/icon.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/build.mjs`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/tree.preview.config.mjs`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/preview.config.mjs`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/src/tree-mode.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/src/layout.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/src/bridge.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/src/i18n.ts`
- `packages/server-ai/src/chat-conversation/conversation-map/remote-components/conversation-map/src/debug.ts`
