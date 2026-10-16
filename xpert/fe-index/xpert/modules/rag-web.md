# RagWebModule（`rag-web`）

- **位置**：`packages/server-ai/src/rag-web/` · 归属文件 **21** 个 · 约 **689** 行
- **定义**：`packages/server-ai/src/rag-web/rag-web.module.ts:7`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 2 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `KnowledgeDocumentModule`（`GetRagWebDocCacheQuery`、`GetRagWebOptionsQuery`、`RagWebLoadCommand`）
- ← `KnowledgeProcessingLifecycleModule`（`GetRagWebDocCacheQuery`、`GetRagWebOptionsQuery`、`RagWebLoadCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（3）：`RagWebLoadCommand`、`GetRagWebDocCacheQuery`、`GetRagWebOptionsQuery`

## 归属文件（21）

- `packages/server-ai/src/rag-web/loader.ts`
- `packages/server-ai/src/rag-web/index.ts`
- `packages/server-ai/src/rag-web/rag-web.module.ts`
- `packages/server-ai/src/rag-web/commands/index.ts`
- `packages/server-ai/src/rag-web/commands/load.command.ts`
- `packages/server-ai/src/rag-web/commands/handlers/index.ts`
- `packages/server-ai/src/rag-web/commands/handlers/load.handler.ts`
- `packages/server-ai/src/rag-web/provider/index.ts`
- `packages/server-ai/src/rag-web/provider/firecrawl/schema.ts`
- `packages/server-ai/src/rag-web/provider/firecrawl/firecrawl.ts`
- `packages/server-ai/src/rag-web/provider/notion/notion.ts`
- `packages/server-ai/src/rag-web/provider/notion/schema.ts`
- `packages/server-ai/src/rag-web/provider/playwright/loader.ts`
- `packages/server-ai/src/rag-web/provider/playwright/playwright.ts`
- `packages/server-ai/src/rag-web/provider/playwright/schema.ts`
- `packages/server-ai/src/rag-web/queries/get-options.query.ts`
- `packages/server-ai/src/rag-web/queries/get-web-page.query.ts`
- `packages/server-ai/src/rag-web/queries/index.ts`
- `packages/server-ai/src/rag-web/queries/handlers/get-web-page.handler.ts`
- `packages/server-ai/src/rag-web/queries/handlers/index.ts`
- `packages/server-ai/src/rag-web/queries/handlers/get-options.handler.ts`
