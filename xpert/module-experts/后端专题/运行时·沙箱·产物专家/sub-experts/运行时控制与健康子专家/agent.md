# 运行时控制与健康子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（运行时·沙箱·产物专家）
- **资产路径**：`.module-experts/后端专题/运行时·沙箱·产物专家/sub-experts/运行时控制与健康子专家/`
- **职责**：本子专家管的是 **API 进程副本自己的生命周期**——不是容器，也不是沙箱。① **运行时控制面**：`RuntimeControlController` 6 端点 → `RuntimeControlService`（三重断言与错误码映射）→ `RuntimeRestartCoordinatorService`（唯一编排状态机：Redis 锁 / 目标表 / 1 秒轮询 / Pub/Sub 唤醒 / Lua CAS 交棒）；列出与退役注册副本、重启能力自检、滚动重启编排与查询、插件运行时收敛查询，并对外暴露 `recordPluginRuntimeChange` / `recordPluginRuntimeRequirements` 供插件域登记目标清单。② **排空与关停面**：`RuntimeDrainMiddleware`（`forRoutes('*')` 全路由挂载）＋ `RuntimeLifecycleService`（在途请求计数、drain 单例、就绪状态）＋ `prepareApiShutdown` / `RuntimeQueueShutdownService`（HTTP 宽限期 → 队列 `pause(true)`/`close(true)`）＋ `enableRuntimeShutdown`（一信号一预算的进程级看门狗）。③ **健康面**：`HealthController` 两条 `@Public()` 探针（`GET /health/ready` 读本地就绪；`GET /health` 用 Terminus 聚合依赖体检）＋ `CacheHealthIndicator`/`RedisHealthIndicator`。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/runtime-control/**（重启/排空/插件收敛）`
  - `server/src/health/**`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 6 端点的门禁是「双层 + 不对称」：`GET /instances`、`POST /instances/:instanceId/retire`、`POST /restart` 三处方法级带 `@UseGuards(RoleGuard)` + `@Roles(SUPER_ADMIN)` 且服务层再走 `assertAuthorizedActor()`；而 `GET /restart-capability`、`GET /restart/:restartId`、`GET /plugin-convergence/:generation` **只有类级 `TenantPermissionGuard`**，其中 `restartStatus()` 与 `pluginConvergenceStatus()` **连服务层断言都没调用**。
  - `assertAuthorizedActor()` 的三重前置是「非 API Key（交互式）＋ SUPER_ADMIN ＋ 默认租户」，且判定靠字符串：`restartCapability().reason ∈ {interactive-auth-required, super-admin-required, default-tenant-required}` → 403 `RUNTIME_RESTART_INTERACTIVE_AUTH_REQUIRED` / `…_SUPER_ADMIN_REQUIRED` / `…_DEFAULT_TENANT_REQUIRED`；**改枚举即静默失效**。
  - `runtime-drain.middleware` 的排空期请求行为与触发面比预期宽：`forRoutes('*')` 全路由；`isHealthRequest` 用 `/\/health(?:\/|$)/` 匹配 `originalUrl` 去 query 后的路径，**任何末段为 `health` 的路径都会被豁免**；503 分支返回 `{statusCode:503, errorCode, message}` 且 **不调 `next()`**；`Retry-After` 固定 5 秒，而实际 drain 上限是 30 秒（客户端按 5 秒重试会连续撞 503）。
  - 重启对在途执行的影响是「进程级」而非「沙箱级」：候选副本先 `setReady(false)` → 等 750ms → `waitForIdle(30_000)` → 复核「活动键未变 + 无 failed 目标 + 仍有别的就绪副本（或 `allowDowntime`）」→ 才自信号 `SIGTERM`，失败即 `cancelDrain` ＋ `failTarget`。**在途沙箱作业不因 API 重启而中断**（作业运行在 NsJail 进程边界内），但**依赖本副本 SSE/HTTP 长连接的调用方会看到流被切断**（契约层以 `RUNTIME_STREAM_INTERRUPTED_EVENT = 'runtime-interrupted'` 显式命名）。
  - 插件收敛失败面是「沉默 + 封锁」：`awaitPluginRestartApproval` 在「单副本且需求未满足且未获故障容忍」时保持 idle 并把代次写成 `awaiting_restart`（不重试、不通知）；`writeState` **拒绝对当前代次的 `failed` 覆盖**，`readDesired` 在历史过期后 fail-closed 取 `failed`；同一操作内出现更新代次时不另起操作，而是用 `TRANSITION_ACTIVE_RESTART_SCRIPT` **原子交棒**，交棒失败则把 `pluginGeneration + 1..current` 全部标 failed。
  - 健康检查的检查项、超时与失败语义不对称：四项开关是 `private readonly checkDb/checkStorage/checkCache/checkRedis = true`（硬编码），`checkDbWithTerminus = false`（Terminus ping 常闭）；`database` 与 `storage` 的异常被 `catch` 吞成 `{status:'down', message}` 返回体（`[推测]` Terminus 聚合仍为 `ok`），只有 `cache`/`redis` 抛 `HealthCheckError` 才会聚合失败。**本域没有单点超时**，时限来自 `healthcheck.cjs` 的 5 秒；`redis` 指示器在构造函数里 `startRedis()`（不 await，且 `console.log` 含口令的 `RED
- **测试状态**：只读梳理。测试资产分布：`packages/server/src/runtime-control/` **10 个 spec ＋ 2 个非 spec 夹具**；`packages/server/src/health/` **0 个 spec**（5 个生产文件全靠人工/部署脚本验证）。本文只列事实与命令，未跑过的结论标 `[推测]`。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
