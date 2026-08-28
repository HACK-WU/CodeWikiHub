# 存储与配置基础专家

**一句话职责**：kisearch 数据落盘与配置基座——JSON 存储（WAL 原子写 + 跨进程锁）、scope 隔离、配置加载、备份/还原/导出、诊断与初始化。

**负责的模块**：`src/lib/{store,wal,scope,config,config-schema,constants,cli-args,backup,markdown-gen,preflight,health-check}.ts` + `src/{backup,restore,export,config,scope,doctor}.ts`

**何时找这个专家**：
- 需要读写 KB JSON 数据（group-index / relations-cache / local KB）或理解 WAL 原子写机制
- 需要理解 scope 隔离、配置加载优先级（`--config` > `~/.ki/config.yaml` > 默认值）、默认数据目录（`~/.ki/kb|backup|vector`）
- 配置项不生效 / 启动报 `CONFIG_FIELD_INVALID`，需要理解配置字段级校验规则
- 需要备份/还原/导出 KB 数据，或排查 `ki doctor` / `ki backup` / `ki restore` / `ki export` / `ki config` / `ki scope` 相关行为

**契约层就绪**：`C0 + C1 + C2 + C4` 就绪

**包含的资产**：
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C2-使用流程.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`03-数据流转.md`、`04-模型.md`、`06-测试.md`、`07-运维.md`

**测试状态**：测试目录 `test/`（`config-doctor.test.ts`、`restore.test.ts`、`scope-mode.test.ts`、`scope-isolation.test.ts`、`scope-source.test.mjs`、`lib.test.ts` 等），✅ 可跑（`npx jiti test/<name>.test.ts`，`.mjs` 用 `node --test`）；⚠️ `restore` 部分用例依赖文件系统，embedding 检查依赖真实 API Key；⚠️ 本机跑测试需 `env -u NODE_OPTIONS -u BASH_ENV` 规避 IDE 注入。详见 `implementation/06-测试.md` 与 `test/known-failures.md`。

**出处行**：生成日期 2026-08-06；合并补全 2026-08-28，git commit：`9841255`（资产基线）

**基线后主要变更**（本次合并补全覆盖）：新增 `config-schema.ts` 字段级校验；默认数据目录统一 `~/.ki` 且不继承存量；删除 `lib/diff.ts` / `src/setup.ts` / `src/migrate-keywords.ts`；移除 rootName 与 ai-results 备份通道；restore 增 `--rebuild-vector/--group/--tags`；export 增 `--group` 去 `--root-name`；health-check 增「配置字段」告警项。
