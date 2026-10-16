# 运行时·沙箱·产物专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/运行时·沙箱·产物专家/`
- **职责**：本专家负责 **Agent 的隔离执行环境与运行时可运维面**：把不可信代码放进隔离边界里跑、把跑出来的东西登记成可分享产物、并让 API 进程副本自身可安全重启。
- **子专家**：子专家①[沙箱执行子专家](file://.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/沙箱执行子专家/C0-使用总览.md) · 子专家②[运行时控制与健康子专家](file://.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/运行时控制与健康子专家/C0-使用总览.md) · 子专家③[产物与文件访问子专家](file://.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/产物与文件访问子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/sandbox（74 非 spec / 34 spec / 2 自建表；23 HTTP + WS sandbox-terminal）`
  - `server/src/runtime-control（22 / 10 / 0；无 RouterModule，system/runtime 6 端点）`
  - `server-ai/src/artifacts（10 / 2 / 4 表）`
  - `server-ai/src/workspace-file-access（8 / 2 / 0）`
  - `server/src/health（5 / 0 / 0 自建；另注册外部实体 user）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 文件字节与卷归「文件理解与记忆专家」：本域不拥有字节。`artifact_version.workspaceFileRef` 只是便携引用（注释逐字「without leaking host filesystem paths」）；沙箱卷文件走 `VolumeClient`/Workspace Files，本域只做路径归一、越界拒绝与投递；`resolveWorkspaceVolumeScope` 是从 `file-understanding` 导入的。
  - Agent 调用与执行账本归「Agent 执行链专家」：本域不写执行账本表。唯一挂接点是 `sandbox_managed_service.ownerExecutionId`/`ownerAgentKey`（字符串弱引用，无外键），`xpert-agent-execution` 对 `sandbox` 无源码引用。
  - 平台插件归「平台插件与技能专家」：插件 bundle、安装台账与插件 DDL 不属本域；本域只在 `runtime-control` 侧消费插件代次与收敛门禁。
  - 会话与消息归「对话与会话专家」：本域只按 `conversationId` 建外键（`sandbox_managed_service` → `ChatConversation`，CASCADE）与查会话做准入。
  - 项目卷准入归「项目与任务协作专家」：项目卷路由调用 `XpertProjectAccessService.assertCanRead`，本域不自建项目权限。
  - 本域只负责隔离执行 + 运行时控制 + 产物登记：不做模型推理、Agent 循环、消息持久化，也不做外部 schema-sync（5 模块无 `migrations/*.sql`）。
- **测试状态**：spec 分布（46）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
