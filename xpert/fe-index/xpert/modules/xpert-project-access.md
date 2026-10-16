# XpertProjectAccessModule（`xpert-project-access`）

- **位置**：`packages/server-ai/src/xpert-project/` · 归属文件 **127** 个 · 约 **13826** 行
- **定义**：`packages/server-ai/src/xpert-project/project-access.module.ts:12`（nestjs）
- **挂载前缀**：`/api/invitations` · 视图/接口入口 **83** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-project/project.controller.ts` | `-` | 77 | `:87` |
| `packages/server-ai/src/xpert-project/project-task-graph.controller.ts` | `-` | 3 | `:9` |
| `packages/server-ai/src/xpert-project/project-admin.controller.ts` | `-` | 1 | `:27` |
| `packages/server-ai/src/xpert-project/project-invitation.controller.ts` | `invitations` | 2 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ChatConversationModule`、`ConversationMapModule`、`FileUnderstandingModule`、`SandboxModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，6 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`、`FindChatConversationQuery`）
- → `ChatGroupModule`（CQRS：`AuthorizeGroupTaskCallerCommand`）
- → `FileUnderstandingModule`（CQRS：`AttachFileToConversationCommand`、`GetOwnedStorageFileQuery`）
- → `FileUploadModule`（CQRS：`UploadFileCommand`）
- → `HandoffQueueModule`（CQRS：`RequestRuntimeResultCheckCommand`）
- → `StorageFileModule`（CQRS：`StorageFileDeleteCommand`）

## 数据表（35）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_project` | XpertProject | 36 | @Module imports forFeature | `packages/server-ai/src/xpert-project/project.service.ts:68` |
| `xpert_project_task` | XpertProjectTask | 34 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:623` |
| `xpert_project_task_execution` | XpertProjectTaskExecution | 15 | @InjectRepository | `packages/server-ai/src/xpert-project/runtime/project-task-dispatch.service.ts:43` |
| `agent_invocation` | AgentInvocationEntity | 11 | getRepository | `packages/server-ai/src/xpert-project/runtime/project-task-dispatch.service.ts:152` |
| `xpert_project_membership` | XpertProjectMembership | 9 | @Module imports forFeature | `packages/server-ai/src/xpert-project/services/project-membership.service.ts:23` |
| `chat_conversation` | ChatConversation | 8 | @InjectRepository | `packages/server-ai/src/xpert-project/runtime/project-task-runtime-context.service.ts:19` |
| `xpert_project_task_step` | XpertProjectTaskStep | 7 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:733` |
| `xpert_project_plan` | XpertProjectPlan | 5 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:622` |
| `xpert_project_milestone` | XpertProjectMilestone | 5 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:624` |
| `xpert_project_asset` | XpertProjectAsset | 5 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:625` |
| `xpert_project_automation` | XpertProjectAutomation | 5 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:702` |
| `user` | User | 5 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-membership.service.ts:26` |
| `agent_runtime_binding` | AgentRuntimeBindingEntity | 4 | getRepository | `packages/server-ai/src/xpert-project/runtime/testing/project-task-decision.cases.ts:149` |
| `user_organization` | UserOrganization | 4 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-membership.service.ts:27` |
| `xpert_project_automation_run` | XpertProjectAutomationRun | 4 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-automation.service.ts:17` |
| `xpert` | Xpert | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-project/services/project-xpert-binding.service.ts:22` |
| `xpert_task` | XpertTask | 3 | getRepository | `packages/server-ai/src/xpert-project/project.service.ts:341` |
| `xpert_project_activity` | XpertProjectActivity | 3 | getRepository | `packages/server-ai/src/xpert-project/services/project-membership.service.ts:155` |
| `xpert_project_invitation` | XpertProjectInvitation | 3 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-invitation.service.ts:38` |
| `feature_organization` | FeatureOrganization | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/guards/project-feature.guard.ts:12` |
| `feature` | Feature | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/guards/project-feature.guard.ts:14` |
| `xpert_agent_execution` | XpertAgentExecution | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/runtime/project-task-runtime-context.service.ts:20` |
| `file_asset` | FileAsset | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-purge.service.ts:20` |
| `xpert_project_task_conversation` | XpertProjectTaskConversation | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-task.service.ts:36` |
| `plugin_application_installation` | PluginApplicationInstallation | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-type.service.ts:37` |
| `xpert_project_sprint` | XpertProjectSprint | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-plan.service.ts:26` |
| `xpert_project_swimlane` | XpertProjectSwimlane | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-plan.service.ts:28` |
| `xpert_project_file` | XpertProjectFile | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-file.service.ts:17` |
| `organization` | Organization | 2 | @InjectRepository | `packages/server-ai/src/xpert-project/services/project-invitation.service.ts:41` |
| `artifact` | Artifact | 1 | getRepository | `packages/server-ai/src/xpert-project/runtime/project-task-evidence.ts:95` |
| `agent_runtime_delivery` | AgentRuntimeDelivery | 1 | getRepository | `packages/server-ai/src/xpert-project/runtime/project-task-runtime-read.service.ts:85` |
| `agent_runtime_inbox` | AgentRuntimeInbox | 1 | getRepository | `packages/server-ai/src/xpert-project/runtime/project-task-runtime-read.service.ts:88` |
| `chat_conversation_thread` | ChatConversationThread | 1 | getRepository | `packages/server-ai/src/xpert-project/runtime/project-task-runtime-context.service.ts:54` |
| `conversation_file_link` | ConversationFileLink | 1 | getRepository | `packages/server-ai/src/xpert-project/services/conversation-project.service.ts:76` |
| `chat_message` | ChatMessage | 1 | getRepository | `packages/server-ai/src/xpert-project/services/project-resource-card.service.ts:38` |

