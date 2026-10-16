# CopilotOrganizationModule（`copilot-organization`）

- **位置**：`packages/server-ai/src/copilot-organization/` · 归属文件 **9** 个 · 约 **382** 行
- **定义**：`packages/server-ai/src/copilot-organization/copilot-organization.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-organization/copilot-organization.controller.ts`（CopilotOrganizationController） | `-` | 2 | `:21` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`AIModule`、`CopilotUserModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `CopilotModule`（`GetCopilotOrgUsageQuery`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_organization` | CopilotOrganization | 6 | @Module imports forFeature | `packages/server-ai/src/copilot-organization/copilot-organization.service.ts:14` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`GetCopilotOrgUsageQuery`

## 守卫/权限

`RoleGuard`

## 归属文件（9）

- `packages/server-ai/src/copilot-organization/copilot-organization.module.ts`
- `packages/server-ai/src/copilot-organization/index.ts`
- `packages/server-ai/src/copilot-organization/copilot-organization.controller.ts`
- `packages/server-ai/src/copilot-organization/copilot-organization.service.ts`
- `packages/server-ai/src/copilot-organization/copilot-organization.entity.ts`
- `packages/server-ai/src/copilot-organization/queries/index.ts`
- `packages/server-ai/src/copilot-organization/queries/get-tokens.query.ts`
- `packages/server-ai/src/copilot-organization/queries/handlers/index.ts`
- `packages/server-ai/src/copilot-organization/queries/handlers/get-tokens.handler.ts`
