# SandboxModule（`sandbox`）

- **位置**：`packages/server-ai/src/sandbox/` · 归属文件 **76** 个 · 约 **12085** 行
- **定义**：`packages/server-ai/src/sandbox/sandbox.module.ts:45`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `volume`、`file`、`terminal` 等 5 个 · 视图/接口入口 **23** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/sandbox/sandbox.controller.ts`（SandboxController） | `-` | 23 | `:71` |

## 依赖关系

- **依赖**（改它要连带看）：`SuperAdminOrganizationScopeModule`、`TenantModule`、`VolumeModule`、`WorkspaceFilesRuntimeModule`、`XpertProjectAccessModule`
- **被依赖**（动它会影响）：`AIModule`、`PluginResourceModule`、`ServerAIModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，5 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatGroupModule`（CQRS：`ResolveGroupRuntimeAccessCommand`）
- → `FileUploadModule`（CQRS：`UploadFileCommand`）
- → `StorageFileModule`（CQRS：`DeployWebappCommand`）
- → `TenantModule`（CQRS：`GetDefaultTenantQuery`）
- → `XpertModule`（CQRS：`InitializeAssistantTemplateFilesCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `SkillPackageModule`（`SandboxAcquireBackendCommand`、`SandboxCopyTreeCommand`）
- ← `XpertAgentModule`（`SandboxAcquireBackendCommand`、`SandboxVMCommand`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_conversation` | ChatConversation | 7 | @Module imports forFeature | `packages/server-ai/src/sandbox/sandbox-managed-service.service.ts:176` |
| `sandbox_managed_service` | SandboxManagedServiceEntity | 3 | @Module imports forFeature | `packages/server-ai/src/sandbox/sandbox-managed-service.service.ts:174` |
| `sandbox_job` | SandboxJobEntity | 3 | @Module imports forFeature | `packages/server-ai/src/sandbox/sandbox-job/sandbox-job-runtime-capability.service.ts:79` |
| `chat_conversation_thread` | ChatConversationThread | 3 | @Module imports forFeature | `packages/server-ai/src/sandbox/sandbox-managed-service.service.ts:178` |

## 非 HTTP 入口

- **CQRS Handler**（10）：`SandboxStartManagedServiceCommand`、`SandboxCopyFileCommand`、`SandboxVMCommand`、`SandboxAcquireBackendCommand`、`SandboxRestartManagedServiceCommand`、`SandboxCopyTreeCommand` 等 10
- **定时任务**：1 处

## 守卫/权限

`SandboxPreviewAuthGuard`、`SandboxTerminalAuthGuard`

## 归属文件（76）

- `packages/server-ai/src/sandbox/sandbox.service.ts`
- `packages/server-ai/src/sandbox/sandbox.controller.ts`
- `packages/server-ai/src/sandbox/sandbox-managed-service.entity.ts`
- `packages/server-ai/src/sandbox/sandbox-terminal.gateway.ts`
- `packages/server-ai/src/sandbox/index.ts`
- `packages/server-ai/src/sandbox/sandbox-managed-service.error.ts`
- `packages/server-ai/src/sandbox/sandbox-work-for.ts`
- `packages/server-ai/src/sandbox/client.ts`
- `packages/server-ai/src/sandbox/sandbox-managed-service.service.ts`
- `packages/server-ai/src/sandbox/types.ts`
- `packages/server-ai/src/sandbox/sandbox-terminal-auth.guard.ts`
- `packages/server-ai/src/sandbox/sandbox-preview-session.service.ts`
- `packages/server-ai/src/sandbox/sandbox-preview-auth.guard.ts`
- `packages/server-ai/src/sandbox/sandbox-conversation-context.service.ts`
- `packages/server-ai/src/sandbox/sandbox.module.ts`
- `packages/server-ai/src/sandbox/commands/find-backend.command.ts`
- `packages/server-ai/src/sandbox/commands/stop-managed-service.command.ts`
- `packages/server-ai/src/sandbox/commands/index.ts`
- `packages/server-ai/src/sandbox/commands/start-managed-service.command.ts`
- `packages/server-ai/src/sandbox/commands/sandbox.copy-file.command.ts`
- `packages/server-ai/src/sandbox/commands/restart-managed-service.command.ts`
- `packages/server-ai/src/sandbox/commands/list-managed-services.command.ts`
- `packages/server-ai/src/sandbox/commands/sandbox.copy-tree.command.ts`
- `packages/server-ai/src/sandbox/commands/get-managed-service-logs.command.ts`
- `packages/server-ai/src/sandbox/commands/acquire-backend.command.ts`
- `packages/server-ai/src/sandbox/commands/vm.command.ts`
- `packages/server-ai/src/sandbox/commands/load.command.ts`
- `packages/server-ai/src/sandbox/commands/handlers/start-managed-service.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/sandbox.copy-file.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/vm.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/index.ts`
- `packages/server-ai/src/sandbox/commands/handlers/python.ts`
- `packages/server-ai/src/sandbox/commands/handlers/acquire-backend.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/restart-managed-service.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/sandbox.copy-tree.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/stop-managed-service.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/find-backend.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/list-managed-services.handler.ts`
- `packages/server-ai/src/sandbox/commands/handlers/get-managed-service-logs.handler.ts`
- `packages/server-ai/src/sandbox/middlewares/present-files.ts`
- ……其余 36 个见 JSON 输出（完整清单）
