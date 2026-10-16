# XpertTaskModule（`xpert-task`）

- **位置**：`packages/server-ai/src/xpert-task/` · 归属文件 **37** 个 · 约 **6278** 行
- **定义**：`packages/server-ai/src/xpert-task/xpert-task.module.ts:27`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `count`、`pagination`、`my` 等 5 个 · 视图/接口入口 **35** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-task/xpert-task.controller.ts`（XpertTaskController） | `-` | 35 | `:45` |

## 依赖关系

- **依赖**（改它要连带看）：`ActorTokenModule`、`ConnectorModule`、`RedisModule`、`TenantModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`BullModule`

## 事件/命令耦合（不经 imports，3 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ConnectorModule`（CQRS：`ResolveTemplateConnectorsCommand`）
- → `XpertAgentExecutionModule`（CQRS：`XpertAgentExecutionUpsertCommand`）
- → `XpertModule`（CQRS：`XpertChatCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`TemplateActivityCommand`、`TemplateRoutinesCommand`）
- ← `XpertModule`（`TemplateActivityCommand`、`TemplateRoutinesCommand`）

## 数据表（9）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `chat_conversation` | ChatConversation | 6 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:133` |
| `xpert_task` | XpertTask | 5 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:129` |
| `xpert_task_execution` | ScheduledTaskExecution | 5 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:154` |
| `schedule_note` | ScheduleNote | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:131` |
| `auto_task` | AutoTask | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:135` |
| `auto_task_template` | AutoTaskTemplate | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:137` |
| `xpert_task_template` | XpertTaskTemplate | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:139` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-task/xpert-task.service.ts:148` |
| `organization` | Organization | 1 | getRepository | `packages/server-ai/src/xpert-task/template-routines/template-routines.handler.ts:39` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`
- **CQRS Handler**（5）：`CreateXpertTaskCommand`、`QueryXpertTaskCommand`、`DeleteXpertTaskCommand`、`TemplateActivityCommand`、`TemplateRoutinesCommand`
- **定时任务**：2 处

## 归属文件（37）

- `packages/server-ai/src/xpert-task/xpert-task.service.ts`
- `packages/server-ai/src/xpert-task/index.ts`
- `packages/server-ai/src/xpert-task/xpert-task.entity.ts`
- `packages/server-ai/src/xpert-task/scheduled-task-execution.coordinator.ts`
- `packages/server-ai/src/xpert-task/xpert-task.controller.ts`
- `packages/server-ai/src/xpert-task/xpert-task-template.entity.ts`
- `packages/server-ai/src/xpert-task/scheduled-task-oidc-token.ts`
- `packages/server-ai/src/xpert-task/scheduler.job.ts`
- `packages/server-ai/src/xpert-task/scheduled-task-execution.entity.ts`
- `packages/server-ai/src/xpert-task/xpert-task.module.ts`
- `packages/server-ai/src/xpert-task/schedule-note.entity.ts`
- `packages/server-ai/src/xpert-task/auto-task.entity.ts`
- `packages/server-ai/src/xpert-task/auto-task-template.entity.ts`
- `packages/server-ai/src/xpert-task/commands/create.command.ts`
- `packages/server-ai/src/xpert-task/commands/index.ts`
- `packages/server-ai/src/xpert-task/commands/query.command.ts`
- `packages/server-ai/src/xpert-task/commands/delete.command.ts`
- `packages/server-ai/src/xpert-task/commands/handlers/create.handler.ts`
- `packages/server-ai/src/xpert-task/commands/handlers/query.handler.ts`
- `packages/server-ai/src/xpert-task/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-task/commands/handlers/delete.handler.ts`
- `packages/server-ai/src/xpert-task/dto/run-as.dto.ts`
- `packages/server-ai/src/xpert-task/dto/simple.dto.ts`
- `packages/server-ai/src/xpert-task/plugins/index.ts`
- `packages/server-ai/src/xpert-task/plugins/types.ts`
- `packages/server-ai/src/xpert-task/plugins/scheduler.middleware.ts`
- `packages/server-ai/src/xpert-task/remote-components/scheduler-detail/build.mjs`
- `packages/server-ai/src/xpert-task/remote-components/scheduler-detail/preview.config.mjs`
- `packages/server-ai/src/xpert-task/remote-components/scheduler-detail/src/bridge.ts`
- `packages/server-ai/src/xpert-task/remote-components/scheduler-detail/src/i18n.ts`
- `packages/server-ai/src/xpert-task/template-routines/template-routines.command.ts`
- `packages/server-ai/src/xpert-task/template-routines/template-activity.handler.ts`
- `packages/server-ai/src/xpert-task/template-routines/template-activity.command.ts`
- `packages/server-ai/src/xpert-task/template-routines/background-runtime.ts`
- `packages/server-ai/src/xpert-task/template-routines/template-schedule.ts`
- `packages/server-ai/src/xpert-task/template-routines/template-routines.handler.ts`
- `packages/server-ai/src/xpert-task/views/scheduler-detail.provider.ts`
