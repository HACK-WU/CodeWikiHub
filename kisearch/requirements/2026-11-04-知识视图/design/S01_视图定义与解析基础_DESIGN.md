# S-01 视图定义与解析基础

- 父文档：`DESIGN.md` §3
- 前置依赖：无（本子需求是全部下游的基础）
- 证据：🟢 代码直读 ｜ 版本：v2（`views` 迁独立文件、补自引用与 strict 校验）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 视图定义 | `views.json` 中 `views.<name> = { members: string[] }` |
| 展开 | 视图名 → `members` 的过程，唯一实现于 `scope-view.ts` |
| 命名空间 | scope 名 ∪ 视图名的并集，内部必须唯一 |

> 「视图 / 成员 / 展开」的通用定义见**父文档 §3.4 共享术语速查**；本节只补充本子需求特有的精确口径。

---

## 2. 现状（AS-IS）

**没有任何"scope 集合"概念**：`alias` / `profile` / `bundle` / `view` 在 `src/` 下 0 命中。

两类可复用的既有范式：

| 范式 | 位置 | 可复用部分 |
|---|---|---|
| **配置写回**（YAML 保留注释 + 原子写） | `src/lib/config.ts:1052-1096` `setScopeReadonlyInConfigFile` | ⚠️ **本次不用**（见 D1）；但其 `atomicWriteConfig`（`:1108-`，tmp + rename + 保留 mode）仍要借鉴 |
| **独立 JSON 存储 + 文件锁** | `src/lib/mcp-token.ts:27-30` `getTokensPath()`、`:104-140` `withTokensLock()` | ✅ **本次照抄**：`views.json` 与 `mcp-tokens.json` 同位同类 |

`withTokensLock` 的关键参数（直接沿用，不自创）：锁文件 `wx` 打开、5s 超时、30s 陈旧抢占、10ms 轮询、`MCP_TOKEN_LOCKED` 风格的错误码。

---

## 3. 方案（TO-BE）

### 3.1 新增文件

```
src/
├── lib/
│   ├── scope-view.ts        # [新增] 类型 + 校验 + 解析 + views.json 读写（含锁）
│   └── ..
├── view.ts                  # [新增] ki view 命令族
└── ..
bin/ki.mjs                   # [修改] COMMANDS 增加 'view' + 帮助文本
```

> 解析（纯函数）与存储（IO + 锁）**同放 `scope-view.ts`**：它们共享同一份类型与错误码，拆两个文件会让 `ViewError` 的 code 集合分散。

### 3.2 数据模型

```ts
// src/lib/scope-view.ts

export interface ViewConfig {
  /** 有序成员列表（顺序只影响展示，不影响检索排序） */
  members: string[];
}

export interface ViewsFile {
  version: 1;
  views: Record<string, ViewConfig>;
  updatedAt: string;
}
```

```json
// ~/.ki/views.json（0600）
{
  "version": 1,
  "views": {
    "team": { "members": ["kisearch", "kisearch-memory", "team-docs"] },
    "work": { "members": ["kisearch", "kisearch-memory"] }
  },
  "updatedAt": "2026-11-04T10:00:00.000Z"
}
```

**落点推导**（`getViewsPath(config): string`）

| 配置来源 | `views.json` 位置 |
|---|---|
| 有 `config._configPath`（含 `--config` 隔离、`KI_CONFIG_PATH`） | `path.join(path.dirname(config._configPath), 'views.json')` |
| 无配置文件（`default` 模式首次使用） | `path.join(os.homedir(), '.ki', 'views.json')` |

> **为何跟着 config 目录走**：① 默认配置在 `~/.ki/config.yaml`，与 `mcp-tokens.json` 同目录 ② `--config /tmp/x/config.yaml` 能让测试与多环境完全隔离（若硬编码 `os.homedir()`，测试会污染真实 home）。

**字段规则**

| 字段 | 规则 |
|---|---|
| 视图名（map key） | `^[a-zA-Z0-9_-]+$`；∉ 保留名；∉ `Object.keys(config.scopes)` |
| `members` | 长度 ≥ 1；每项过 `validateScope()`；每项 ∉ `{selfName}` ∪ 全部视图名；内部去重保序 |
| `members`（strict 模式） | **额外要求**每项 ∈ `config.scopes`（见 D4-v2） |

**保留名**

