# XpertWorkspaceModule（`xpert-workspace`）

- **位置**：`packages/server-ai/src/xpert-workspace/` · 归属文件 **25** 个 · 约 **1997** 行
- **定义**：`packages/server-ai/src/xpert-workspace/workspace.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `my`、`count`、`pagination` 等 4 个 · 视图/接口入口 **16** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-workspace/workspace.controller.ts`（XpertWorkspaceController） | `-` | 16 | `:35` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`ArtifactsModule`、`AssistantBindingModule`、`ChatGroupModule`、`ConnectorModule`、`EnvironmentModule`、`FileMemoryModule`、`InitializationModule`、`KnowledgebaseModule`、`PluginResourceModule`、`PromptWorkflowModule`、`ServerAIModule`、`SkillPackageModule`、`XpertMarketplaceModule`、`XpertModule`、`XpertTableModule`、`XpertToolsetModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 4 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `UserOrganizationModule`（CQRS：`ResolveUserOrganizationAccessCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AssistantBindingModule`（`EnsurePersonalDefaultWorkspaceCommand`）
- ← `EnterpriseChatkitModule`（`MyXpertWorkspaceQuery`）
- ← `KnowledgebaseModule`（`GetXpertWorkspaceQuery`）
- ← `XpertModule`（`MyXpertWorkspaceQuery`）

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_workspace` | XpertWorkspace | 7 | @Module imports forFeature | `packages/server-ai/src/xpert-workspace/workspace-access.service.ts:43` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-workspace/workspace.service.ts:25` |
| `user_organization` | UserOrganization | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-workspace/workspace.service.ts:27` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`EnsurePersonalDefaultWorkspaceCommand`、`GetXpertWorkspaceQuery`、`MyXpertWorkspaceQuery`

## 守卫/权限

`WorkspaceAuthoringGuard`、`WorkspaceOwnerGuard`

## 归属文件（25）

- `packages/server-ai/src/xpert-workspace/workspace-access.service.ts`
- `packages/server-ai/src/xpert-workspace/index.ts`
- `packages/server-ai/src/xpert-workspace/workspace.entity.ts`
- `packages/server-ai/src/xpert-workspace/workspace.service.ts`
- `packages/server-ai/src/xpert-workspace/workspace.controller.ts`
- `packages/server-ai/src/xpert-workspace/workspace.module.ts`
- `packages/server-ai/src/xpert-workspace/types.ts`
- `packages/server-ai/src/xpert-workspace/workspace-base.service.ts`
- `packages/server-ai/src/xpert-workspace/commands/ensure-personal-default-workspace.command.ts`
- `packages/server-ai/src/xpert-workspace/commands/index.ts`
- `packages/server-ai/src/xpert-workspace/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-workspace/commands/handlers/ensure-personal-default-workspace.handler.ts`
- `packages/server-ai/src/xpert-workspace/dto/workspace.dto.ts`
- `packages/server-ai/src/xpert-workspace/dto/index.ts`
- `packages/server-ai/src/xpert-workspace/dto/public.dto.ts`
- `packages/server-ai/src/xpert-workspace/guards/workspace.guard.ts`
- `packages/server-ai/src/xpert-workspace/guards/workspace-authoring.guard.ts`
- `packages/server-ai/src/xpert-workspace/guards/index.ts`
- `packages/server-ai/src/xpert-workspace/guards/workspace-owner.guard.ts`
- `packages/server-ai/src/xpert-workspace/queries/index.ts`
- `packages/server-ai/src/xpert-workspace/queries/get-one.query.ts`
- `packages/server-ai/src/xpert-workspace/queries/my.query.ts`
- `packages/server-ai/src/xpert-workspace/queries/handlers/get-one.handler.ts`
- `packages/server-ai/src/xpert-workspace/queries/handlers/my.handler.ts`
- `packages/server-ai/src/xpert-workspace/queries/handlers/index.ts`
