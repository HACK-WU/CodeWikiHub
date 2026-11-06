# S-01 数据模型 v2 与 Git 识别 — 详细设计

> 父文档：[DESIGN.md](./DESIGN.md)
> 依赖：无
> 被依赖：S-02 / S-03 / S-04 / S-05

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 数据源类型 `type` | `directory` = 普通目录（全量同步）；`git` = Git 仓库（增量同步） |
| `repoRoot` | 仓库根绝对路径，可能是 `dir` 的祖先 |
| `relativeRoot` | `dir` 相对 `repoRoot` 的 posix 前缀；仓库根为 `''` |
| 托管 clone | `managed=true`，由 S-05 工具克隆并维护的仓库副本 |
| 水位 `commit` | 上次**完整成功**同步推进的 commit，供下次 diff 使用 |

---

## 2. 现状（AS-IS）

| 事项 | 现状 | 证据 |
|---|---|---|
| 记录模型 | 只有 `dir / group / conflictMode / conflictSuffix / vector / chunkSize / chunkOverlap / lastSync`，无类型、无 Git 信息 | `src/lib/datasource-types.ts:95-113` |
| 读取归一 | `normalizeRecord` 逐字段校验并补默认值，返回 `version: 1` | `src/lib/datasource.ts:100-130` |
| 登记 | `addDataSource` 同步函数：解析路径 → `checkSourceDir` → 读写 `datasource.json`，无写锁 | `src/lib/datasource.ts:217-302` |
| 取消登记 | `removeDataSource` 同步函数：只删 `datasource.json` | `src/lib/datasource.ts:309-325` |
| 写入 | `writeDataSource` 原子写（tmp + rename，0600），但不保护读-改-写 | `src/lib/datasource.ts:133-139` |
| 写锁 | 已有跨进程 `withScopeWriteLock(scope, operation, fn)`；同一异步链内可嵌套 | `src/lib/scope-write-lock.ts:14-66` |
| 枚举 | `scanDataSources` 只做 `stat + access` 轻量可达性检查 | `src/lib/datasource.ts:344-396` |
| CLI | `add` 只有 `--source`，无 `--type`；`list` 无类型/commit 输出 | `src/datasource.ts:95-131`、`:135-192` |
| 旧记录 | 现网 `langchain` / `scope` 两条记录均为 v1，无 `type` | `~/.ki-data/{langchain,scope}/datasource.json` |

---

## 3. 方案（TO-BE）

### 3.1 文件结构

```text
src/
├── lib/
│   ├── datasource-types.ts        # [修改] 新增 DataSourceKind / GitInfo / GitSyncState / 快照字段
│   ├── datasource.ts              # [修改] 探测、v1→v2 归一、add/remove 异步化 + 写锁
│   ├── datasource-git.ts          # [新增] probeGit / sanitizeRemoteUrl（S-02 继续扩展同步能力）
│   └── scope-write-lock.ts        # [复用] 不修改
├── datasource.ts                  # [修改] CLI add --type / list 输出
test/
├── datasource-model-v2.test.ts    # [新增] 归一、迁移、字段校验
└── datasource-git-probe.test.ts   # [新增] 仓库根/子目录/无仓库/空仓库
```

### 3.2 Git 探测

新增 `src/lib/datasource-git.ts`：

```ts
export interface GitProbe {
  repoRoot: string;
  relativeRoot: string;
  branch: string | null;
  remoteUrl: string | null;
  headCommit: string | null;
}

export type GitProbeResult =
  | { ok: true; value: GitProbe }
  | { ok: false; code: 'GIT_UNAVAILABLE' | 'NOT_A_GIT_REPO' | 'GIT_SUBDIR_INVALID'; error: string };

export async function probeGit(dir: string): Promise<GitProbeResult>;
export function sanitizeRemoteUrl(raw: string): string | null;
```

探测步骤（全部 `execFile`，禁止拼 shell）：

