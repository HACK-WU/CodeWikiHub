# 沙箱执行子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（运行时·沙箱·产物专家）
- **资产路径**：`.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/沙箱执行子专家/`
- **职责**：本子专家负责 **「不可信代码在哪里跑、怎么跑、跑完留下什么证据」**，共六块能力：① **会话级沙箱上下文**——`SandboxConversationContextService` 的 `authorizeConversation`（只准入）/`resolveConversationSandbox`（**真正申请后端**）/`findExistingSandbox`（被动发现且**不复活**已停运行时）三元分工；② **执行后端**——`NsjailSandboxProvider`（策略 key `nsjail`）+ `NsjailSandbox`（`ManagedService`/`ServiceProxy`/`Terminal` 三适配器）+ `NsjailRunnerClient`（纯 HTTP）；③ **PTY 终端**——WS 网关 `sandbox-terminal` 的 4 消息/5 事件与逐消息重鉴权；④ **托管服务与预览**——`sandbox_managed_service` 台账 + 3 条 `@Public()` proxy + 签名 cookie；⑤ **卷投递**——4 条 `GET volume/*`（3 私有 + 1 匿名通配）与 `POST file` 上传；⑥ **插件面沙箱作业**（能力键 `platform.sandbox.jobs`）——幂等、三桶租约、输入物化、输出校验、运行时证据与孤儿清理。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/sandbox/**（控制器 / WS 网关 / nsjail provider 与 runner 客户端 / sandbox-job / 预览会话 / managed service）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `@Public()` 面只有两类，且只有一类「不补身份」：3 条 proxy 是 `@Public()` + `SandboxPreviewAuthGuard`（票面 `conversationId`/`serviceId` 必须等于路径参数）；`GET volume/*path` 是 `@Public()` + **纯路径护栏**。`@Public()` 只等于「跳过全局 JWT」，不等于放行。
  - volume 通配是本子域最大匿名读面：`tenant` 可来自 query，无审计、无速率限制、租户参数只用于定位卷根；护栏只有路径层（`normalizeSandboxVolumeRequestSubpath` → 两次 `isProtectedVolumeSubpath` → `assertPublicWorkspacePath` → `openFileSnapshot` 后按真实卷内相对路径 `rejectProtectedPaths` 复检）。安全性完全依赖「公共前缀不含敏感数据」这一部署假设。
  - NsJail 依赖宿主内核能力且不可降级：cgroup v2 是硬要求（overlay 以 `rw` 挂 `/sys/fs/cgroup` 并 `cgroup: host`），不可写则 Runner **fail fast**；`XPERT_NSJAIL_USE_CGROUP_V2=false` 只跑 rlimit 兼容，仅用于探针/开发，Docker Desktop 结果不构成 native Linux 证据。
  - runner 的真实位置是 `/.deploy/nsjail-runner/`：`packages/nsjail-runner` **只有发布元数据**（`private: true`，`description: "Release metadata for the Xpert NsJail runner Docker image"`）；改 runner 行为要改 `.deploy` 侧，API 只经 HTTP 与两个环境变量接触它。
  - WS 握手鉴权与超时语义不对等：token 取自 `handshake.auth.token`，`cs-x-` 前缀走 `ClientSecretSocketGuard`，否则 `WsJWTGuard`（两条路径都要求 `assertWorkbenchPrincipal`）；`open` 另要求非空 `conversationId` 且会话可读。网关**没有空闲超时**，会话表在**进程内存、不跨副本**；握手失败是 `WsException({status:403})`，业务失败只用 `error`/`closed` 事件——**不要用 HTTP 状态码断言**。
  - 配额是三层并联，缺一层就漏：① API 作业层 `SandboxJobCapacityService` 的 Redis ZSET **三桶租约**（20/4/2，租约 `id = <jobId>:<Date.now()>`，`release` 必须 `finally`）；② 注册表层把 `timeoutMs ≤ hardDeadlineMs` 变成**加载期校验**；③ Runner 层准入与 TTL（`MAX_RUNTIMES=100`、`MAX_EXECUTIONS_PER_RUNTIME=4`、`MAX_TERMINALS_PER_RUNTIME=8`、`MAX_SERVICES_PER_RUNTIME=16`、`MAX_PROXIES_PER_RUNTIME=16`、空闲 2 小时、24 小时硬租约、reaper 60 秒）。**任一层超限都不表现为 HTTP 码**。
- **测试状态**：范围：`packages/server-ai/src/sandbox/**` 的 **34 个 `*.spec.ts`**（root 7 · middlewares 9 · nsjail 3 · sandbox-job 13 · commands/handlers 2）。② `runtime-control`（10 spec）与 ③（4 spec）不属本子域。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
