# WorkspaceFileAccessModule（`workspace-file-access`）

- **位置**：`packages/server-ai/src/workspace-file-access/` · 归属文件 **8** 个 · 约 **961** 行
- **定义**：`packages/server-ai/src/workspace-file-access/workspace-file-access.module.ts:10`（nestjs）
- **挂载前缀**：`/api/content` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/workspace-file-access/workspace-file-access.controller.ts`（WorkspaceFileAccessController） | `-` | 4 | `:14` |
| `packages/server-ai/src/workspace-file-access/workspace-file-content.controller.ts`（WorkspaceFileContentController） | `content` | 2 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`VolumeModule`
- **被依赖**（动它会影响）：`AIModule`、`ServerAIModule`
- **依赖的库/框架模块**：`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `XpertModule`（CQRS：`ResolveAssistantFileAccessCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 守卫/权限

`WorkspaceFileAccessGuard`

## 归属文件（8）

- `packages/server-ai/src/workspace-file-access/workspace-file-access.module.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-access.dto.ts`
- `packages/server-ai/src/workspace-file-access/index.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-content.controller.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-content.response.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-access.guard.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-access.service.ts`
- `packages/server-ai/src/workspace-file-access/workspace-file-access.controller.ts`