1. `git -C <dir> rev-parse --show-toplevel` → `repoRoot`；失败按 stderr 区分「git 不存在」与「不是仓库」。
2. **先 canonicalize**：`fs.realpathSync(dir)` 与 `fs.realpathSync(repoRoot)`，再 `relativeRoot = path.relative(canonicalRepoRoot, canonicalDir)` → posix；若以 `..` 开头或为绝对路径 → `GIT_SUBDIR_INVALID`。**不做 realpath 时，symlink 指向仓库子目录会被误判成越界**（`git --show-toplevel` 返回真实路径，而 `dir` 是链接路径）。
3. `git -C <repoRoot> rev-parse --abbrev-ref HEAD` → 分支；输出 `HEAD`（detached）→ `null`；空仓库失败 → `null`。
4. `git -C <repoRoot> remote get-url origin`（失败则取第一个 remote）→ `remoteUrl`；无 remote → `null`。
5. `git -C <repoRoot> rev-parse HEAD` → `headCommit`；空仓库 → `null`。
6. `sanitizeRemoteUrl`：去掉 `user:pass@`；scp-like 保留 `user@host:path`；返回 `null` 表示无可用 URL。

执行参数：`timeout=5s`、`LC_ALL=C`、`GIT_TERMINAL_PROMPT=0`、`maxBuffer=1MB`。

### 3.3 `addDataSource` 变更

- 签名改为 `async`，内部用 `withScopeWriteLock(scope, 'datasource-add', fn)` 包住读-改-写。
- 新增输入：
  - `type?: 'directory' | 'git'`（`--type`；缺省自动探测）
  - `gitInfo?: DataSourceGitInfo`（S-05 托管 clone 直接注入，避免重复探测）
- 流程：
  1. 解析 scope / dir / 参数（现有逻辑不变）。
  2. `typeHint = input.type ?? 'auto'`：
     - `git` 或 `auto`：`probeGit(dir)`；成功 → `type='git'`；`auto` 失败 → `type='directory'`；显式 `git` 失败 → 返回 `NOT_A_GIT_REPO` / `GIT_UNAVAILABLE`。
     - `directory`：即使目录是 Git 仓库也按普通目录处理（显式退出 Git 能力）。
  3. `auto` 回退为目录时，结果附 `warnings: ['未识别为 Git 仓库（<原因>），已按普通目录登记；如需增量请执行 --type git']`；CLI 打印到 stderr，页面列表显示「目录」徽标。
  3. `checkSourceDir`（现有校验，保持不可读 fail-loud）。
  4. 与旧记录比较；若 `dir / group / type / repoRoot / relativeRoot` 任一变化，**清空 `lastSync.git` 水位**并把 `pendingDelete` 重置为 stale（沿用现有 `changed` 分支）。
  5. 写 v2 记录。
- 返回值新增 `type`、`git` 摘要、`warnings?: string[]`（自动探测回退、git 不可用等）；`next` 保持不变（`ki datasource sync --scope …`）。

### 3.4 `removeDataSource` 变更

- 签名改为 `async`，内部持 `withScopeWriteLock(scope, 'datasource-remove', fn)`。
- 仍只删除 `datasource.json`；返回新增 `managedCloneDir: string | null`（S-05 提示 `--purge` 用）。

### 3.5 `syncDataSource` 写锁

- 非 `dryRun` 时整体包 `withScopeWriteLock(scope, 'datasource-sync', fn)`。
- `handleDirectImport` 内部也会申请同一 scope 锁；`AsyncLocalStorage` 已持有 → 直接执行，不会死锁（`scope-write-lock.ts:19-20`）。
- `dryRun` 只读，不拿锁。

### 3.6 `normalizeRecord` 迁移

- 接受 `version: 1 | 2`：
  - v1 / 缺 `type` → `type='directory'`，`git=undefined`。
  - v2 + `type='git'`：
    - `git` 必须是对象；`repoRoot` 绝对路径、`relativeRoot` 合法（无 `..` / 反斜杠 / 前导 `/`）、`branch` 字符串或 `null`、`remoteUrl` 字符串或 `null`、`managed` 布尔、`remoteBranch` 字符串或 `null`。
    - 不合法 → `INVALID`（fail-loud，不把 git 源静默降级成目录）。
  - v2 + `type='directory'` → 忽略 `git`。
- `lastSync` 归一：
  - `lastSync.result.files.fullScanned ?? scanned`、`changed ?? scanned`。
  - `lastSync.params.mode ?? 'full'`（旧快照没有模式概念）。
  - `lastSync.git`：若存在则逐字段校验；`commit` 可为 `null`。
  - `lastSync.warnings`：过滤非 `{code,message}` 项，最多 10 条。
