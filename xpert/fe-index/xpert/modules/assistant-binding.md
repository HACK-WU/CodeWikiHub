# AssistantBindingModule（`assistant-binding`）

- **位置**：`packages/server-ai/src/assistant-binding/` · 归属文件 **12** 个 · 约 **2113** 行
- **定义**：`packages/server-ai/src/assistant-binding/assistant-binding.module.ts:20`（nestjs）
- **挂载前缀**：`/api/bosi` · 视图/接口入口 **16** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.controller.ts`（BosiBootstrapController） | `bosi` | 8 | `:16` |
| `packages/server-ai/src/assistant-binding/assistant-binding.controller.ts`（AssistantBindingController） | `-` | 8 | `:24` |

## 依赖关系

- **依赖**（改它要连带看）：`ConnectorModule`、`SharedModule`、`TenantModule`、`XpertModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`InitializationModule`、`MobileModule`、`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，3 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AIModule`（CQRS：`RunCreateStreamCommand`、`ThreadCreateCommand`）
- → `UserOrganizationModule`（CQRS：`ResolveUserOrganizationAccessCommand`）
- → `XpertWorkspaceModule`（CQRS：`EnsurePersonalDefaultWorkspaceCommand`）

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `assistant_binding` | AssistantBinding | 9 | @Module imports forFeature | `packages/server-ai/src/assistant-binding/assistant-binding.service.ts:59` |
| `xpert` | Xpert | 6 | @Module imports forFeature | `packages/server-ai/src/assistant-binding/assistant-binding.service.ts:63` |
| `assistant_binding_user_preference` | AssistantBindingUserPreference | 3 | @Module imports forFeature | `packages/server-ai/src/assistant-binding/assistant-binding.service.ts:61` |
| `xpert_agent_execution` | XpertAgentExecution | 1 | getRepository | `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.service.ts:307` |
| `chat_message` | ChatMessage | 1 | getRepository | `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.service.ts:338` |

## 归属文件（12）

- `packages/server-ai/src/assistant-binding/assistant-binding-user-preference.entity.ts`
- `packages/server-ai/src/assistant-binding/assistant-binding.service.ts`
- `packages/server-ai/src/assistant-binding/index.ts`
- `packages/server-ai/src/assistant-binding/assistant-binding.controller.ts`
- `packages/server-ai/src/assistant-binding/assistant-binding.module.ts`
- `packages/server-ai/src/assistant-binding/assistant-binding.entity.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.service.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.controller.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-onboarding.schema.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-conversation.initializer.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-bootstrap.schema.ts`
- `packages/server-ai/src/assistant-binding/bosi/bosi-onboarding.service.ts`
