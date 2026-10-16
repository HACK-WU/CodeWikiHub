# 产物与文件访问子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（运行时·沙箱·产物专家）
- **资产路径**：`.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/产物与文件访问子专家/`
- **职责**：本子专家负责 **「产物怎么被登记、分享、审计」** 与 **「工作区文件怎么被授权式读取」** 两条正交链路。**产物链**：`artifact` 容器（稳定业务身份 `pluginName + resourceType + resourceId`）→ `artifact_version` 不可变内容快照（字节以 `workspaceFileRef` 便携引用外置）→ `artifact_link` 对外入口与访问/展示策略（`slug` 唯一、`shareKey` 部分唯一）→ `artifact_access_log` 追加型审计。**文件访问链**：`view-sessions`（会话）→ `grants`（短时授权）→ `content`（字节流）三段式，会话与 grant 全在 Cache（TTL 1 小时）＋ JWT cookie，**客户端不能传路径**，路径由服务端从 grant 的便携引用解析。服务层是 `ArtifactsService implements ArtifactsApi`（`@RuntimeCapabilityProvider(ArtifactsRuntimeCapability)`，插件面能力键 `platform.artifacts`）与 `WorkspaceFileAccessService`。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/artifacts/**（4 表）`
  - `server-ai/src/workspace-file-access/**`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 产物登记是「先查 + 唯一约束重试」两级幂等，不是单靠索引：`createArtifactWithDefaults` 先按 `tenantId+pluginName+resourceType+resourceId` 查、再在内存里比对可空的 `organizationId`/`userId`；未命中才 `create+save`，**捕获唯一约束错误（`23505` / `1062` / `SQLITE_CONSTRAINT`）后再查一次**。`artifact` 的 4 条**部分唯一索引**按「有/无 organization」×「有/无 user」四种空值切分表达同一业务约束——PG 部分唯一索引才是并发防线。
  - 版本登记的幂等有两档且语义不同：`ensureArtifactVersion` **强制** `idempotencyKey` 并在 `withLockedArtifact`（事务 + `pessimistic_write` 锁 `artifact` 行）里先查后写，命中且 `sha256` 一致返回 `reused`、命中但字节不同 → 400「already used for different content」；而 `createArtifactVersion` **不加锁**，`[推测]` 并发创建可能出现「后写的 `currentVersionId` 不是最大版本号」。
  - 读取授权与租户边界靠「作用域查询 + link 策略」两处判定，且必须按时区分面：管理面 `resolveScopedArtifact`/`resolveScopedLink` 越域一律 404（不泄露存在性）；公开面 `authorizeArtifactLink` → `assertPublicAccess` → `canAccessLink` 六态；`revoked` 归 410，`expired` 在**读取时**判定并回写。同一份内容经**三张面孔**投递（管理面 / 公开面 / 运行时面），读代码时必须按面区分。
  - 工作区文件路径越界防护有 8 层，且「客户端不能传路径」是第 1 层：① 路由只接受 `(sessionId, grantId, fileName)`；② `assertPortableReference`（`source==='platform.workspace.files'`、`filePath` 非空、`tenantId === session.tenantId`）；③ `resolveWorkspaceVolumeScope` 的 catalog 与 scopeId 匹配；④ `normalizeWorkspaceRelativePath` 拒绝 `.`/`..`/`../` 前缀与 `\0`；⑤ 认证下载**重新解析资源**并 `isDeepStrictEqual` 比对 `filePath` 与 `volumeScope`（旧 grant 不能跟随被改写的 fileKey）；
  - 4 张表分工明确，`artifact_access_log` 的写入面只有两处且「尽力而为」：`artifact` = 容器与稳定业务身份（唯一索引挂这层，可 `archived`/`deleted` 软删）· `artifact_version` = 不可变内容快照（**只 insert、无 update 路径**）· `artifact_link` = 对外入口与访问/展示策略 · `artifact_access_log` = 追加型审计（`linkId` `SET NULL`，删链接不删日志）。写入面仅 `recordAccessLog`（link 维度五类事件）与 `recordArtifactAccessLog`（artifact 维度 `archived`/`deleted`，`linkId=null`、`slug=artifact:<id>`），**两处 `catch` 静
  - 与 sandbox job 的关联键是「同名不同义」：本子域与 `sandbox_job` **既无外键也无字段级关联**；`sandbox_job.runtimeArtifactKind/Reference/Digest` 指的是**运行时镜像 / 文件系统产物**。唯一可对齐的口径是 `artifact.source.{pluginName, resourceType, resourceId}`（业务资源 ID）＋ `artifact_version.workspaceFileRef.filePath`（卷内路径）；两域各自经插件能力面暴露（`platform.artifacts` vs `platform.sandbox.jobs`）。
- **测试状态**：[.module-experts/后端专题/运行时·沙箱·产物专家/implementation/06-测试.md](file://.module-experts/后端专题/运行时·沙箱·产物专家/implementation/06-测试.md)（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
