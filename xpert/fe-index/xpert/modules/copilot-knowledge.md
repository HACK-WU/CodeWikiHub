# CopilotKnowledgeModule（`copilot-knowledge`）

- **位置**：`packages/server-ai/src/copilot-knowledge/` · 归属文件 **13** 个 · 约 **786** 行
- **定义**：`packages/server-ai/src/copilot-knowledge/copilot-knowledge.module.ts:12`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `similarity-search`、`mmr-search`、`commands` 等 4 个 · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/copilot-knowledge/copilot-knowledge.controller.ts`（CopilotKnowledgeController） | `-` | 5 | `:13` |

## 依赖关系

- **依赖**（改它要连带看）：`CopilotModule`、`DatabaseModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `CopilotModule`（CQRS：`CopilotOneByRoleQuery`）
- → `XpertModule`（CQRS：`XpertCreateCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `copilot_knowledge` | CopilotKnowledge | 3 | @Module imports forFeature | `packages/server-ai/src/copilot-knowledge/copilot-knowledge.service.ts:32` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`CreateCopilotKnowledgeRetrieverCommand`

## 归属文件（13）

- `packages/server-ai/src/copilot-knowledge/copilot-knowledge.controller.ts`
- `packages/server-ai/src/copilot-knowledge/copilot-knowledge.service.ts`
- `packages/server-ai/src/copilot-knowledge/copilot-knowledge.module.ts`
- `packages/server-ai/src/copilot-knowledge/index.ts`
- `packages/server-ai/src/copilot-knowledge/copilot-knowledge.entity.ts`
- `packages/server-ai/src/copilot-knowledge/retriever.ts`
- `packages/server-ai/src/copilot-knowledge/few-shot.ts`
- `packages/server-ai/src/copilot-knowledge/references-retriever.ts`
- `packages/server-ai/src/copilot-knowledge/commands/index.ts`
- `packages/server-ai/src/copilot-knowledge/commands/create-retriever.command.ts`
- `packages/server-ai/src/copilot-knowledge/commands/vector.seed.command.ts`
- `packages/server-ai/src/copilot-knowledge/commands/handlers/create-retriever.handler.ts`
- `packages/server-ai/src/copilot-knowledge/commands/handlers/index.ts`
