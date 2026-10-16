# 文件理解与记忆专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/文件理解与记忆专家/`
- **职责**：本专家是**文件字节、理解结果与记忆的共同底座**——把「文件字节」变成平台可授权、可解析、可检索、可引用、可投影进工作区的**平台级文件句柄**，并在此之上承载两件事：一次可幂等重放的「解析 → 产物 → 分块 → 向量账本」链路，以及一套以**卷上 markdown** 为介质的长期文件记忆。
- **子专家**：子专家①[文件理解子专家](file://.module-experts/后端专题/文件理解与记忆专家/sub-experts/文件理解子专家/C0-使用总览.md) · 子专家②[文件记忆与存储子专家](file://.module-experts/后端专题/文件理解与记忆专家/sub-experts/文件记忆与存储子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/file-understanding（88 / 29 / 7 表；前缀 /api/ai）`
  - `server-ai/src/file-memory（24 / 8 / 3 只读表）`
  - `server/src/storage-file（21 / 1 / 1 表）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 上传入口不在本域：真正的 multipart 上传与「启动理解」在 `ContextsController`（`POST /api/ai/contexts/file`，不是 `/contexts/file`）；`FileUnderstandingController` 只提供句柄/检索/删除类端点。旧入口 `POST /api/ai/v1/file` 源码逐字标注 `@deprecated`，且**只落 storage 目标、不建 FileAsset、不触发解析**。
  - 三套鉴权风格并存：文件侧是 `@Public()` + `@UseGuards(ApiKeyOrClientSecretAuthGuard)` + `@AllowClientSecretBindings(ENTERPRISE_XPERT)`，文件级边界**隐式**落在 `resolve` 里；记忆侧是 `XpertGuard`（owner 或 workspace 可访问，命中后缓存 5 分钟）；`StorageFileController` 才是**真的没有控制器守卫**（鉴权内联在 service，且任意异常一律 catch 成 403）。
  - 幂等与去重键是 `storageFileId`，不是 hash：`FileAsset` 按 `storageFileId + tenantId` 原地复用（`status` 沿用旧值），`ConversationFileLink` 有唯一索引 `(conversationId,fileAssetId)`；`sha256` 列被写入但**无唯一约束、无查重逻辑**，同内容重复上传会产生多条资产与多份向量。
  - 软删与回收的连带处理：`FileAsset` **无 `deletedAt`**，`cleanup` 是硬删七步（向量 → 锚点 → 向量账本 → chunk → artifact → 链接 → 资产行）后再删页图对象与派生目录；`storage_file` 虽有 `deletedAt` 列，删除路径走 `repository.remove`（硬删）——为了正确触发订阅者拿到实体。改删除顺序必须同步这张清单。
  - 记忆的生成触发点与消费时机容易错配：写入三入口 = `memory_write` 工具 / `afterAgent` writeback / Dream 离线整理；消费二入口 = `wrapModelCall` 前置注入 + `memory_search`/`memory_get` 工具。writeback 在**模型不可用时只记候选、不落盘**；「以为写了其实没触发」多因模型缺失或 scope key 不同（user-isolated 助手按用户分槽）。
  - 存储抽象有静默回落分支：`FileStorage.getProvider` 在注册表查找失败时**静默回落内置 LOCAL 实例**，排障时不要据此判断真实 provider；真正可用的 provider 名来自租户设置 / 环境配置（写行时统一大写）。
- **测试状态**：spec 分布（38）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
