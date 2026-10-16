# 基础字典与客户端壳子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（平台底座与集成专家）
- **资产路径**：`.module-experts/后端专题/平台底座与集成专家/sub-experts/基础字典与客户端壳子专家/`
- **职责**：本子专家负责**平台基础枚举与种子**（`language` / `country` / `currency` / `contact` 四模块，其中 `contact` 语义上接近业务实体但物理上与字典族同放 `packages/server/src`）、**客户端壳服务端面**（`desktop-shell` 设备/授权/执行台账 + 一条 WS 通道、`mobile` 只读投影）、**引导队列**（`initialization` 的入组/建组织/建租户副作用与 ClawXpert 恢复）与**模型 Provider 目录**（`ai-model` 门面，0 表），外加两个相邻面：`tags`（唯一可写字典）与 `export-import`（保留模块但无 HTTP 面）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/{language,country,currency,contact}`
  - `server-ai/src/{desktop-shell,mobile,initialization,ai-model}`
  - `相邻：server/src/{tags,export-import}`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 字典是「只读 + 种子」，改种子要改初始化而不是直接 INSERT：language / country / currency 无写端点；`LanguageInitCommand` 可在运行期重灌，但 `createLanguages` 的唯一冲突被 `try/catch + console.log` 吞掉（静默失败），`createCountries` / `createCurrencies` 直插且 `isoCode` 无唯一约束（重复执行重复插行），`color = faker.internet.color()` 不可复现且每次重跑清空 `description`。前端 `LanguagesService` 仍保留 `insertLanguage` / `update` / `delete`（POST/PUT/DELETE `/api/languages*`）——服务端**无对应端点
  - 语言 fallback 规则：`I18nObject` 以 `en_US` 必填、`zh_Hans` 可选；服务端选语言的唯一依据是 `RequestContext.getLanguageCode()`，i18next 以 `fallbackLng: 'en'` 兜底，字面实现见 `getDefaultOrganizationWorkspaceName`（`Chinese|SimplifiedChinese → zh_Hans ?? en_US`）与 `AIModelGetIconHandler`（`lang.toLowerCase()==='zh_hans' && icon.zh_Hans || icon.en_US`）。
  - `/api/contact` 未挂载——当前不可用（如实写）：`ContactModule` 既未注册进 `server.module.ts`，也没有 `RouterModule.register`，`@Controller()` 为空前缀；表结构仍在 `coreEntities` 中（库结构存在、服务端面不存在），Swagger 不出现该组路由。恢复挂载须同时补路由前缀、守卫实例化与「无唯一键」的写入去重策略。
  - `/api/import` 未挂载：`ImportAllModule` 自身声明 `RouterModule.register([{ path: '/import' }])`，但全仓无人 import、`server.module.ts` 也未注册；`ImportAllService` 与 `unzipAndParse` 相关调用**全部被注释**，POST 只落一条 `import-history`（成功/失败各一行），`import-record` 无存活写入路径（死表）；两表注册来源不对称（`ImportRecord` 在 `coreEntities`、`ImportHistory` 只在自身模块 `forFeature`）。
  - `desktop_shell_device.credentialHash` 是 sha256 摘要，凭证本体只在客户端：`register` 生成 `randomBytes(32).toString('base64url')`，明文 `token = <deviceId>.<secret>` **只随响应返回一次**；库内只存 `createHash('sha256')` hex，认证用 `timingSafeEqual` 比较摘要并同时校验 `enabled` 与 `credentialExpiresAt`；`refresh` 是唯一轮换路径，旧 token 立即失效。
  - `desktop-shell` 是 3 表 + 2 迁移（索引记 0 表的偏差）：`desktop_shell_device` / `_grant` / `_operation` 由 `20260924-desktop-shell.sql`（显式 `BEGIN…COMMIT` + `CREATE TABLE IF NOT EXISTS`，additive）建，`20260928-desktop-shell-approval.sql` 单句补 `grant.operation jsonb`；须先跑前者再跑后者；`operation.grantId` 未声明 `ON DELETE`、`assistantId` / `threadId` / `runId` 均无外键（弱引用）。
- **测试状态**：1. 本子域 spec 清单与分布（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
