# CopilotCheckpointModule（`copilot-checkpoint`）

- **位置**：`packages/server-ai/src/copilot-checkpoint/` · 归属文件 **23** 个 · 约 **1358** 行
- **定义**：`packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.module.ts:17`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `writes` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.controller.ts`（CopilotCheckpointController） | `-` | 3 | `:29` |

## 依赖关系

- **依赖**（改它要连带看）：`DatabaseModule`、`TenantModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatModule`、`ConversationBranchModule`、`ServerAIModule`、`XpertAgentModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 5 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`CheckpointDeleteCommand`、`CopilotCheckpointGetTupleQuery`）
- ← `EnterpriseChatkitModule`（`CopilotCheckpointGetTupleQuery`）
- ← `XpertAgentExecutionModule`（`CopilotCheckpointGetTupleQuery`）
- ← `XpertAgentModule`（`GetCopilotCheckpointsByParentQuery`）
- ← `XpertModule`（`CopilotCheckpointGetTupleQuery`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_checkpoint` | CopilotCheckpoint | 7 | @Module imports forFeature | `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.service.ts:16` |
| `copilot_checkpoint_writes` | CopilotCheckpointWrites | 5 | @Module imports forFeature | `packages/server-ai/src/copilot-checkpoint/checkpoint-saver.ts:24` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`CheckpointDeleteCommand`、`CopilotCheckpointGetTupleQuery`、`GetCopilotCheckpointsByParentQuery`
- **定时任务**：1 处

## 归属文件（23）

- `packages/server-ai/src/copilot-checkpoint/index.ts`
- `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.service.ts`
- `packages/server-ai/src/copilot-checkpoint/checkpoint-reference.ts`
- `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.module.ts`
- `packages/server-ai/src/copilot-checkpoint/retention.service.ts`
- `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.entity.ts`
- `packages/server-ai/src/copilot-checkpoint/checkpoint-saver.ts`
- `packages/server-ai/src/copilot-checkpoint/copilot-checkpoint.controller.ts`
- `packages/server-ai/src/copilot-checkpoint/commands/index.ts`
- `packages/server-ai/src/copilot-checkpoint/commands/checkpoint-delete.command.ts`
- `packages/server-ai/src/copilot-checkpoint/commands/handlers/index.ts`
- `packages/server-ai/src/copilot-checkpoint/commands/handlers/checkpoint-delete.handler.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/get-tuple.query.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/index.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/get-by-parent.query.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/handlers/index.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/handlers/get-tuple.handler.ts`
- `packages/server-ai/src/copilot-checkpoint/queries/handlers/get-by-parent.handler.ts`
- `packages/server-ai/src/copilot-checkpoint/serde/index.ts`
- `packages/server-ai/src/copilot-checkpoint/serde/jsonplus.ts`
- `packages/server-ai/src/copilot-checkpoint/serde/message-state.ts`
- `packages/server-ai/src/copilot-checkpoint/writes/writes.service.ts`
- `packages/server-ai/src/copilot-checkpoint/writes/writes.entity.ts`