## 非 HTTP 入口

- **CQRS Handler**（10）：`AssertProjectAssistantAccessCommand`、`ExportProjectCommand`、`EnsureXpertProjectCommand`、`GetVcsCredentialsCommand`、`ProjectRuntimeObservationCommand`、`UpdateProjectTaskPlanCommand` 等 10
- **定时任务**：3 处

## 守卫/权限

`XpertProjectAuthGuard`、`XpertProjectFeatureGuard`、`XpertProjectPermissionGuard`、`XpertProjectGuard`、`XpertProjectOwnerGuard`、`PermissionGuard`

## 归属文件（127）

- `packages/server-ai/src/xpert-project/project-access.module.ts`
- `packages/server-ai/src/xpert-project/project.controller.ts`
- `packages/server-ai/src/xpert-project/project-task-graph.controller.ts`
- `packages/server-ai/src/xpert-project/project.subscriber.ts`
- `packages/server-ai/src/xpert-project/project-planning.controller.ts`
- `packages/server-ai/src/xpert-project/project-task-plan.schema.ts`
- `packages/server-ai/src/xpert-project/project.service.ts`
- `packages/server-ai/src/xpert-project/project-admin.controller.ts`
- `packages/server-ai/src/xpert-project/index.ts`
- `packages/server-ai/src/xpert-project/project.module.ts`
- `packages/server-ai/src/xpert-project/project-invitation.controller.ts`
- `packages/server-ai/src/xpert-project/commands/index.ts`
- `packages/server-ai/src/xpert-project/commands/assert-project-assistant-access.command.ts`
- `packages/server-ai/src/xpert-project/commands/ensure-project.command.ts`
- `packages/server-ai/src/xpert-project/commands/get-vcs-credentials.command.ts`
- `packages/server-ai/src/xpert-project/commands/export.command.ts`
- `packages/server-ai/src/xpert-project/commands/handlers/export.handler.ts`
- `packages/server-ai/src/xpert-project/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-project/commands/handlers/ensure-project.handler.ts`
- `packages/server-ai/src/xpert-project/commands/handlers/get-vcs-credentials.handler.ts`
- `packages/server-ai/src/xpert-project/dto/project.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-identi.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-update.dto.ts`
- `packages/server-ai/src/xpert-project/dto/index.ts`
- `packages/server-ai/src/xpert-project/dto/project-task.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-admin-intervention.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-workbench.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-file.dto.ts`
- `packages/server-ai/src/xpert-project/dto/project-dsl.dto.ts`
- `packages/server-ai/src/xpert-project/entities/project-sprint.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project.base.ts`
- `packages/server-ai/src/xpert-project/entities/project-activity.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-task.subscriber.ts`
- `packages/server-ai/src/xpert-project/entities/project.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-swimlane.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-task-log.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-milestone.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-file.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-task-step.entity.ts`
- `packages/server-ai/src/xpert-project/entities/project-task-execution.entity.ts`
- ……其余 87 个见 JSON 输出（完整清单）
