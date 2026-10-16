# PromptWorkflowModule（`prompt-workflow`）

- **位置**：`packages/server-ai/src/prompt-workflow/` · 归属文件 **9** 个 · 约 **1412** 行
- **定义**：`packages/server-ai/src/prompt-workflow/prompt-workflow.module.ts:13`（nestjs）
- **挂载前缀**：`/api/prompt-workflow` · 视图/接口入口 **7** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/prompt-workflow/prompt-workflow.controller.ts`（PromptWorkflowController） | `prompt-workflow` | 7 | `:12` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`XpertAgentModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`ServerAIModule`、`XpertAgentModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `SuperAdminOrganizationScopeModule`（`ResolvePromptWorkflowInvocationQuery`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `prompt_workflow` | PromptWorkflow | 5 | @Module imports forFeature | `packages/server-ai/src/prompt-workflow/prompt-workflow.service.ts:60` |
| `xpert` | Xpert | 4 | @Module imports forFeature | `packages/server-ai/src/prompt-workflow/prompt-workflow.service.ts:63` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`ResolvePromptWorkflowInvocationQuery`

## 守卫/权限

`WorkspaceAuthoringGuard`

## 归属文件（9）

- `packages/server-ai/src/prompt-workflow/prompt-workflow.service.ts`
- `packages/server-ai/src/prompt-workflow/prompt-workflow.controller.ts`
- `packages/server-ai/src/prompt-workflow/index.ts`
- `packages/server-ai/src/prompt-workflow/prompt-workflow-associations.ts`
- `packages/server-ai/src/prompt-workflow/prompt-workflow.module.ts`
- `packages/server-ai/src/prompt-workflow/prompt-workflow.entity.ts`
- `packages/server-ai/src/prompt-workflow/queries/index.ts`
- `packages/server-ai/src/prompt-workflow/queries/handlers/index.ts`
- `packages/server-ai/src/prompt-workflow/queries/handlers/resolve-prompt-workflow-invocation.handler.ts`
