# SuperAdminOrganizationScopeModule（`super-admin-organization-scope`）

- **位置**：`packages/server-ai/src/shared/` · 归属文件 **72** 个 · 约 **7080** 行
- **定义**：`packages/server-ai/src/shared/super-admin-organization-scope.module.ts:5`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`OrganizationModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatConversationModule`、`SandboxModule`、`XpertAgentExecutionModule`

## 事件/命令耦合（不经 imports，7 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`ResourceSkillInstructionsQuery`）
- → `CopilotModelModule`（CQRS：`CopilotModelGetChatModelQuery`）
- → `CopilotModule`（CQRS：`CopilotGetOneQuery`、`CopilotOneByRoleQuery`）
- → `FileUnderstandingModule`（CQRS：`GetFilePreviewQuery`、`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）
- → `PromptWorkflowModule`（CQRS：`ResolvePromptWorkflowInvocationQuery`）
- → `XpertAgentExecutionModule`（CQRS：`XpertAgentExecutionOneQuery`、`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`GetXpertWorkflowQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgeDocumentModule`（`LoadStorageSheetCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`LoadStorageSheetCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tag` | Tag | 1 | getRepository | `packages/server-ai/src/shared/tag-associations.ts:52` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`LoadStorageFileCommand`、`CreateMemoryStoreCommand`、`LoadFileCommand`、`LoadStorageSheetCommand`

## 归属文件（72）

- `packages/server-ai/src/shared/tag-associations.ts`
- `packages/server-ai/src/shared/redact-credentials.ts`
- `packages/server-ai/src/shared/super-admin-organization-scope.service.ts`
- `packages/server-ai/src/shared/index.ts`
- `packages/server-ai/src/shared/translate.ts`
- `packages/server-ai/src/shared/workspace-file-limits.ts`
- `packages/server-ai/src/shared/avatar.ts`
- `packages/server-ai/src/shared/super-admin-organization-scope.module.ts`
- `packages/server-ai/src/shared/chat-message-text.ts`
- `packages/server-ai/src/shared/request-context.ts`
- `packages/server-ai/src/shared/agent/sub-agent.ts`
- `packages/server-ai/src/shared/agent/human-input.ts`
- `packages/server-ai/src/shared/agent/middleware.ts`
- `packages/server-ai/src/shared/agent/source-audit.ts`
- `packages/server-ai/src/shared/agent/execution-context.ts`
- `packages/server-ai/src/shared/agent/conversation-title.service.ts`
- `packages/server-ai/src/shared/agent/summarize.ts`
- `packages/server-ai/src/shared/agent/tool-after-message.ts`
- `packages/server-ai/src/shared/agent/utils.ts`
- `packages/server-ai/src/shared/agent/tool-preference.ts`
- `packages/server-ai/src/shared/agent/constants.ts`
- `packages/server-ai/src/shared/agent/xpert.ts`
- `packages/server-ai/src/shared/agent/index.ts`
- `packages/server-ai/src/shared/agent/time.ts`
- `packages/server-ai/src/shared/agent/model-requirements.ts`
- `packages/server-ai/src/shared/agent/workflow.ts`
- `packages/server-ai/src/shared/agent/message.ts`
- `packages/server-ai/src/shared/agent/external-assistant-state.ts`
- `packages/server-ai/src/shared/agent/execution-outcome.ts`
- `packages/server-ai/src/shared/agent/fake-streaming-chat-model.ts`
- `packages/server-ai/src/shared/agent/parameter.ts`
- `packages/server-ai/src/shared/agent/runtime-capabilities.ts`
- `packages/server-ai/src/shared/agent/persisted-follow-up.ts`
- `packages/server-ai/src/shared/agent/execution-definition.ts`
- `packages/server-ai/src/shared/agent/state.ts`
- `packages/server-ai/src/shared/agent/prompt-workflow-invocation.ts`
- `packages/server-ai/src/shared/agent/types.ts`
- `packages/server-ai/src/shared/agent/thread-pause.ts`
- `packages/server-ai/src/shared/agent/stream-text.ts`
- `packages/server-ai/src/shared/agent/connector-runtime.ts`
- ……其余 32 个见 JSON 输出（完整清单）
