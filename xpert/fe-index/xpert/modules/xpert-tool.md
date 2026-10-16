# XpertToolModule（`xpert-tool`）

- **位置**：`packages/server-ai/src/xpert-tool/` · 归属文件 **12** 个 · 约 **456** 行
- **定义**：`packages/server-ai/src/xpert-tool/xpert-tool.module.ts:12`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `test`、`:id` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-tool/xpert-tool.controller.ts`（XpertToolController） | `-` | 3 | `:18` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`XpertToolsetModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `XpertToolsetModule`（`TestOpenAPICommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_tool` | XpertTool | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-tool/xpert-tool.service.ts:21` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`TestOpenAPICommand`、`ToolInvokeCommand`

## 归属文件（12）

- `packages/server-ai/src/xpert-tool/xpert-tool.subscriber.ts`
- `packages/server-ai/src/xpert-tool/index.ts`
- `packages/server-ai/src/xpert-tool/xpert-tool.service.ts`
- `packages/server-ai/src/xpert-tool/xpert-tool.module.ts`
- `packages/server-ai/src/xpert-tool/xpert-tool.entity.ts`
- `packages/server-ai/src/xpert-tool/xpert-tool.controller.ts`
- `packages/server-ai/src/xpert-tool/commands/tool-invoke.command.ts`
- `packages/server-ai/src/xpert-tool/commands/index.ts`
- `packages/server-ai/src/xpert-tool/commands/test-openapi.command.ts`
- `packages/server-ai/src/xpert-tool/commands/handlers/test-openapi.handler.ts`
- `packages/server-ai/src/xpert-tool/commands/handlers/tool-invoke.handler.ts`
- `packages/server-ai/src/xpert-tool/commands/handlers/index.ts`
