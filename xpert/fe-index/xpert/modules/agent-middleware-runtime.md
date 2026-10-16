# AgentMiddlewareRuntimeModule（`agent-middleware-runtime`）

- **位置**：`packages/server-ai/src/shared/agent/middleware-runtime/` · 归属文件 **5** 个 · 约 **668** 行
- **定义**：`packages/server-ai/src/shared/agent/middleware-runtime/middleware-runtime.module.ts:17`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`ActorTokenRuntimeModule`、`ArtifactsModule`、`CollaborationModule`、`ConnectorModule`、`CopilotModule`、`CopilotUsageModule`、`FileRuntimeModule`、`RuntimeCapabilityModule`、`WorkspaceFilesRuntimeModule`
- **被依赖**（动它会影响）：`ChatModule`、`CopilotModelModule`、`KnowledgeWikiModule`、`ModelExecutionModule`、`ModelGatewayModule`、`ServerAIModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，3 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）
- → `CopilotProviderModule`（CQRS：`GetCopilotProviderModelQuery`）
- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 归属文件（5）

- `packages/server-ai/src/shared/agent/middleware-runtime/execution-scope.ts`
- `packages/server-ai/src/shared/agent/middleware-runtime/middleware-runtime.module.ts`
- `packages/server-ai/src/shared/agent/middleware-runtime/middleware-runtime.service.ts`
- `packages/server-ai/src/shared/agent/middleware-runtime/index.ts`
- `packages/server-ai/src/shared/agent/middleware-runtime/model-runtime.service.ts`
