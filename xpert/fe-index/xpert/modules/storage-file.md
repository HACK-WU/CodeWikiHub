# StorageFileModule（`storage-file`）

- **位置**：`packages/server/src/storage-file/` · 归属文件 **21** 个 · 约 **667** 行
- **定义**：`packages/server/src/storage-file/storage-file.module.ts:13`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `url`、`:id` · 视图/接口入口 **3** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/storage-file/storage-file.controller.ts`（StorageFileController） | `-` | 3 | `:28` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`ChatConversationModule`、`FileUnderstandingModule`、`FileUploadModule`、`KnowledgeDocumentModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 4 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `FileUploadModule`（CQRS：`UploadFileCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ChatConversationModule`（`StorageFileCreateCommand`）
- ← `SandboxModule`（`DeployWebappCommand`）
- ← `XpertProjectAccessModule`（`StorageFileDeleteCommand`）
- ← `XpertProjectModule`（`StorageFileDeleteCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `storage_file` | StorageFile | 3 | @Module imports forFeature | `packages/server/src/storage-file/storage-file.service.ts:13` |

## 非 HTTP 入口

- **CQRS Handler**（5）：`StorageFileCreateCommand`、`StorageFileUpdateCommand`、`DeployWebappCommand`、`StorageFileDeleteCommand`、`GetStorageFileQuery`

## 归属文件（21）

- `packages/server/src/storage-file/storage-file.controller.ts`
- `packages/server/src/storage-file/storage-file.service.ts`
- `packages/server/src/storage-file/storage-file.subscriber.ts`
- `packages/server/src/storage-file/index.ts`
- `packages/server/src/storage-file/storage-file.module.ts`
- `packages/server/src/storage-file/storage-file.entity.ts`
- `packages/server/src/storage-file/commands/index.ts`
- `packages/server/src/storage-file/commands/deploy-webapp.command.ts`
- `packages/server/src/storage-file/commands/storage-file-delete.command.ts`
- `packages/server/src/storage-file/commands/storage-file-update.command.ts`
- `packages/server/src/storage-file/commands/storage-file-create.command.ts`
- `packages/server/src/storage-file/commands/handlers/storage-file-create.handler.ts`
- `packages/server/src/storage-file/commands/handlers/storage-file-update.handler.ts`
- `packages/server/src/storage-file/commands/handlers/index.ts`
- `packages/server/src/storage-file/commands/handlers/deploy-webapp.handler.ts`
- `packages/server/src/storage-file/commands/handlers/storage-file-delete.handler.ts`
- `packages/server/src/storage-file/dto/storage-file-public.dto.ts`
- `packages/server/src/storage-file/queries/index.ts`
- `packages/server/src/storage-file/queries/get-one.query.ts`
- `packages/server/src/storage-file/queries/handlers/get-one.handler.ts`
- `packages/server/src/storage-file/queries/handlers/index.ts`
