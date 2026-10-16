# FileUploadModule（`file-upload`）

- **位置**：`packages/server/src/file/file-upload/` · 归属文件 **12** 个 · 约 **548** 行
- **定义**：`packages/server/src/file/file-upload/file-upload.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `upload` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/file/file-upload/file-upload.controller.ts`（FileUploadController） | `-` | 1 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：`StorageFileModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`RouterModule`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，0 出 / 8 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`UploadFileCommand`）
- ← `KnowledgebaseModule`（`UploadFileCommand`）
- ← `RuntimeCapabilityModule`（`UploadFileCommand`）
- ← `SandboxModule`（`UploadFileCommand`）
- ← `StorageFileModule`（`UploadFileCommand`）
- ← `WorkspaceFilesRuntimeModule`（`UploadFileCommand`）
- ← `XpertProjectAccessModule`（`UploadFileCommand`）
- ← `XpertProjectModule`（`UploadFileCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 非 HTTP 入口

- **CQRS Handler**（1）：`UploadFileCommand`

## 归属文件（12）

- `packages/server/src/file/file-upload/index.ts`
- `packages/server/src/file/file-upload/upload-file.service.ts`
- `packages/server/src/file/file-upload/file-content-type.ts`
- `packages/server/src/file/file-upload/types.ts`
- `packages/server/src/file/file-upload/upload-file.command.ts`
- `packages/server/src/file/file-upload/file-upload.controller.ts`
- `packages/server/src/file/file-upload/file-upload.module.ts`
- `packages/server/src/file/file-upload/commands/handlers/index.ts`
- `packages/server/src/file/file-upload/commands/handlers/upload-file.handler.ts`
- `packages/server/src/file/file-upload/strategies/index.ts`
- `packages/server/src/file/file-upload/strategies/storage-target.strategy.ts`
- `packages/plugin-sdk/src/lib/file/file-upload/strategy.registry.ts`
