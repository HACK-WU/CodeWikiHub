# XpertAgentModule（`xpert-agent`）

- **位置**：`packages/server-ai/src/xpert-agent/` · 归属文件 **140** 个 · 约 **17268** 行
- **定义**：`packages/server-ai/src/xpert-agent/xpert-agent.module.ts:37`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `chat`、`xpert`、`middlewares` · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-agent/xpert-agent.controller.ts`（XpertAgentController） | `-` | 5 | `:31` |

## 依赖关系

- **依赖**（改它要连带看）：`ActorTokenModule`、`AgentInvocationModule`、`AgentMiddlewareRuntimeModule`、`ChatConversationModule`、`CopilotCheckpointModule`、`EnvironmentModule`、`ExecutionCancelModule`、`PromptWorkflowModule`、`RedisModule`、`SkillPackageModule`、`TenantModule`、`XpertAgentExecutionModule`、`XpertModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatModule`、`PluginResourceModule`、`PromptWorkflowModule`、`ServerAIModule`、`XpertModule`、`XpertProjectModule`、`XpertTaskModule`、`XpertToolsetModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，8 出 / 4 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`AuthorizeTemplateExecutionCommand`、`ResolveTemplateExecutionCommand`）
- → `ConnectorModule`（CQRS：`ResolveTemplateConnectorsCommand`）
- → `CopilotCheckpointModule`（CQRS：`GetCopilotCheckpointsByParentQuery`）
- → `CopilotModule`（CQRS：`CopilotGetOneQuery`）
- → `PluginResourceModule`（CQRS：`AssertAssistantTemplateDependenciesCommand`）
- → `SandboxModule`（CQRS：`SandboxAcquireBackendCommand`、`SandboxVMCommand`）
- → `XpertAgentExecutionModule`（CQRS：`XpertAgentExecutionOneQuery`、`XpertAgentExecutionRecordUsageCommand`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`AssistantTemplateSetupCommand`、`FindXpertQuery`、`InitializeAssistantTemplateFilesCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`XpertAgentVariablesQuery`）
- ← `FileMemoryModule`（`XpertAgentChatCommand`）
- ← `KnowledgebaseModule`（`ConnectAgentKnowledgebasesCommand`）
- ← `XpertModule`（`XpertAgentVariablesQuery`）

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_message` | ChatMessage | 7 | @Module imports forFeature | `packages/server-ai/src/xpert-agent/commands/handlers/create-node-consume-pending-steer-follow-ups.handler.ts:30` |
| `xpert_agent` | XpertAgent | 4 | @Module imports forFeature | `packages/server-ai/src/xpert-agent/xpert-agent.service.ts:41` |
| `xpert` | Xpert | 1 | getRepository | `packages/server-ai/src/xpert-agent/commands/handlers/connect-agent-knowledgebases.handler.ts:91` |

## 非 HTTP 入口

- **CQRS Handler**（21）：`XpertAgentSwarmCommand`、`XpertAgentChatCommand`、`XpertWorkflowSubgraphCommand`、`CreateNodeConsumePendingSteerFollowUpsCommand`、`CreateSummarizeTitleAgentCommand`、`XpertAgentSubgraphCommand` 等 21

## 归属文件（140）

- `packages/server-ai/src/xpert-agent/xpert-agent.entity.ts`
- `packages/server-ai/src/xpert-agent/xpert-agent.controller.ts`
- `packages/server-ai/src/xpert-agent/index.ts`
- `packages/server-ai/src/xpert-agent/agent.ts`
- `packages/server-ai/src/xpert-agent/xpert-agent.module.ts`
- `packages/server-ai/src/xpert-agent/graph-validator.ts`
- `packages/server-ai/src/xpert-agent/graph-node-channel.ts`
- `packages/server-ai/src/xpert-agent/types.ts`
- `packages/server-ai/src/xpert-agent/effective-copilot-model.ts`
- `packages/server-ai/src/xpert-agent/xpert-agent.service.ts`
- `packages/server-ai/src/xpert-agent/agent-validator.ts`
- `packages/server-ai/src/xpert-agent/collaborators/collaborators.middleware.ts`
- `packages/server-ai/src/xpert-agent/commands/create-swarm.command.ts`
- `packages/server-ai/src/xpert-agent/commands/connect-agent-knowledgebases.command.ts`
- `packages/server-ai/src/xpert-agent/commands/workflow-subgraph.command.ts`
- `packages/server-ai/src/xpert-agent/commands/invoke.command.ts`
- `packages/server-ai/src/xpert-agent/commands/create-node-stage-pending-steer-follow-ups.command.ts`
- `packages/server-ai/src/xpert-agent/commands/summarize-title.command.ts`
- `packages/server-ai/src/xpert-agent/commands/index.ts`
- `packages/server-ai/src/xpert-agent/commands/create-node-consume-pending-steer-follow-ups.command.ts`
- `packages/server-ai/src/xpert-agent/commands/subgraph.command.ts`
- `packages/server-ai/src/xpert-agent/commands/chat.command.ts`
- `packages/server-ai/src/xpert-agent/commands/compile-graph.command.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/create-swarm.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/chat.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/create-node-pending-steer-follow-ups.shared.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/agent-navigation.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/workflow-subgraph.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/create-node-consume-pending-steer-follow-ups.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/toolset-runtime-cleanup.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/summarize-title.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/subgraph.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/invalid-tool-call-diagnostics.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/types.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/execution-error-status.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/invoke.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/connect-agent-knowledgebases.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/compile-graph.handler.ts`
- `packages/server-ai/src/xpert-agent/commands/handlers/create-node-stage-pending-steer-follow-ups.handler.ts`
- ……其余 100 个见 JSON 输出（完整清单）
