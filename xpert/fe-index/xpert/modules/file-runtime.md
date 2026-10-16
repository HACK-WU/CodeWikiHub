# FileRuntimeModule（`file-runtime`）

- **位置**：`packages/server-ai/src/file-understanding/runtime/` · 归属文件 **2** 个 · 约 **153** 行
- **定义**：`packages/server-ai/src/file-understanding/runtime/file-runtime.module.ts:6`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`RuntimeCapabilityModule`
- **被依赖**（动它会影响）：`AgentMiddlewareRuntimeModule`、`FileUnderstandingModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `FileUnderstandingModule`（CQRS：`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 归属文件（2）

- `packages/server-ai/src/file-understanding/runtime/file-runtime.module.ts`
- `packages/server-ai/src/file-understanding/runtime/file-runtime.service.ts`
