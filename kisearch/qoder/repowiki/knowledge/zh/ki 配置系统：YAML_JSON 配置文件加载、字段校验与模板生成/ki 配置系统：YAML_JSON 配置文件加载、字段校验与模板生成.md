---
kind: configuration_system
name: ki 配置系统：YAML/JSON 配置文件加载、字段校验与模板生成
category: configuration_system
scope:
    - '**'
source_files:
    - src/lib/config.ts
    - src/lib/config-schema.ts
    - src/config.ts
    - docs/configuration.md
    - src/lib/cli-args.ts
---

## 1. 系统与方案

ki 采用**自实现的 YAML/JSON 配置文件 + 声明式 schema 校验**的配置体系，无第三方配置框架。核心由 `src/lib/config.ts`（加载与默认值合并）、`src/lib/config-schema.ts`（字段名/类型/取值校验）和 `src/config.ts`（`ki config init` 模板生成命令）三部分组成，并通过 `docs/configuration.md` 对外文档化。

## 2. 关键文件

- `src/lib/config.ts` — 配置加载主逻辑：查找优先级、路径展开、默认值合并、scope 护栏解析、配置写回（移除 scope）、进程内缓存。
- `src/lib/config-schema.ts` — 声明式 schema：以 `ConfigNode` 树描述顶层字段、子对象、枚举、数组、自定义校验器（端口范围、http URL、正整数），并实现 Levenshtein 相近字段建议。
- `src/config.ts` — `ki config init` 子命令：生成带注释的 `~/.ki/config.yaml` 模板，同时创建 dataDir / backupDir / vectorDir。
- `docs/configuration.md` — 用户级配置文档：字段说明、完整示例、校验规则表。
- `src/lib/cli-args.ts` — CLI 参数解析辅助（未知 flag 检测、整型/浮点解析），与配置系统配合形成统一的 fail-loud 体验。

## 3. 架构与约定

### 3.1 配置文件查找优先级（高→低）

1. `--config <path>` 命令行参数（按扩展名判定 YAML/JSON 解析器）
2. 环境变量 `KI_CONFIG_PATH` 显式指定路径
3. `$HOME/.ki/config.yaml`
4. `$HOME/.ki/config.yml`
5. `$HOME/.ki/config.json`
6. 内置默认值（无配置文件时）

### 3.2 路径与默认值策略

- 所有数据目录统一落用户根 `~/.ki/`：dataDir 默认 `~/.ki/kb`，backupDir 默认 `~/.ki/backup`，vectorDir 默认 `~/.ki/vector`。
- 路径支持 `$HOME` / `~` 前缀展开；相对路径基于配置文件所在目录解析。
- **不做存量路径继承**：旧默认 `{项目根}/kb`、`~/.ki-data` 不再自动沿用，需用户迁移或显式配置。
- `resolveDefaultDataPaths(includeEnv)` 仅在 `ki config init` 模板生成时允许 `KI_DATA_DIR` 覆盖，运行时不读取该环境变量。

### 3.3 配置结构

顶层字段：`dataDir`、`backupDir`、`vectorDir`、`embedding`、`scopeMode`、`scopes`、`mcp.http`。

- `embedding`：`provider`（siliconflow | openai-compatible）、`baseURL`（http(s) URL）、`model`、`dimension`（固定 4096）、`apiKey`（明文或 `${VAR_NAME}` 引用，缺省则 fail-loud）。`apiKey` 不支持隐式 env 回退。
- `scopeMode`：`default`（未注册 scope 也放行）| `strict`（白名单模式，未注册直接报错）。
- `scopes.<name>`：每个 scope 可配 `kbDir`（自动拼接 `kb/{scope}`）、`wikiSync`（enabled/sourceDir/autoBackfill）、`clean`（rules/hooks）、`import`（extensions/maxFileSize）。
- `mcp.http`：仅承载 HTTP 传输默认值（host/port/allowedHosts），token 绝不写入配置文件。

### 3.4 字段校验机制

`parseAndExpand` 在 YAML/JSON 语法解析成功后、宽容归一化之前调用 `validateConfigFields`：

- 未知字段 → 错误（附 Levenshtein 相近字段建议）
- 类型不符 → 错误
- 非法枚举/取值（如 port 超出 1-65535、baseURL 非 http(s)）→ 错误
- 废弃字段（如 `scopes.<scope>.sourceDir`）→ 仅告警，仍按“被忽略”加载
- null 的 scope 条目（YAML 裸写 `default:`）→ 告警，丢弃该 scope
- 收集全部问题后一次性报告（最多 10 条，超出提示“另有 N 处”），错误前缀 `CONFIG_FIELD_INVALID`
- 校验失败时**所有 ki 命令（含 `ki mcp` 启动）都会直接报错退出**，不会带着错配继续运行
- 根层 `x-` 前缀键（锚点模板载体）放行，不参与字段名校验

### 3.5 进程内缓存

`loadConfig` 返回结果缓存在模块级 `_cached`，同一进程多次调用不重复读盘；写回操作（`removeScopeFromConfigFile`）会调用 `resetConfigCache()` 失效缓存。

### 3.6 配置模板生成

`ki config init [--dir <path>] [--force]`：
- 目标目录默认 `$HOME`，生成 `.ki/config.yaml`（幂等，已存在需 `--force` 覆盖）
- 使用 `resolveDefaultDataPaths(true)` 探测默认路径，将 home 下路径转为 `$HOME/...` 可移植形式
- 同时创建 dataDir / backupDir / vectorDir 三个目录

## 4. 约定与约束

- **fail-loud 哲学**：配置错误一律抛错退出，不静默吞掉拼写错误或类型错误。
- **密钥安全**：`apiKey` 优先使用 `${VAR_NAME}` 引用环境变量；MCP token 只走 CLI/env，绝不入配置文件。
- **向后兼容**：废弃字段（如 scope 级 `sourceDir`）仅告警不阻断；读到旧版 `config.json` 时提示迁移到 YAML。
- **YAML 限制**：合并键 `<<: *anchor` 不被解析器展开，会被校验拦截；整值引用 `*anchor` 可用。
- **scope 隔离**：`getScopeDataDir` 优先使用 `scopes.<scope>.kbDir`（自动拼接 `kb/{scope}`），fallback 到 `dataDir/{scope}`。
- **向量库 schema 不可变**：增加字段需删 `vectorDir` 重建，会丢失该 scope 全部向量数据并需重新导入。
- **CLI 参数优先级高于配置**：例如 MCP host/port 生效顺序为 `--host/--port` > `mcp.http.host/port` > 内置默认。