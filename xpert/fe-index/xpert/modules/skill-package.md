# SkillPackageModule（`skill-package`）

- **位置**：`packages/server-ai/src/skill-package/` · 归属文件 **23** 个 · 约 **5644** 行
- **定义**：`packages/server-ai/src/skill-package/skill-package.module.ts:17`（nestjs）
- **挂载前缀**：`/api/skill-package` · 视图/接口入口 **16** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/skill-package/skill-package.controller.ts`（SkillPackageController） | `skill-package` | 16 | `:39` |

## 依赖关系

- **依赖**（改它要连带看）：`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`TenantModule`、`XpertTemplateModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`InitializationModule`、`PluginResourceModule`、`ServerAIModule`、`SkillRepositoryModule`、`XpertAgentModule`、`XpertModule`、`XpertTemplateModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 1 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `SandboxModule`（CQRS：`SandboxAcquireBackendCommand`、`SandboxCopyTreeCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `XpertAgentExecutionModule`（`ResolveRuntimeSkillPackagesQuery`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `skill_package` | SkillPackage | 5 | @Module imports forFeature | `packages/server-ai/src/skill-package/skill-package.service.ts:302` |
| `xpert_workspace` | XpertWorkspace | 3 | @Module imports forFeature | `packages/server-ai/src/skill-package/skill-package.service.ts:307` |

## 非 HTTP 入口

- **CQRS Handler**（5）：`DeleteWorkspaceSkillCommand`、`UpdateWorkspaceSkillCommand`、`CreateWorkspaceSkillCommand`、`ResolveRuntimeSkillPackagesQuery`、`GetWorkspaceSkillForEditQuery`

## 守卫/权限

`WorkspaceAuthoringGuard`

## 归属文件（23）

- `packages/server-ai/src/skill-package/skill-package.service.ts`
- `packages/server-ai/src/skill-package/index.ts`
- `packages/server-ai/src/skill-package/skill-package.controller.ts`
- `packages/server-ai/src/skill-package/skill-package.entity.ts`
- `packages/server-ai/src/skill-package/types.ts`
- `packages/server-ai/src/skill-package/skill-package.module.ts`
- `packages/server-ai/src/skill-package/authoring/skill-authoring.ts`
- `packages/server-ai/src/skill-package/authoring/skill-creator-cqrs.ts`
- `packages/server-ai/src/skill-package/commands/handlers/delete-workspace-skill.handler.ts`
- `packages/server-ai/src/skill-package/commands/handlers/index.ts`
- `packages/server-ai/src/skill-package/commands/handlers/update-workspace-skill.handler.ts`
- `packages/server-ai/src/skill-package/commands/handlers/create-workspace-skill.handler.ts`
- `packages/server-ai/src/skill-package/dto/index.ts`
- `packages/server-ai/src/skill-package/dto/simple-skill.dto.ts`
- `packages/server-ai/src/skill-package/plugins/index.ts`
- `packages/server-ai/src/skill-package/plugins/skill-creator-middleware/instructions.ts`
- `packages/server-ai/src/skill-package/plugins/skill-creator-middleware/index.ts`
- `packages/server-ai/src/skill-package/plugins/skills-middleware/skill-usage.ts`
- `packages/server-ai/src/skill-package/plugins/skills-middleware/index.ts`
- `packages/server-ai/src/skill-package/queries/resolve-runtime-skill-packages.query.ts`
- `packages/server-ai/src/skill-package/queries/handlers/index.ts`
- `packages/server-ai/src/skill-package/queries/handlers/resolve-runtime-skill-packages.handler.ts`
- `packages/server-ai/src/skill-package/queries/handlers/get-workspace-skill-for-edit.handler.ts`
