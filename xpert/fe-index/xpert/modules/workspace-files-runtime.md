# WorkspaceFilesRuntimeModule（`workspace-files-runtime`）

- **位置**：`packages/server-ai/src/shared/runtime/` · 归属文件 **14** 个 · 约 **2029** 行
- **定义**：`packages/server-ai/src/shared/runtime/workspace-files-runtime.module.ts:8`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`RuntimeCapabilityModule`、`VolumeModule`
- **被依赖**（动它会影响）：`AgentMiddlewareRuntimeModule`、`McpPublicationModule`、`SandboxModule`、`XpertModule`
- **依赖的库/框架模块**：`CqrsModule`

## 事件/命令耦合（不经 imports，4 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `FileUnderstandingModule`（CQRS：`EnqueueFileParseCommand`、`GetFileUnderstandingStatusQuery`、`ResolveAuthorizedFileAssetQuery`、`SearchFileChunksQuery`、`ValidateFileUnderstandingReferencesQuery`）
- → `FileUploadModule`（CQRS：`UploadFileCommand`）
- → `PluginModule`（CQRS：`ResolvePluginArtifactNamespaceQuery`）
- → `XpertModule`（CQRS：`ResolveAssistantFileAccessCommand`）

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 归属文件（14）

- `packages/server-ai/src/shared/runtime/workspace-files-runtime-capability.service.ts`
- `packages/server-ai/src/shared/runtime/index.ts`
- `packages/server-ai/src/shared/runtime/runtime-capability-provider-explorer.service.ts`
- `packages/server-ai/src/shared/runtime/workspace-files-runtime.module.ts`
- `packages/server-ai/src/shared/runtime/workspace-files-app-data.ts`
- `packages/server-ai/src/shared/runtime/tool-image-messages.ts`
- `packages/server-ai/src/shared/runtime/runtime-capability.module.ts`
- `packages/server-ai/src/shared/runtime/runtime-input.ts`
- `packages/server-ai/src/shared/runtime/runtime-capability-provider.decorator.ts`
- `packages/server-ai/src/shared/runtime/tool-images-runtime.ts`
- `packages/server-ai/src/shared/runtime/workspace-files-runtime-paths.ts`
- `packages/server-ai/src/shared/runtime/tool-image-artifacts.ts`
- `packages/server-ai/src/shared/runtime/workspace-files-runtime-scope.ts`
- `packages/server-ai/src/shared/runtime/image-coordinate-frame.ts`