- 读 v1 不写盘；下一次 `add / sync / remove` 时自然升级为 v2。

### 3.7 列表与 CLI

`scanDataSources` / `GET /api/datasource/list` 增加：

- `type`
- `git?: { repoRoot, relativeRoot, branch, shortCommit, commitTime, untrackedMarkdown }`（全部来自记录与 `lastSync.git`，不执行 git 命令）
- `syncAvailability`（S-03 计算）

CLI：

```bash
ki datasource add --scope <s> --source <dir> [--type directory|git] ...
ki datasource list [--json]
```

- `--type` 只对 `--source` 生效；与 S-05 的 `--git-url` 互斥。
- `list` 人类可读行增加 `type=git|directory` 与 `commit=<short>`；`--json` 增加相应字段。

---

## 4. 数据模型

```ts
export type DataSourceKind = 'directory' | 'git';
export type DataSourceSyncMode = 'incremental' | 'full';

export interface DataSourceGitInfo {
  /** 仓库根绝对路径（可能是 dir 的祖先） */
  repoRoot: string;
  /** dir 相对 repoRoot 的 posix 前缀；仓库根为 '' */
  relativeRoot: string;
  /** 当前分支；detached HEAD 为 null */
  branch: string | null;
  /** 远端 URL（已去凭据）；无 remote 为 null */
  remoteUrl: string | null;
  /** 是否工具托管的 clone（S-05） */
  managed: boolean;
  /** 托管 clone 配置的远端分支；非托管为 null */
  remoteBranch: string | null;
}

export interface DataSourceGitSyncState {
  /** 下次 diff 的水位：成功同步推进；partial/失败保持旧值 */
  commit: string | null;
  /** 本次自动更新完成后、扫描开始前的 HEAD */
  runCommit: string | null;
  shortCommit: string | null;
  subject: string | null;
  /** 提交时间（epoch ms） */
  authorTime: number | null;
  /** 本次进入 onlyRelPaths 的 tracked 变更数 */
  changedCount: number;
  /** 本次全量扫描到的可导入文件数 */
  fullScanned: number;
  /** 未跟踪且可导入的文件数（不参与增量） */
  untrackedMarkdown: number;
  /** 自动更新结果 */
  update: 'updated' | 'up-to-date' | 'skipped' | 'failed';
  updateDetail?: string;
  /** fetch 结果 */
  fetch: 'ok' | 'failed' | 'skipped';
  fetchDetail?: string;
}

export interface DataSourceWarning {
  code: string;
  message: string;
}

export interface DataSourceSyncParams {
  group: string | null;
  conflictMode: ImportConflictMode;
  vector: boolean;
  chunkSize: number | null;
  chunkOverlap: number | null;
  /** 新增；旧快照缺省按 full */
  mode?: DataSourceSyncMode;
}

export interface DataSourceResultSnapshot {
  files: {
    /** 导入管线本次处理基准（子集导入时 = 变更数） */
    scanned: number;
    /** 全量扫描数（新增） */
    fullScanned: number;
    /** 本次变更数（新增；全量同步 = fullScanned） */
    changed: number;
    completed: number;
    unchanged: number;
    skipped: number;
    incomplete: number;
    duplicatesSkipped: number;
  };
  vectorized: number;
  fullTextIndexed: number;
  groups: string[];
  conflicts: { path: string; relation: string; action: string; unchanged?: boolean }[];
  failures: { path: string; reason: string }[];
}

export interface DataSourceLastSync {
  at: number;
  durationMs: number;
  state: DataSourceSyncState;
  taskId?: string;
  params: DataSourceSyncParams;
  result: DataSourceResultSnapshot;
  seenRels: string[];
  pendingDelete: DataSourcePendingDelete;
  /** Git 数据源专有 */
  git?: DataSourceGitSyncState;
  /** 本次同步的可展示警告（fetch/update/untracked/fallback） */
  warnings?: DataSourceWarning[];
}

export interface DataSourceRecord {
  version: 2;
  scope: string;
  type: DataSourceKind;
  dir: string;
  /** type='git' 时必填 */
  git?: DataSourceGitInfo;
  group: string | null;
  conflictMode: ImportConflictMode;
  conflictSuffix: string;
  vector: boolean;
  chunkSize: number | null;
  chunkOverlap: number | null;
  createdAt: number;
  updatedAt: number;
  lastSync: DataSourceLastSync | null;
}
```

