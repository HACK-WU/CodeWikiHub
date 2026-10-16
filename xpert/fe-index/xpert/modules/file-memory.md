# FileMemoryModule（`file-memory`）

- **位置**：`packages/server-ai/src/file-memory/` · 归属文件 **24** 个 · 约 **5617** 行
- **定义**：`packages/server-ai/src/file-memory/file-memory.module.ts:20`（nestjs）
- **挂载前缀**：`/api/xpert/:id/memory` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/file-memory/file-memory.controller.ts`（FileMemoryController） | `xpert/:id/memory` | 6 | `:7` |

## 依赖关系

- **依赖**（改它要连带看）：`XpertModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `XpertAgentModule`（CQRS：`XpertAgentChatCommand`）

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_conversation` | ChatConversation | 3 | @Module imports forFeature | `packages/server-ai/src/file-memory/adapters/xpert-conversation-history-reader.ts:10` |
| `chat_message` | ChatMessage | 3 | @Module imports forFeature | `packages/server-ai/src/file-memory/adapters/xpert-conversation-history-reader.ts:12` |
| `xpert` | Xpert | 3 | @Module imports forFeature | `packages/server-ai/src/file-memory/adapters/xpert-dreamer-invoker.ts:17` |

## 守卫/权限

`XpertGuard`

## 归属文件（24）

- `packages/server-ai/src/file-memory/file-memory.controller.ts`
- `packages/server-ai/src/file-memory/paths.ts`
- `packages/server-ai/src/file-memory/sandbox-memory.store.ts`
- `packages/server-ai/src/file-memory/usage.ts`
- `packages/server-ai/src/file-memory/ports.ts`
- `packages/server-ai/src/file-memory/dream-prompt.ts`
- `packages/server-ai/src/file-memory/signals.ts`
- `packages/server-ai/src/file-memory/recall-planner.ts`
- `packages/server-ai/src/file-memory/index.ts`
- `packages/server-ai/src/file-memory/file-memory.writeback-runner.ts`
- `packages/server-ai/src/file-memory/frontmatter.ts`
- `packages/server-ai/src/file-memory/taxonomy.ts`
- `packages/server-ai/src/file-memory/file-memory.service.ts`
- `packages/server-ai/src/file-memory/file-memory.writeback.ts`
- `packages/server-ai/src/file-memory/dream.service.ts`
- `packages/server-ai/src/file-memory/file-memory.module.ts`
- `packages/server-ai/src/file-memory/index-validator.ts`
- `packages/server-ai/src/file-memory/scoring.ts`
- `packages/server-ai/src/file-memory/types.ts`
- `packages/server-ai/src/file-memory/file-memory.facade.ts`
- `packages/server-ai/src/file-memory/file-memory.middleware.ts`
- `packages/server-ai/src/file-memory/adapters/xpert-scope-resolver.ts`
- `packages/server-ai/src/file-memory/adapters/xpert-dreamer-invoker.ts`
- `packages/server-ai/src/file-memory/adapters/xpert-conversation-history-reader.ts`