```ts
export const RESERVED_VIEW_NAMES: ReadonlySet<string> = new Set([
  'all',        // token 通配，且能通过 SCOPE_PATTERN（mcp-token.ts:81）
  'default',    // 缺省回退（config.ts:962）
  '__global__', // 调度器全局锁（scope.ts:20）
  '__root__',   // 根散文件保留键（import-path.ts）
]);
```

### 3.3 解析器接口

```ts
export class ViewError extends Error {
  code: ViewErrorCode;   // 见父文档 §3.5
  view?: string;
}

/** 名字合法性：字符集 + 保留名 + 与已有 scope 撞名 */
export function validateViewName(config: KiConfig, name: string): void;

/**
 * 成员合法性。
 * @param selfName 创建场景传目标名——**必须显式排除自身**，否则
 *   `ki view create team --members team` 会因 team 尚不存在而通过校验，
 *   随后展开成 team→[team] 无限循环。
 */
export function validateViewMembers(
  config: KiConfig,
  members: string[],
  selfName?: string,
): void;

export function listViewNames(config: KiConfig): string[];
export function isViewName(config: KiConfig, name: string): boolean;

/** 取成员；不存在抛 VIEW_NOT_FOUND，为空抛 VIEW_EMPTY */
export function getViewMembers(config: KiConfig, name: string): string[];

/** 【唯一展开入口】 */
export function resolveScopeTargets(config: KiConfig, raw?: string): ScopeTargets;

export interface ScopeTargets {
  /** 请求中出现的视图名（保序去重）；空数组 = 纯 scope 请求，行为与现状完全一致 */
  views: string[];
  /** 展开后的真实 scope 列表（保序去重） */
  scopes: string[];
  /** 需上报的跳过/降级项（沿用 search 的 skipped 契约） */
  skipped: { scope: string; reason: string }[];
}
```

**`resolveScopeTargets` 行为表**

| 输入 | `views` | `scopes` | `skipped` / 抛错 |
|---|---|---|---|
| `undefined` / `''` | `[]` | `[resolveScope(config, undefined)]` = `['default']` | `[]` |
| `'a'`（真实 scope） | `[]` | `['a']` | `[]` |
| `'team'`（视图，成员 a,b） | `['team']` | `['a','b']` | `[]` |
| `'team'`（成员 a + 不存在的 x） | `['team']` | `['a','x']` | `[{scope:'x', reason:'视图 team 的成员 scope 尚不存在'}]` |
| `'team,kisearch'` | `['team']` | `['a','b','kisearch']` | — |
| `'team,team'` | `['team']` | `['a','b']` | — |
| `'team'`（空视图） | — | — | 抛 `VIEW_EMPTY` |
| **`'../etc'`** | — | — | **抛 `ScopeError('INVALID_SCOPE')`** |
| **`'team,../x'`** | — | — | **抛 `ScopeError('INVALID_SCOPE')`（任一段非法即整体失败）** |

> ★ **安全不变量（I6）**：必须对**每个原始段**先调用 `validateScope()` 才能进入名→成员解析。
> 现状 `parseScopes`（`src/lib/scope.ts:68-84`）承担的正是这道闸；本设计整段替换它，**不显式承接就是安全回归**。
> 固定实现顺序：`split(',')` → 逐段 `trim` → **逐段 `validateScope`** → 才判断是否视图 → 展开成员。

### 3.4 `views.json` 读写（含锁）

```ts
export function getViewsPath(config: KiConfig): string;
function withViewsLock<T>(filePath: string, fn: () => T): T;   // 照抄 mcp-token.ts:104-140

/** 读取；文件不存在返回空视图表（不报错）；JSON 损坏抛 VIEWS_CORRUPT */
export function readViews(config: KiConfig): Record<string, ViewConfig>;

/**
 * 写入 / 删除单个视图。读-改-写全程持锁。
 * @param members null = 删除该视图
 */
export function writeView(config: KiConfig, name: string, members: string[] | null): void;
```

**约束**

| 项 | 做法 |
|---|---|
| 原子性 | `tmp-${pid}` + `rename`；新文件 mode `0600`，已存在则沿用原 mode |
| 并发 | `withViewsLock`（`wx` 锁文件）；超时抛 `VIEWS_FILE_LOCKED`，文案给出「确认无进程操作可删除 `views.json.lock`」 |
| 目录 | 父目录不存在则 `mkdirSync(recursive, 0o700)` |
| 损坏 | 读失败抛 `VIEWS_CORRUPT`，**拒绝写入**（不在损坏文件上做读-改-写，否则会把原内容彻底覆盖掉） |
| 读放大 | 进程内不做缓存——`views.json` 极小（< 10KB），每次 `readViews` 一次 `statSync`+`readFileSync`；配置本身已是同一模式 |

