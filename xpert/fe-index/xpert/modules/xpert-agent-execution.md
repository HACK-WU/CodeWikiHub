# XpertAgentExecutionModule（`xpert-agent-execution`）

- **位置**：`packages/server-ai/src/xpert-agent-execution/` · 归属文件 **39** 个 · 约 **2374** 行
- **定义**：`packages/server-ai/src/xpert-agent-execution/agent-execution.module.ts:16`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id`、`xpert` · 视图/接口入口 **4** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-agent-execution/agent-execution.controller.ts`（XpertAgentExecutionController） | `-` | 4 | `:22` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`CopilotUsageModule`、`SuperAdminOrganizationScopeModule`、`TenantModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatConversationModule`、`ServerAIModule`、`XpertAgentModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，4 出 / 11 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）
- → `CopilotCheckpointModule`（CQRS：`CopilotCheckpointGetTupleQuery`）
- → `SkillPackageModule`（CQRS：`ResolveRuntimeSkillPackagesQuery`）
- → `XpertModule`（CQRS：`FindXpertQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`AssertXpertAgentExecutionAccessQuery`、`FindAgentExecutionsQuery`、`GetAgentExecutionRunSummaryQuery`、`GetThreadContextUsageQuery`、`XpertAgentExecutionDelCommand`、`XpertAgentExecutionUpsertCommand`）
- ← `AgentEvolutionModule`（`XpertAgentExecutionUpsertCommand`）
- ← `AgentInvocationModule`（`AssertXpertAgentExecutionAccessQuery`、`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- ← `ChatConversationModule`（`FindAgentExecutionsQuery`、`XpertAgentExecutionStateQuery`）
- ← `ChatModule`（`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- ← `EnterpriseChatkitModule`（`FindExecutionsByXpertQuery`、`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- ← `ServerAIModule`（`AssertXpertAgentExecutionAccessQuery`、`XpertAgentExecutionRecordUsageCommand`、`XpertAgentExecutionUpsertCommand`）
- ← `SuperAdminOrganizationScopeModule`（`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- ← `XpertAgentModule`（`XpertAgentExecutionOneQuery`、`XpertAgentExecutionRecordUsageCommand`、`XpertAgentExecutionUpsertCommand`）
- ← `XpertModule`（`FindExecutionsByXpertQuery`、`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- ← `XpertTaskModule`（`XpertAgentExecutionUpsertCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_agent_execution` | XpertAgentExecution | 5 | @Module imports forFeature | `packages/server-ai/src/xpert-agent-execution/agent-execution.service.ts:14` |

## 非 HTTP 入口

- **CQRS Handler**（12）：`XpertAgentExecutionUpsertCommand`、`XpertAgentExecutionRecordUsageCommand`、`WrapWorkflowNodeExecutionCommand`、`XpertAgentExecutionDelCommand`、`XpertAgentExecutionOneQuery`、`FindExecutionsByXpertQuery` 等 12

## 归属文件（39）

- `packages/server-ai/src/xpert-agent-execution/agent-execution.controller.ts`
- `packages/server-ai/src/xpert-agent-execution/execution-timing.ts`
- `packages/server-ai/src/xpert-agent-execution/agent-execution.entity.ts`
- `packages/server-ai/src/xpert-agent-execution/agent-execution.module.ts`
- `packages/server-ai/src/xpert-agent-execution/agent-execution.service.ts`
- `packages/server-ai/src/xpert-agent-execution/index.ts`
- `packages/server-ai/src/xpert-agent-execution/model-usage.execution.ts`
- `packages/server-ai/src/xpert-agent-execution/types.ts`
- `packages/server-ai/src/xpert-agent-execution/execution-access.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/upsert.command.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/record-usage.command.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/execution-delete.command.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/index.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/handlers/upsert.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/handlers/record-usage.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/handlers/wrap-workflow-node-execution.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-agent-execution/commands/handlers/execution-delete.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/dto/index.ts`
- `packages/server-ai/src/xpert-agent-execution/dto/execution.dto.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/get-thread-context-usage.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/assert-access.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/index.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/get-one.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/get-checkpoints.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/find.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/get-run-summary.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/get-state.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/find-by-expert.query.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/get-one.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/find-by-expert.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/get-thread-context-usage.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/assert-access.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/index.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/get-checkpoints.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/find.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/get-state.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/queries/handlers/get-run-summary.handler.ts`
- `packages/server-ai/src/xpert-agent-execution/runtime/assistant-task-runtime.service.ts`
