# 集成与扩展点子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（平台底座与集成专家）
- **资产路径**：`.module-experts/后端专题/平台底座与集成专家/sub-experts/集成与扩展点子专家/`
- **职责**：本子专家负责**平台的两个横切扩展面**：① **集成（`integration`）**——单表承载第三方连接定义（`provider`/`options`/`features`/`slug`），写入统一走 CQRS（`IntegrationUpsertCommand`/`IntegrationDelCommand`），先跑 provider 策略钩子（`validateConfig`/`onUpdate`/`onDelete`）再落库；扫码授权由 `IntegrationQrService` 以**纯 Redis 状态机**完成（会话键 `integration:qr:session:<id>` + 去重键 `active` + 账号锁 `account`）。② **视图扩展点（`view-extension`）**——`@ViewHostDefinition` 声明的宿主经 `DiscoveryService` 聚成进程内注册表，`ViewExtensionService` 完成「宿主解析 → 插件 provider 扇出 → 清单规范化 → 激活判定 → 权限过滤 → 排序」，`ViewExtensionRoutes` 的 7 条协议路由被 `/api/view-hosts`、`/api/ai/groups/:groupId/workbench` 与移动端 `viewHostsPath` 三个入口复用。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/integration/**（含 connector-app/**；/api/integration 7 + /qr 4）`
  - `server/src/view-extension/**（/api/view-hosts 7；宿主注册表 + 缓存）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `integration.options` 是明文 json 且无隐藏/加密（实测）：实体上仅 `@Column({ type: 'json' })`，`botToken`/`clientSecret` 等键由各 provider 策略自由写入；HTTP 侧唯一收窄是列表端点的 `IntegrationPublicDTO`（`@Exclude() options`），详情、服务层与 `hostSnapshot` 都直读；本目录检索 `encrypt|decrypt|cipher|AES` 0 命中。
  - `hostSnapshot` 无条件读 `botToken` 并交给所有插件 provider：`IntegrationViewHostDefinition.resolve` 每次请求都摘 `options.botToken`；`hostSnapshot.enabled` 恒为 `true`（硬编码），真实「连接状态」只是 `options.status ?? connectionStatus ?? state ?? 'unknown'`——视图侧看到的「已启用」不反映连通性。
  - 扫码授权会话是 Redis-only，且令牌有明文驻留窗口：状态为 `waiting|authorized|expired|denied|failed`，TTL 恒等于 `expiresAt - now`（夹在 30..600s）；`poll` 拿到 `authorized` 后把 `options` 写回会话，直到 `complete` 成功才清空；会话无审计、无表，`cancel` 不通知 provider 撤销。
  - 过期/越权/不存在统一 404，且并发即 409 是正常表现：`read` 在 TTL≤0 或 `userId/tenantId/organizationId` 任一不符时抛同一个 `IntegrationQrExpired`（防会话枚举）；四个操作都在 `RedisLockService.runWithLock('<key>:lock', 60000, op)` 内串行，抢锁失败抛 409 `INTEGRATION_QR_BUSY`——轮询高峰期偶发 409 需按重试处理，不要当故障。
  - `authorized.event` 在本子域只有定义、没有派发点：`IntegrationAuthorizedEvent` 与 `EventNameIntegrationAuthorized` 定义在 `events/authorized.event.ts` 与 `types.ts`，全仓 grep 只命中 server-ai `xpert-project` 的 `@OnEvent` 消费者；`IntegrationQrService.complete` 与 `IntegrationUpsertHandler` 均未发射 ⇒ 授权成功不会自动触发下游（`[推测]`：派发在批次 5 之外或尚未接线）。
  - 宿主注册表是进程内 `Map` 且注册零校验：`onModuleInit` 用 `DiscoveryService.getProviders()` + `Reflector` 建表，同 `hostType` 重复注册为**静默覆盖**（`Map.set`，无冲突检测、无卸载钩子），插件升级/热更新后需重启宿主进程；注册侧没有白名单或签名——**进程内代码即权限边界**。
- **测试状态**：只读梳理（未落盘）。本子域 spec 合计 **9**（`integration` 4 + `view-extension` 5），全部位于 `packages/server/src/**`，共用 `packages/server/jest.config.ts`。本文只给命令与判据，**不实跑**；引用为仓库根相对路径并以 `file://` 包裹。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