### 3.5 CLI 命令族

| 命令 | 参数 | 行为 | 退出码 |
|---|---|---|---|
| `ki view list` | `--json` | 表格：视图名 / 成员数 / 成员 / 缺失成员 | 0 |
| `ki view show <name>` | `--json` | 详情：成员 + 每个成员的**目录是否存在**（配置级，不查向量层、不查只读） | 0 / 1 |
| `ki view create <name>` | `--members a,b` 或 `--add a --add b` | 创建；已存在 → 报错不覆盖 | 0 / 1 |
| `ki view add <name> <scope>` | — | 追加成员（幂等：已存在则「无变更」） | 0 / 1 |
| `ki view remove <name> <scope>` | — | 移除；移空 → 拒绝并提示 `ki view delete` | 0 / 1 |
| `ki view delete <name>` | `--yes` | 只删视图定义，**绝不动成员数据** | 0 / 1 |

**`ki view show` 输出（配置级口径）**

```
$ ki view show team
视图 team（3 个成员）

  成员             KB 目录   备注
  kisearch         ✓
  kisearch-memory  ✓
  team-docs        ✗         尚未导入（导入后自动生效）
```

> ★ **刻意不查向量层与只读状态**：那两项要 `executeScopeList()`（`src/scope.ts:197-293`），属 S-04 的改动面。
> 若在 S-01 里调用就形成 `S-01 → S-04` 反向依赖，与 DAG 成环。同理 `ki view delete` **不查询 token**，改为**静态文案**：

```
⚠ 该视图可能已被 Token 授权；删除前可执行
  ki mcp token list --granting-view team
核对（删除后这些 Token 将失去该视图的访问）。
```

该命令由 S-04 提供（验收 D10 / D10-b）。

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | 视图存**独立文件** `~/.ki/views.json` | ① 放 `config.yaml` 顶层 `views:`（v1 方案）② 独立 `~/.ki/views.json` 但硬编码 homedir | ① `config-schema.ts:9-12` 对未知字段是**错误**，回滚到旧版本会 `CONFIG_FIELD_INVALID` → **`ki` 全命令不可用**（运维事故）；且配置写回无文件锁，并发丢更新 ② 硬编码 homedir 会让 `--config` 隔离失效、测试污染真实 home | 视图数量 > 200 且需要与 `scopes` 同事务修改（此时考虑合并进配置并接受回滚约束） |
| **D2** | `--scope` 复用，不新增 `--view` | 新增 `--view` / `--scope-group` | 20 个 CLI 命令 + 13 个 MCP 工具 + 12 个 HTTP handler 都要加参数；用户还要记两套 | 出现"必须同时指定 scope 与 view"的真实场景 |
| **D3** | 撞名时**创建即拒绝**，不做"视图优先" | 视图优先于同名 scope | `--scope foo` 二义；`ki import --scope foo` 无法判断写哪 | 永不 |
| **D4** | 成员允许暂不存在（前向声明） | 创建时强制校验存在 | 与 `scopeMode: default` 的"首次使用自动创建"哲学一致；否则批量建视图受导入顺序约束 | — |
| **D4-v2** | **`strict` 模式下成员必须已注册** | 沿用 D4（strict 下也允许成员不存在） | `strict` 的存在意义就是防拼错。允许不存在的成员 = 给拼写错误开静默通道，用户以为视图覆盖 3 个库而实际只有 2 个，要到检索时才发现 | 无 |
| **D5** | 视图成员保序 | 集合（无序） | 展示需要稳定顺序 | 无 |
| **D6** | 禁嵌套（含自引用） | 支持嵌套 + 环检测 | 环检测 / 深度上限 / 权限传递三座山，收益为负；**自引用必须由 `selfName` 显式排除**，不能只判"是否是已存在视图" | 出现"多层组织结构"的真实诉求 |
| **D7** | 解析与存储同放一个文件 | 拆 `scope-view.ts` + `views-store.ts` | 共享同一份类型与错误码；拆开会让 `ViewErrorCode` 集合分散两处 | 该文件超 500 行 |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 视图名含非法字符 | `INVALID_VIEW_NAME` + 指出非法字符 | 是 |
| 视图名是保留名 | `RESERVED_VIEW_NAME` + 列出保留名 | 是 |
| 视图名与已有 scope 撞名 | `VIEW_NAME_CONFLICT` + 「已存在同名知识库」 | 是 |
| `create` 时视图已存在 | 报错不覆盖 + 「改成员请用 `ki view add/remove`」 | 是 |
| `remove` 把成员移空 | 拒绝 + 「视图至少要有一个成员；解散请用 `ki view delete team`」 | 是 |
| 成员为空 | `VIEW_EMPTY` | 是 |
| 成员是视图名 / 是自身 | `VIEW_MEMBER_IS_VIEW` | 是 |
| strict 下成员未注册 | `VIEW_MEMBER_NOT_REGISTERED` + 列出已注册 scope | 是 |
| `views.json` 损坏 | `VIEWS_CORRUPT` + 「请检查 `~/.ki/views.json`，或删除后重建（不影响各知识库数据）」；**拒绝所有写操作** | 是 |
| 并发写超时 | `VIEWS_FILE_LOCKED` + 指针 | 是 |
| 父目录不可写 | `WRITE_FAILED` + 原始错误 | 是 |

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/scope-view.ts` | **新增**（约 260 行：类型 / 校验 / 解析 / 读写 + 锁） |
| `src/view.ts` | **新增**（约 300 行，commander） |
| `bin/ki.mjs` | `COMMANDS['view'] = 'src/view.ts'` + 帮助文本 |
| `docs/cli.md` | 新增 `## view` 章节 |
| `docs/configuration.md` | 新增「视图存储于 `~/.ki/views.json`」说明（**不是配置字段**） |

