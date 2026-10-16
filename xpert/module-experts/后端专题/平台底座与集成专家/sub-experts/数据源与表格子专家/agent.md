# 数据源与表格子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（平台底座与集成专家）
- **资产路径**：`.module-experts/后端专题/平台底座与集成专家/sub-experts/数据源与表格子专家/`
- **职责**：本子专家负责**「外部库接入」与「逻辑表物理化」两条链**：① **数据源（`data-source`）** = 外部 SQL/OLAP 接入与**查询代理**，不存数据副本——登记连接（`data_source` 行 + 可选 `data_source_authentication` 个人凭据）、两式探活（`POST /ping`、`POST /:id/ping`）、经 CQRS 把「类型名 + options」翻译成插件 runner（`DataSourceStrategyQuery` → `DataSourceStrategyHandler` → `DataSourceStrategyRegistry.get(name).create(options, dataSourceId)`），再以**一次一 runner、`finally teardown()`** 代理 catalogs/schema/SQL/能力/OLAP，并把「安全摘要 + 受作用域约束的 runner」以 `@RuntimeCapabilityProvider(DataSourceRuntimeCapability)` 形式开放给插件。② **表格（`xpert-table`）** = 工作区自定义物理表的 **Meta 层**——`xpert_table` 只存逻辑定义（`name/schema/columns/status`），真实结构由 `activateTable` 经适配器 `tableOp(CREATE_TABLE, { createMode: UPGRADE })` 落在**外部库**上，行/语句写入经 `plugins/{insert,sql}` 两个工作流节点策略暴露。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/data-source/**（16 端点 / 2 表；凭据明文风险）`
  - `server-ai/src/xpert-table/**（6 端点 / 1 表；物理表激活）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `data_source_authentication.password` 是明文 text 列（实测）：`@Column()` 无 `select:false`、无 `@Exclude`、无 transformer；实体上唯一的 `@Exclude()` 落在 `dataSource` **关系**字段上；`data_source.options` 上方的 `// @Exclude()` 处于**注释态**；模块内 `encrypt|decrypt|cipher|AES` 0 命中 ⇒ 加密/脱敏只覆盖「列表回显」，不覆盖存储。
  - 两条明文出网口绕过脱敏：`GET /api/data-source/:id` 直出实体（`$relations=["authentications"]` 即回显凭据）、`GET /:id/authentication` 直出当前用户整行；`DataSourcePublicDTO` 的白名单只作用于 `GET /api/data-source` 一处。
  - schema 无缓存，OLAP 有 10 分钟缓存且没有失效通道：`getCatalogs/getSchema/query/queryCapability` 每次新建 runner 并 `finally teardown()`；`olap-query.handler` 在模块作用域按 `runners[sessionId][dataSourceId]` 复用（`OBJECT_LIFETIME = 10m`，`setInterval(..., 60000*10)` 回收），命中时**跳过 `prepareDataSource` 与鉴权重算**（复用首次凭据快照）；改数据源不会清缓存。
  - `DataSourceUpdatedEvent` 是一条悬空事件：唯一失效机制在插件边界：`DataSourceSubscriber` **从未被实例化**（不在 `providers`、不在 `coreSubscribers`、不在 `index.ts` 导出），`events/handlers/index.ts` 是 `export const EventHandlers = []`；实际发布方只剩控制器 `PUT /:id`，故既无 TypeORM 订阅者也无 handler。与之对照，`DataSourceRuntimeService.open` 才有**版本式失效**（比对 `updatedAt` 不一致即 `close()` 并抛 403 `Data source changed; reopen the connection`）。
  - 查询代理没有超时、没有行数上限、没有 SQL 白名单（回源码核实）：`runQuery(statement, options)` 把原始语句透传给插件 runner；HTTP 路径**不传 `AbortSignal`**（取消能力只在插件协议 `DatabaseWorkbenchAdapter.query(value, signal)` + `cancel()`）；唯一的「限量」是 `query-schema.handler` 内部的 `LIMIT 10` 取样；`schema` 未经 `escapeRegExp` 就进 `new RegExp('^' + schema + '\\.')`。
  - 错误码是固定的，排障只能看 message：`ping`/`catalogs` 恒 500（catalogs 在 service 内先 `console.error` 再抛 `new Error('配置错误')`）、`query`/`capabilities` 恒 400、`olap` 整体恒 200（失败项以 `{id,status,data}` 返回，且依赖 axios 错误的 `response` 形状，非 axios 错误会抛 `TypeError`）。
- **测试状态**：1. 本子域 spec 清单（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
