# 平台底座与集成专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/平台底座与集成专家/`
- **职责**：本专家负责**平台底座**——那些「不被任何单一业务域拥有、却被所有域使用」的平台面，按三个子域组织：① **集成与扩展点**（`integration` 集成实例与扫码授权、`view-extension` 视图宿主解析与插件视图清单）；② **数据源与表格**（`data-source` 外部库连接与查询代理、`xpert-table` 逻辑表 Meta → 外部库物理表）；③ **基础字典与客户端壳**（`language`/`country`/`currency`/`contact`/`tags` 字典，`desktop-shell`/`mobile` 客户端壳，`initialization` 引导队列，`ai-model` 模型目录门面）。
- **子专家**：子专家①[集成与扩展点子专家](file://.module-experts/后端专题/平台底座与集成专家/sub-experts/集成与扩展点子专家/C0-使用总览.md) · 子专家②[数据源与表格子专家](file://.module-experts/后端专题/平台底座与集成专家/sub-experts/数据源与表格子专家/C0-使用总览.md) · 子专家③[基础字典与客户端壳子专家](file://.module-experts/后端专题/平台底座与集成专家/sub-experts/基础字典与客户端壳子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server/src/data-source（34 / 4 / 2 表）`
  - `server-ai/src/ai-model（27 / 0 / 0）`
  - `server/src/integration（24 / 4 / 1）`
  - `server-ai/src/xpert-table（18 / 3 / 1）`
  - `server/src/view-extension（14 / 5 / 0）`
  - `字典族：server/src/{language,country,currency,contact}`
  - `server-ai/src/desktop-shell（8 / 3 表 + 2 迁移）`
  - `server-ai/src/mobile（4）`
  - `server-ai/src/initialization（8）`
  - `相邻：server/src/{tags,export-import}`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 凭据类列一律明文，脱敏只在单点：实测 `data-source` 全模块 `encrypt|decrypt|cipher|AES` 0 命中——`data_source_authentication.password` 是普通列（无 `@Exclude`/`select:false`/加密），`data_source.options` 上 `// @Exclude()` 处于注释态，`integration.options`（含 `botToken`）无任何隐藏。脱敏仅覆盖 `GET /api/data-source` 列表（`DataSourcePublicDTO` 白名单）与 `GET /api/integration` 列表；`GET /:id`、`/:id/authentication` 直出实体。
  - `xpert-table` 的 DDL 与元数据不在同一事务：`upsertTable` 的 rename/create/activate 串行执行，激活失败时**新表硬删逻辑行、既有表只标 `ERROR`**；`deleteTable` 的 `DROP_TABLE` 失败仅 `logger.error` 后照常软删——会留下物理表孤儿。
  - `desktop-shell` 是 3 表 + 2 迁移（索引记 0 表的偏差）：`desktop_shell_device`/`grant`/`operation` 由 `20260924-desktop-shell.sql`（显式 `BEGIN…COMMIT`、`IF NOT EXISTS`）建，`20260928-desktop-shell-approval.sql` 补 `operation jsonb`；先跑前者再跑后者，回滚须按外键逆序。
  - 字典族是「只读 + 种子」，改种子要改初始化而不是直接 INSERT：language/country/currency 无写端点；`LanguageInitCommand` 可在运行期重灌，但 `createLanguages` 唯一冲突被 try/catch + `console.log` 吞掉（静默失败），`createCountries`/`createCurrencies` 直插且 `isoCode` 无唯一约束（重复执行重复插行），颜色取 `faker.internet.color()` 不可复现。
  - `contact` 的基类 CRUD 继承面：`ContactController` 只新增 `GET /`，`POST`/`PUT`/`DELETE`(`/soft`,`/recover`) 全由 `CrudController` 提供（覆写点只有 `getAllContact`）；且 `ContactModule` 未被任何模块 import，`@Controller()` 路由实际未挂载。
  - `view-extension` 宿主解析有插件依赖：宿主注册表由启动期 `DiscoveryService` 扫描建立（进程内内存，新增宿主需重启）；视图 provider 未加载、宿主未注册或 `canRead` 不通过，分别表现为 `Unknown view host` / `View host … was not found` / 403「视图不显示」。
- **测试状态**：jest spec 合计 29（本域 12 模块）＋ 邻域/协议 5**；另有 1 个 `.test.ts`（非 spec 命名）。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
