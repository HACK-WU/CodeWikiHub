# 工作区与文件授权子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Assistant 定义与运行时专家）
- **资产路径**：`.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/工作区与文件授权子专家/`
- **职责**：一句话：**工作区是创作容器，文件是数据卷**，两者在代码上刻意不共享任何判定函数。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-workspace`
  - `server-ai/src/xpert/assistant-files`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 三元权限面不可互换。创作面（`XpertWorkspaceAccessService` + 三个 Workspace 守卫，判定对象是 `xpert_workspace`）、运行准入面（`PublishedXpertAccessService`，判定对象是"确切的已发布 Assistant"）、文件面（`ResolveAssistantFileAccessCommand` + `AssistantFileAccessService`，判定对象是 Assistant 数据卷）是三个独立面。把 `XpertService.findOne()`、`XpertWorkspaceService.canAccess()` 或 workspace 级 `canRun` 当文件 ACL 即越权。
  - 绝不接受 HTTP 传入 authoring 模式，且运行被拒不得回退。入口由可信服务端代码选定（命令注释原文：entry is chosen by trusted server code, never request data）；Studio 用 `forAuthoring()`，运行时被拒后**不得**回退到 authoring。
  - 文件访问永不授予工作区成员资格或编辑权。共享卷是显式协作（授权用户可读、上传、修改、删除），`user` 隔离卷仅限当前用户自己的卷——两者都不写 `xpert_workspace_member`。
  - UserGroup 只补 `canRun`。通过用户组获得的运行时访问只解锁"执行"；`canRead/canWrite/canManage` 保持 false，创作资源不因此可见。
  - 每次操作重新授权。`AssistantFilesService.bind()` 对 `capabilities/list/read/download/save/saveBinary/uploadToFolder/delete/upload` 每次重新派发命令；不要拿上一次成功的结果替后续操作背书。
  - `TENANT_SHARED_WORKSPACE_FILTER` 是原生 SQL 与 `settings` json 的强耦合。`COALESCE((workspace.settings)::jsonb -> 'access' ->> 'visibility', 'private') = 'tenant-shared'` 在 `xpert-marketplace.service.ts` 与 `published-xpert-access.service.ts` 各有一份；改键名或改 `settings` 结构会静默失效且不编译报错。
- **测试状态**：1 测试布局（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