**不影响**：`config.ts` / `config-schema.ts`（v2 起**完全不动**）、检索链路、写路径、鉴权、前端。

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| A1 | 创建后可见 | `ki view create team --members a,b` → `ki view list` 出现 `team` |
| A2 | 幂等 | 重复 `ki view add team a` → 「无变更」，退出码 0 |
| A3 | 撞名拒绝 | 已有 scope `foo` 时 `ki view create foo --members a` → 1，`VIEW_NAME_CONFLICT` |
| A4 | 保留名拒绝 | `ki view create all --members a` → `RESERVED_VIEW_NAME` |
| A5 | 禁嵌套 | 已有视图 `v1` 时 `ki view create v2 --members v1` → `VIEW_MEMBER_IS_VIEW` |
| A5b | **禁自引用** | `ki view create t --members t` → `VIEW_MEMBER_IS_VIEW`（不能因 t 尚不存在而放行） |
| A6 | 移空拒绝 | 单成员视图 `ki view remove v a` → 拒绝并给 `ki view delete` |
| A7 | 不动数据 | `ki view delete team` 后 `ls $dataDir/a` 与 `ki search --scope a` 均正常 |
| A8 | show 为配置级 | `ki view show team` 只输出成员与 KB 目录存在性，**不输出向量/只读** |
| A9 | **不碰配置文件** | `ki view create` 前后 `config.yaml` 的 mtime 与内容逐字节不变 |
| A10 | 展开正确 | 单测覆盖 §3.3 行为表 9 行 |
| A11 | 非法字符拒绝 | `resolveScopeTargets(config,'../etc')` → `ScopeError`；`'team,../x'` 整体失败 |
| A12 | **strict 运行时口径一致** | strict 下某成员被从 `config.scopes` 移除 → 检索时该成员进入 `skipped`（**不享"视图免注册"特权**，见 S-02 D2） |
| A13 | **strict 成员校验** | strict 配置下 `ki view create t --members nope` → `VIEW_MEMBER_NOT_REGISTERED` |
| A14 | **并发不丢** | 并发 10 个 `ki view add` → `ki view show` 成员数 = 10 |
| A15 | **回滚安全** | 建视图后，把 `views.json` 移走 → 所有命令正常（视图功能静默失效，无报错） |
| A16 | `--config` 隔离 | `--config /tmp/x/config.yaml` 时 `views.json` 落在 `/tmp/x/`，真实 `~/.ki` 不被创建 |
| A17 | 损坏拒绝写 | 手工写坏 `views.json` 后 `ki view add` → `VIEWS_CORRUPT`，文件内容未被覆盖 |