---

## 5. 迁移策略

| 场景 | 行为 |
|---|---|
| 读取 v1 记录 | 归一为 `type='directory'`、`git=undefined`；列表/详情正常展示「目录」 |
| 需要启用 Git 增量 | 重新执行 `ki datasource add --scope <s> --source <同一目录>`；自动探测为 git，写 v2，`lastSync.git` 为空 → 下次同步全量并记录水位 |
| 修改 `--source` / `--group` | 现有 `--force` 规则不变；同时清空 `lastSync.git` 水位（换目录后旧 commit 无意义） |
| 旧 daemon + 新记录 | 旧 daemon 写回会丢 `type/git`；**升级后必须重启 daemon**。运行时防护：在现有 daemon 握手中增加能力位 `datasource-git-v2`；新 CLI 对 `type=git` 的 add/sync 发现能力位缺失时 fail-loud `DAEMON_OUTDATED`，不把 v2 记录交给旧 daemon 写回。页面遇到旧 daemon 由前端降级（无 `syncAvailability` 时隐藏同步） |
| 前端旧 daemon | 列表/详情缺 `type/git/syncAvailability` 时按「目录 + 页面同步不可用」降级，不崩 |

---

## 6. 关键决策点

| 决策 | 采用 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 模型版本 | `version: 2` + 迁移 | 保持 v1、只加可选字段 | `type=git` 时 `git` 块是硬依赖，v1 无法表达「非法 git 记录」 | 若现有外部脚本强依赖 `version===1` |
| 类型识别 | 自动探测 + `--type` 覆盖 | 只允许显式 `--type` | 用户会忘记，默认行为不可用；自动探测失败可回退目录 | 探测误判率 > 1%（实测样本） |
| Git 元信息位置 | 放进 `datasource.json` | 独立 `datasource-git.json` | 多一个文件就多一套原子性/迁移/备份语义 | 需要记录大量 Git 历史时 |
| 写锁 | 复用 `withScopeWriteLock` | 新造 `datasource.lock` | 重复锁会与导入/删除路径交错，死锁风险 | 锁竞争导致页面同步不可用 |
| 换目录/类型 | 清空 commit 水位 | 保留旧水位 | 旧 commit 属于旧仓库，diff 结果无意义 | 无 |
| `add/remove` 异步化 | 是 | 保留同步 + 自旋文件锁 | 自旋锁无 stale 回收，易残留 | 调用方无法 await |

---

## 7. 影响范围

| 文件/模块 | 变更 |
|---|---|
| `src/lib/datasource-types.ts` | 新增 `type/git/gitSyncState/warnings/文件统计`；`version: 2` |
| `src/lib/datasource.ts` | `add/remove` 异步 + 写锁；v1→v2 归一；探测接入；`syncDataSource` 写锁 |
| `src/lib/datasource-git.ts` | 新增 `probeGit` / `sanitizeRemoteUrl` |
| `src/datasource.ts` | `add --type`；`list` 类型/commit 输出 |
| `web/src/api/httpApi.ts` | 类型字段（S-04） |
| `test/datasource*.test.ts` | 现有 `add/remove` 调用需 `await`；新增探测与迁移用例 |
| 现网数据 | 两条 v1 记录可读；重新 add 后升级；不自动改写 |

---

## 8. 待定问题

| 问题 | 当前处理 | 需要谁决定 |
|---|---|---|
| `--type directory` 是否允许覆盖一个 Git 目录 | 允许（显式退出增量能力） | 已定 |
| 旧 daemon 混用 | 文档要求升级后重启；不做自动检测 | 已定（接受） |
| 远端 URL 的显示脱敏 | 去 `user:pass@`；scp-like 保留 user@host | 已定 |

---

## 9. 不在范围内

- Git 同步算法、diff、commit 水位（S-02）。
- HTTP 接口、页面按钮与限频（S-03/S-04）。
- 远端仓库 clone、托管目录与 purge（S-05）。
- 定时/后台自动同步。
