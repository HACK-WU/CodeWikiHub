# ModelExecutionModule（`model-execution`）

- **位置**：`packages/server-ai/src/model-execution/` · 归属文件 **33** 个 · 约 **3811** 行
- **定义**：`packages/server-ai/src/model-execution/model-execution.module.ts:34`（nestjs）
- **挂载前缀**：`/api/model-execution`、`/api/model-execution/admin`、`/api/model-execution/openai/v1` · 视图/接口入口 **12** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/model-execution/execution-native.controller.ts`（ModelExecutionNativeController） | `model-execution` | 2 | `:30` |
| `packages/server-ai/src/model-execution/execution-query.controller.ts`（ModelExecutionQueryController） | `model-execution` | 2 | `:18` |
| `packages/server-ai/src/model-execution/execution-openai.controller.ts`（ModelExecutionOpenAIController） | `model-execution/openai/v1` | 2 | `:10` |
| `packages/server-ai/src/model-execution/execution-session.controller.ts`（ModelExecutionSessionController） | `model-execution` | 1 | `:8` |
| `packages/server-ai/src/model-execution/execution-admin.controller.ts`（ModelExecutionAdminController） | `model-execution/admin` | 5 | `:13` |

## 依赖关系

- **依赖**（改它要连带看）：`AgentMiddlewareRuntimeModule`、`ModelAccessModule`、`XpertModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，3 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatGroupModule`（CQRS：`ResolveGroupRuntimeAccessCommand`）
- → `CopilotUserModule`（CQRS：`CopilotTokenRecordCommand`）
- → `UserOrganizationModule`（CQRS：`ResolveUserOrganizationAccessCommand`）

## 数据表（14）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `model_execution_grant` | ModelExecutionGrant | 11 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-query.controller.ts:22` |
| `model_gateway_call` | ModelGatewayCall | 10 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-query.controller.ts:21` |
| `tenant_setting` | TenantSetting | 6 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-query.controller.ts:24` |
| `model_execution_reconciliation` | ModelExecutionReconciliation | 5 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-reconciliation.service.ts:21` |
| `xpert_agent_execution` | XpertAgentExecution | 5 | @Module imports forFeature | `packages/server-ai/src/model-execution/assistant-execution-policy.service.ts:28` |
| `membership_point_ledger` | MembershipPointLedger | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-query.controller.ts:23` |
| `shell_cli_execution` | ShellCliExecution | 3 | @Module imports forFeature | `packages/server-ai/src/shell-execution/shell-execution-source.service.ts:23` |
| `shell_process_execution` | ShellProcessExecution | 3 | @Module imports forFeature | `packages/server-ai/src/shell-execution/shell-execution-source.service.ts:22` |
| `agent_invocation` | AgentInvocationEntity | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-source.service.ts:22` |
| `agent_runtime_binding` | AgentRuntimeBindingEntity | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-source.service.ts:23` |
| `cli_session` | CliSession | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/execution-source.service.ts:21` |
| `chat_conversation` | ChatConversation | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/assistant-execution-policy.service.ts:24` |
| `copilot` | Copilot | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/assistant-execution-policy.service.ts:26` |
| `xpert_assistant_user_preference` | AssistantUserPreference | 3 | @Module imports forFeature | `packages/server-ai/src/model-execution/assistant-execution-policy.service.ts:27` |

## 非 HTTP 入口

- **定时任务**：2 处

## 守卫/权限

`PermissionGuard`

## 归属文件（33）

- `packages/server-ai/src/model-execution/execution-native-provider.service.ts`
- `packages/server-ai/src/model-execution/execution-query.controller.ts`
- `packages/server-ai/src/model-execution/execution-source.service.ts`
- `packages/server-ai/src/model-execution/assistant-execution-policy.service.ts`
- `packages/server-ai/src/model-execution/execution-native-protocol.ts`
- `packages/server-ai/src/model-execution/execution-reconciliation.service.ts`
- `packages/server-ai/src/model-execution/execution-native.controller.ts`
- `packages/server-ai/src/model-execution/execution-chat-bridge-writer.ts`
- `packages/server-ai/src/model-execution/execution-openai.controller.ts`
- `packages/server-ai/src/model-execution/execution-schema.ts`
- `packages/server-ai/src/model-execution/execution-tool-model.ts`
- `packages/server-ai/src/model-execution/execution-policy.schema.ts`
- `packages/server-ai/src/model-execution/execution-policy.ts`
- `packages/server-ai/src/model-execution/execution-metering.service.ts`
- `packages/server-ai/src/model-execution/execution-reconciliation.schema.ts`
- `packages/server-ai/src/model-execution/execution-chat.service.ts`
- `packages/server-ai/src/model-execution/execution-recovery.ts`
- `packages/server-ai/src/model-execution/execution.entity.ts`
- `packages/server-ai/src/model-execution/invocation-model-source.ts`
- `packages/server-ai/src/model-execution/execution-admin.schema.ts`
- `packages/server-ai/src/model-execution/model-execution.module.ts`
- `packages/server-ai/src/model-execution/execution-chat-bridge-request.ts`
- `packages/server-ai/src/model-execution/execution-reconciliation.entity.ts`
- `packages/server-ai/src/model-execution/execution-policy.defaults.ts`
- `packages/server-ai/src/model-execution/execution-grant.service.ts`
- `packages/server-ai/src/model-execution/execution-admission.service.ts`
- `packages/server-ai/src/model-execution/execution-usage-schema.ts`
- `packages/server-ai/src/model-execution/execution-query.schema.ts`
- `packages/server-ai/src/model-execution/execution-admin.controller.ts`
- `packages/server-ai/src/model-execution/execution-request-lifetime.ts`
- `packages/server-ai/src/model-execution/execution-errors.ts`
- `packages/server-ai/src/model-execution/execution-session.controller.ts`
- `packages/server-ai/src/shell-execution/shell-execution-source.service.ts`
