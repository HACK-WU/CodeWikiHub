# InitializationModule（`initialization`）

- **位置**：`packages/server-ai/src/initialization/` · 归属文件 **8** 个 · 约 **1708** 行
- **定义**：`packages/server-ai/src/initialization/initialization.module.ts:20`（nestjs）
- **挂载前缀**：`/api/initialization/clawxpert` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/initialization/clawxpert-recovery.controller.ts`（ClawXpertRecoveryController） | `initialization/clawxpert` | 2 | `:7` |

## 依赖关系

- **依赖**（改它要连带看）：`AssistantBindingModule`、`EnvironmentModule`、`MembershipModule`、`ModelAccessModule`、`ModelGatewayModule`、`OrganizationModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`UserModule`、`UserOrganizationModule`、`XpertModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`BullModule`、`AI_BOOTSTRAP_QUEUE`

## 事件/命令耦合（不经 imports，3 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotModule`（CQRS：`CopilotOneByRoleQuery`、`FindCopilotModelsQuery`）
- → `XpertModule`（CQRS：`XpertImportCommand`）
- → `XpertTemplateModule`（CQRS：`ResolveTemplateSkillRefsCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`

## 归属文件（8）

- `packages/server-ai/src/initialization/constants.ts`
- `packages/server-ai/src/initialization/clawxpert-recovery.service.ts`
- `packages/server-ai/src/initialization/initialization.module.ts`
- `packages/server-ai/src/initialization/bootstrap.service.ts`
- `packages/server-ai/src/initialization/clawxpert-recovery.controller.ts`
- `packages/server-ai/src/initialization/bootstrap.processor.ts`
- `packages/server-ai/src/initialization/testing/bootstrap-service.mocks.ts`
- `packages/server-ai/src/initialization/testing/bootstrap-service.fixture.ts`
