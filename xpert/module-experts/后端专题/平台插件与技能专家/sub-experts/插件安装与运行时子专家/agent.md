# 插件安装与运行时子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（平台插件与技能专家）
- **资产路径**：`.module-experts/后端专题/平台插件与技能专家/sub-experts/插件安装与运行时子专家/`
- **职责**：本子域回答一个问题：**「这台机器上装了哪些插件、还能不能装、装完什么时候生效」** —— 全部口径都锚在「重启才生效的东西」上：磁盘上的插件 staging 目录、`plugin_instance` 表、市场来源目录，以及本次进程启动时写下的那份候选配置快照。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/plugin`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 启动 hook 超时 / 失败即致命：`runPluginStartupStep` 默认 30s，超时抛 `PluginStartupTimeoutError`（`code = 'PLUGIN_STARTUP_TIMEOUT'`），进程保持不可服务；失败日志刻意**只**输出 `{event, pluginName, stage, durationMs, code}`，**不记录插件配置与异常文本**（可能含凭据）。排查必须依赖快照与 `code`，不要指望日志里有堆栈。
  - 动态装配顺序不可颠倒：必须先合并 ORM metadata（`collectPluginOrmMetadata` → `validatePluginEntityTableNames` → `registerPluginOrmMetadataInDataSource`），再 `lazyLoader.load()`，最后注册路由与策略。顺序颠倒会得到 `EntityMetadataNotFoundError`，或路由被 splice 到尾部 404 处理器之后（表现为 404）。
  - `packageDir` 是瞬态字段：落库前由 `omitTransientPluginSourceConfig` 删除；HTTP 传入必须被拒绝（只有归档上传路径带 `allowPackageDir`）。因此**不能靠库里 `sourceConfig` 判断磁盘状态**。
  - `(scopeKey, pluginName)` 与 partial unique 语义不同：唯一键 `(scopeKey, pluginName)` 兜业务幂等；partial unique `pluginName WHERE level='tenant'` 兜「tenant 级插件全平台只允许一个租户持有」。`(tenantId, organizationId, pluginName)` 在 `organizationId IS NULL` 时因 SQL NULL 语义**不互相冲突**。
  - 未声明 `PluginRuntimePolicy` 时的默认：`requiresPluginRestart` 对 system / tenant 返回 `true`、organization 返回 `false`；同一次判定还要按 `existingRuntime ? 'update' : 'install'` 选 operation。声明为 hot 却实际需要重启时，热路径会抛 `server:Error.PluginRuntimePolicyChanged`。
  - zip 上传约 100MB 且 zip-slip 防护只覆盖路径：`FileInterceptor` 限额 100MB；`assertSafeArchiveEntries` 对 zip 条目名与 `tar -tf` 列表都拒绝 `..` / `../` 前缀与绝对路径，并要求归档内**恰好一个 `package.json`**；但**符号链接 / 硬链接等特殊条目未在代码中确认有显式拒绝**，解包仍可能把链接写入目标目录树内。
- **测试状态**：P["packages/server/src/plugin<br/>39 spec / ~310 it"] --> R["根目录 23"]（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
