# EnvironmentModule（`environment`）

- **位置**：`packages/server-ai/src/environment/` · 归属文件 **13** 个 · 约 **317** 行
- **定义**：`packages/server-ai/src/environment/environment.module.ts:12`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `default`、`:id` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/environment/environment.controller.ts`（EnvironmentController） | `-` | 2 | `:10` |

## 依赖关系

- **依赖**（改它要连带看）：`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`InitializationModule`、`PluginResourceModule`、`ServerAIModule`、`XpertAgentModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `XpertToolsetModule`（`EnvStateQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `environment` | Environment | 3 | @Module imports forFeature | `packages/server-ai/src/environment/environment.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`EnvStateQuery`

## 守卫/权限

`WorkspaceAuthoringGuard`

## 归属文件（13）

- `packages/server-ai/src/environment/environment.module.ts`
- `packages/server-ai/src/environment/environment.controller.ts`
- `packages/server-ai/src/environment/utils.ts`
- `packages/server-ai/src/environment/index.ts`
- `packages/server-ai/src/environment/environment.entity.ts`
- `packages/server-ai/src/environment/environment.service.ts`
- `packages/server-ai/src/environment/dto/env-public.dto.ts`
- `packages/server-ai/src/environment/dto/index.ts`
- `packages/server-ai/src/environment/queries/index.ts`
- `packages/server-ai/src/environment/queries/env-state.query.ts`
- `packages/server-ai/src/environment/queries/handlers/index.ts`
- `packages/server-ai/src/environment/queries/handlers/env-state.handler.ts`
- `packages/server-ai/src/view-extension/hosts/sandbox-view-host.definition.ts`
