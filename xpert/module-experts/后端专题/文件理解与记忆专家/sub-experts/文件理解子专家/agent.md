# 文件理解子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（文件理解与记忆专家）
- **资产路径**：`.module-experts/后端专题/文件理解与记忆专家/sub-experts/文件理解子专家/`
- **职责**：本子专家负责把「一段字节」变成**平台可授权、可解析、可引用、可检索**的 `FileAsset` 句柄，并维护其整条派生链：写链 `CreateFileAsset`（按 `storageFileId` 复用）→ `EnqueueFileParse`（状态先落 `parsing`）→（内联或 `setImmediate` 后台）`ParseFileAsset` → 六族解析器 → `IndexFileChunks`（3600/240 切块 + 锚点 + 向量账本）；读面 8 个 `/api/ai/*` 端点、8 个 `parsed_file_*` Agent 工具、`FileRuntimeCapability` 运行时能力；回收面 `FileAssetDeletionService` 的分步硬删。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/file-understanding/**（解析器注册表 / 命令处理器 / 向量 / 工作区投影）`
  - `入口：server-ai/src/ai/context.controller.ts 的 POST /api/ai/contexts/file`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 上传入口不在本控制器，且旧入口已弃用：真正的 multipart 上传与「启动理解」在 `ContextsController`（`POST /api/ai/contexts/file`）；旧入口 `POST /api/ai/v1/file` 源码逐字标注 `@deprecated`，**只落 storage 目标、不建 `FileAsset`、不触发解析**。
  - 类级三件套 + 每方法授权：控制器类级为 `@Public()` + `@AllowClientSecretBindings(SecretTokenBindingType.ENTERPRISE_XPERT)` + `@UseGuards(ApiKeyOrClientSecretAuthGuard)` + `@UseInterceptors(TransformInterceptor)`（**并非无守卫**）；每个方法先 `authorizeFile(fileId, operation)` → `FileAssetAccessService.resolve` + 公共 Xpert 会话 scope 校验（命中时要求 `fileAsset.userId === scope.createdById` 并追加 `assertPublicXpertSessionConversationAccess`）
  - 幂等 / 去重键是 `storageFileId`（+ `tenantId`），不是 hash：`CreateFileAssetHandler` 先 `findOne({storageFileId, tenantId})`，命中则**原地 spread 更新**（保留 userId/conversationId/threadId/projectId/xpertId/status/capabilities/workspacePath）。`sha256` 由 `uploadedFile.buffer` 计算并落列（`createHash('sha256')`），但**`@Index(['sha256'])` 非唯一、无查重逻辑**。全子域唯一唯一约束是 `ConversationFileLink` 的 `@Index(['conversationId','fileAssetId'], {uni
  - 解析启动只由上传路径显式触发：`EnqueueFileParseCommand` 由调用方（`context.controller.ts`、`chat-file-assets.ts`、运行时能力面）显式投递；**存储层不隐式触发解析**——只写 `storage_file` 不会产生 `FileAsset`，也不会解析。
  - 无队列：`setImmediate` 后台解析：`runInline` 为假时 `setImmediate(() => commandBus.execute(new ParseFileAssetCommand(id)).catch(warn))`，失败仅 `logger.warn`；进程重启即丢任务、无重试与并发上限，状态会永久停在 `parsing`，只能靠 `parse/retry` 补偿。`[推测]` 大租户批量上传吞吐受单进程事件循环限制。
  - 无迁移 DDL：本域目录无 `migrations/`、无 `.sql`，而运行时 `synchronize:false`，7 张表的建表来源在仓库外——改列/索引必须走外部迁移流程，仓库内改实体**可能**被启动 schema sync 自动对齐（反向风险；外部托管模式下才不生效）。
- **测试状态**：[.module-experts/后端专题/文件理解与记忆专家/implementation/06-测试.md](file://.module-experts/后端专题/文件理解与记忆专家/implementation/06-测试.md)（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
