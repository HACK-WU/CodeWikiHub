# FileUnderstandingModule（`file-understanding`）

- **位置**：`packages/server-ai/src/file-understanding/` · 归属文件 **86** 个 · 约 **6067** 行
- **定义**：`packages/server-ai/src/file-understanding/file-understanding.module.ts:24`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `files`、`conversations` · 视图/接口入口 **8** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/file-understanding/file-understanding.controller.ts`（FileUnderstandingController） | `-` | 8 | `:41` |

## 依赖关系

- **依赖**（改它要连带看）：`ChatConversationModule`、`FileRuntimeModule`、`RagVStoreModule`、`StorageFileModule`、`TenantModule`、`UserModule`、`VolumeModule`、`XpertModule`、`XpertProjectAccessModule`
- **被依赖**（动它会影响）：`AIModule`、`ConversationBranchModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 10 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AIModule`（`DeleteFileAssetCommand`）
- ← `ChatConversationModule`（`GetFileAssetByStorageFileQuery`、`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）
- ← `EnterpriseChatkitModule`（`AssertFileUploadScopeQuery`、`AttachFileToConversationCommand`）
- ← `FileRuntimeModule`（`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）
- ← `RuntimeCapabilityModule`（`EnqueueFileParseCommand`、`GetFileUnderstandingStatusQuery`、`ResolveAuthorizedFileAssetQuery`、`SearchFileChunksQuery`、`ValidateFileUnderstandingReferencesQuery`）
- ← `SuperAdminOrganizationScopeModule`（`GetFilePreviewQuery`、`GetOwnedStorageFileQuery`、`ResolveAuthorizedFileAssetQuery`）
- ← `WorkspaceFilesRuntimeModule`（`EnqueueFileParseCommand`、`GetFileUnderstandingStatusQuery`、`ResolveAuthorizedFileAssetQuery`、`SearchFileChunksQuery`、`ValidateFileUnderstandingReferencesQuery`）
- ← `XpertModule`（`AssertFileUploadScopeQuery`、`AttachFileToConversationCommand`）
- ← `XpertProjectAccessModule`（`AttachFileToConversationCommand`、`GetOwnedStorageFileQuery`）
- ← `XpertProjectModule`（`AttachFileToConversationCommand`、`GetOwnedStorageFileQuery`）

## 数据表（7）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `file_asset` | FileAsset | 39 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-workspace-projection.service.ts:39` |
| `file_chunk` | FileChunk | 17 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-asset-deletion.service.ts:22` |
| `file_artifact` | FileArtifact | 15 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-workspace-projection.service.ts:41` |
| `conversation_file_link` | ConversationFileLink | 15 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-asset-deletion.service.ts:28` |
| `file_embedding` | FileEmbedding | 11 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-understanding-vector.service.ts:60` |
| `file_citation_anchor` | FileCitationAnchor | 7 | @Module imports forFeature | `packages/server-ai/src/file-understanding/file-asset-deletion.service.ts:24` |
| `xpert_project` | XpertProject | 1 | @Module imports forFeature | `-` |

## 非 HTTP 入口

- **CQRS Handler**（25）：`RetryFileParseCommand`、`EnqueueFileParseCommand`、`ParseFileAssetCommand`、`CreateFileArtifactsCommand`、`CreateFileAssetCommand`、`DeleteFileAssetCommand` 等 25

## 守卫/权限

`ApiKeyOrClientSecretAuthGuard`

## 归属文件（86）

- `packages/server-ai/src/file-understanding/file-understanding.module.ts`
- `packages/server-ai/src/file-understanding/file-understanding.controller.ts`
- `packages/server-ai/src/file-understanding/index.ts`
- `packages/server-ai/src/file-understanding/file-workspace-projection.service.ts`
- `packages/server-ai/src/file-understanding/file-understanding-vector.service.ts`
- `packages/server-ai/src/file-understanding/file-asset-deletion.service.ts`
- `packages/server-ai/src/file-understanding/file-asset-access.service.ts`
- `packages/server-ai/src/file-understanding/commands/parse-file-asset.command.ts`
- `packages/server-ai/src/file-understanding/commands/create-file-artifacts.command.ts`
- `packages/server-ai/src/file-understanding/commands/create-file-asset.command.ts`
- `packages/server-ai/src/file-understanding/commands/index.ts`
- `packages/server-ai/src/file-understanding/commands/create-workspace-file-asset.command.ts`
- `packages/server-ai/src/file-understanding/commands/index-file-chunks.command.ts`
- `packages/server-ai/src/file-understanding/commands/delete-file-asset.command.ts`
- `packages/server-ai/src/file-understanding/commands/enqueue-file-parse.command.ts`
- `packages/server-ai/src/file-understanding/commands/attach-file-to-conversation.command.ts`
- `packages/server-ai/src/file-understanding/commands/retry-file-parse.command.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/retry-file-parse.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/enqueue-file-parse.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/parse-file-asset.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/create-file-artifacts.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/index.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/create-file-asset.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/delete-file-asset.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/index-file-chunks.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/create-workspace-file-asset.handler.ts`
- `packages/server-ai/src/file-understanding/commands/handlers/attach-file-to-conversation.handler.ts`
- `packages/server-ai/src/file-understanding/domain/types.ts`
- `packages/server-ai/src/file-understanding/domain/workspace-file.ts`
- `packages/server-ai/src/file-understanding/domain/page-image-artifact.ts`
- `packages/server-ai/src/file-understanding/entities/conversation-file-link.entity.ts`
- `packages/server-ai/src/file-understanding/entities/file-artifact.entity.ts`
- `packages/server-ai/src/file-understanding/entities/file-chunk.entity.ts`
- `packages/server-ai/src/file-understanding/entities/file-embedding.entity.ts`
- `packages/server-ai/src/file-understanding/entities/index.ts`
- `packages/server-ai/src/file-understanding/entities/file-asset.entity.ts`
- `packages/server-ai/src/file-understanding/entities/file-citation-anchor.entity.ts`
- `packages/server-ai/src/file-understanding/middlewares/file-understanding.middleware.ts`
- `packages/server-ai/src/file-understanding/middlewares/index.ts`
- `packages/server-ai/src/file-understanding/parsers/file-parser.registry.ts`
- ……其余 46 个见 JSON 输出（完整清单）
