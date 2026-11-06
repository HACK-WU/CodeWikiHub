# S-03 写路径门禁（VIEW_NOT_WRITABLE）

- 父文档：`DESIGN.md` §3
- 前置依赖：S-01
- 证据：🟢 代码直读（`src/lib/scope-policy.ts`、`src/lib/scope-write-lock.ts`）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 写路径 | 一切会让 `dataDir/<scope>/` 或 `collections/<scope>` 发生变化的操作 |
| 门禁 | 在动作执行前判定并抛错的函数 |

---

## 2. 现状（AS-IS）

写路径已有**两段式**门禁（`src/lib/scope-policy.ts:1-19` 的设计说明）：

```
① HTTP 入口层   assertHttpChannelWritable()   scope-policy.ts:140
   —— 只挡 Web 用户通道（/api/import/*、POST /api/doc/edit）

② 锁内 op 级    assertOperationWritable()     scope-policy.ts:127
   挂点：scope-write-lock.ts:25-26（loadConfig 一次，取锁之前）
   覆盖：CLI / MCP / daemon 的全部写路径
```

登记表（单测断言两者并集覆盖全部 op 字面量）：
- `EXEMPT_OPS`（`:34-51`）—— 只读库下仍放行：`import` / `datasource-*` / `scope-delete` / `restore-snapshot` / `rebuild-vector` / `migrate-relation-cache`
- `BLOCKED_OPS`（`:59-71`）—— 只读库下拦截：`store` / `bulk-store` / `sync-relation` / `bulk-sync-relation` / `edit-relation` / `delete-relation` / `batch-delete` / `group-create` / `group-delete` / `doc-delete` / `doc-edit-write`

**缺口**：视图名不是非法字符（`^[a-zA-Z0-9_-]+$` 通过），会一路带到 `getScopeDataDir()`，**凭空建出 `dataDir/<视图名>/`** 并写入。这是本需求最危险的静默失败。

---

## 3. 方案（TO-BE）

### 3.1 新增门禁函数

```ts
// src/lib/scope-policy.ts

/** 视图不是知识库：写路径一律拒绝 */
export class ScopeViewWriteError extends Error {
  readonly code = 'VIEW_NOT_WRITABLE';
  readonly view: string;
  readonly members: string[];
  readonly action: string;
  constructor(view: string, members: string[], action: string);
}

export function isScopeViewWriteError(err: unknown): err is ScopeViewWriteError;

/**
 * @param config 可选，传入可复用 loadConfig()（每次含一次 statSync）
 */
export function assertNotScopeView(scope: string, operation: string, config?: KiConfig): void;
```

**关键实现约束**

1. `scope` 不是视图名 → **直接 return，零开销**（`cloneLockScope(repoRoot)` 这类合成锁键天然不命中）。
2. 判定必须与 `isViewName()` 同源（S-01），不允许各写一份。
3. **不参与 `EXEMPT_OPS` / `BLOCKED_OPS` 体系**：与只读是两个正交维度——只读库的 `import` 放行，但视图的 `import` 一律拒绝。

### 3.2 挂点（8 处，全部单行）

| # | 位置 | operation | 覆盖范围 |
|---|---|---|---|
| 1 | `src/lib/scope-write-lock.ts:26` **紧随 `assertOperationWritable`** | 透传 | `import` / `store` / `bulk-store` / `sync-relation` / `edit-relation` / `delete-relation` / `group-*` / `doc-*` / `datasource-*` / `restore-snapshot` / `rebuild-vector` 等**全部经写锁的 op** |
| 2 | `src/export.ts` 入口 | `export` | 导出 |
| 3 | `src/backup.ts` 入口 | `backup` | 备份 |
| 4 | `src/restore.ts` 入口 | `restore` | 还原 |
| 5 | `src/wiki-backfill.ts` 入口 | `wiki-backfill` | Wiki 回填 |
| 6 | ~~`src/scope.ts` 的 delete / clear / readonly~~ | — | **v2 移除**：`scope-delete` / `scope-clear` 在 `EXEMPT_OPS` 里但仍经 `withScopeWriteLock`（`scope-write-lock.ts:26`）→ 已由 #1 覆盖。<br>唯一例外 `scope-readonly` **刻意不走写锁**（`scope-policy.ts:17-19`：否则只读库永远解不开）→ 其视图名拒绝改由 **S-04** 在配置写回路径处理。<br>★ 移除原因：`src/scope.ts` 是 S-04 的独占写文件，同批两砖头碰同一文件会冲突（父文档 I8） |
| 7 | `src/index-optimize.ts` 入口 | `index-optimize` | 索引优化 |
| 8 | `src/migrate-relation-cache.ts` 入口 | `migrate-relation-cache` | 缓存迁移 |

> **为什么 #1 就能覆盖绝大多数**：`withScopeWriteLock` 是 CLI / MCP / daemon 三条写路径的共同入口（`scope-policy.ts:8-15` 的设计说明），一次挂载即全覆盖，不逐个命令改。

### 3.3 错误文案（自解释 + 给出路）

`store` / `sync-relation` / `group-create` 等**可落到单一成员**的场景：

```
视图 team 是只读聚合，不能作为写入目标（operation=store）。
它的成员：kisearch、kisearch-memory
请改用其中一个成员，例如：
  ki store --scope kisearch
```

`export` / `backup` / `wiki-backfill` 等**产物 per-scope、需要重复执行**的场景：

```
视图 team 暂不支持导出（导出产物是每个知识库一套目录）。
请逐库执行：
  ki export kisearch
  ki export kisearch-memory
```

`scope delete/clear/readonly`：

```
视图 team 不是知识库，无法执行 scope 操作。
解散视图请用：ki view delete team
（成员库的数据不受影响）
```

### 3.4 出口映射

| 通道 | 表现 |
|---|---|
| CLI | stderr 打印文案，`process.exit(1)` |
| MCP 工具 | `{ isError: true, content:[{type:'text', text: 文案}] }`（现有 catch 透传即可） |
| HTTP `/api/*` | `409 { ok:false, code:'VIEW_NOT_WRITABLE', view, members, error, hint }` |
| daemon RPC | `Error.code = 'VIEW_NOT_WRITABLE'` 原样回传 |

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | 挂 `withScopeWriteLock` 而非逐个命令 | 8 个写命令各加一行 | 命令会新增/改名，逐个挂必然漏（`BLOCKED_OPS` 的单测正是为治这类漂移而存在） | 出现不经写锁的写路径 |
| **D2** | 与只读正交，不并入 `EXEMPT_OPS`/`BLOCKED_OPS` | 在两张表里各加一条 | 语义不同：只读是"这个库不让改"，视图是"这根本不是库"。混进去会让"视图的 import 是否放行"变成需要查表判断的问题 | 无 |
| **D3** | 拒绝而非"落到第一个成员" | 静默落到 `members[0]` | 写错库需要人工清理且不可撤销；用户明确否决过（需求 D7） | 引入 `writeTarget`（P2，需另行拍板） |
| **D4** | 读类命令（export/backup/wiki-backfill）也拒绝 | 本期一并支持视图 | 产物是 per-scope 磁盘目录，合并契约未定；硬做会产出一个"看不出属于哪个库"的混合目录 | 用户提出明确的合并产物需求 |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 视图名进入任一写 op | 抛 `ScopeViewWriteError`，文案见 §3.3 | 是 |
| 视图名进入 export/backup | 同上，列出逐库命令（按成员数与 8 个上限截断，超出提示 `ki view show`） | 是 |
| 视图被删后旧命令仍在跑 | 不是视图名 → 门禁放行 → 走原路径（可能报 scope 不存在，属既有行为） | 是 |
| 合成锁键（`cloneLockScope`） | `isViewName()` 不命中 → 零开销 return | 否（无行为变化） |
| 配置文件读失败 | `isViewName` 内部吞错并按"非视图"处理 → **fail-open**。⚠️ 见下方风险 | 否 |

> **fail-open 风险说明**：`isViewName` 读配置失败时只能按"非视图"处理（否则任何配置抖动都会让**所有写操作**失败）。此时视图名可能漏进路径派生，凭空建出 `dataDir/<视图名>/`。**接受该残余风险**，理由有两条：① `loadConfig` 自带 last-known-good 兜底（沿用的仍是上次成功解析的 `views`），真正走到 catch 只可能是"进程启动即无配置"；② 即使漏过，下游 `ensureScopeDir` 会因缺 `group-index.json` 而 fail-loud，不会静默产出可用数据。该判断记录在 `scope-policy.ts` 注释中。

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/scope-policy.ts` | 新增 error class + `assertNotScopeView`（约 60 行） |
| `src/lib/scope-write-lock.ts` | `:26` 后加一行 |
| `src/export.ts` · `src/backup.ts` · `src/restore.ts` · `src/wiki-backfill.ts` · `src/index-optimize.ts` · `src/migrate-relation-cache.ts` | 各入口加一行（**不含 `src/scope.ts`** —— 该文件归 S-04 独占写） |
| `test/scope-policy.test.ts` | 断言 `assertNotScopeView` 覆盖全部写 op 字面量（与既有并集断言同款） |
| `docs/error-handling.md` | 新增 `VIEW_NOT_WRITABLE` 条目 |

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| C1 | 写拒绝 | `ki store --scope team "x"` → 退出码 1，stderr 含 `VIEW_NOT_WRITABLE` 与成员清单 |
| C2 | 不落盘 | C1 之后 `dataDir/team/` **不存在**。⚠️ 该验收依赖一个实施前提：`ki store` 的 `ensureScopeDir()` 必须在 `withScopeWriteLock()` **之内**被调用（即门禁先于建目录）。实施第一步须核实调用顺序，若顺序相反，需把 `assertNotScopeView` 上提到命令入口 |
| C3 | MCP 拒绝 | `ki_store({scope:'team'})` → `isError:true`，文案含成员 |
| C4 | HTTP 拒绝 | `POST /api/doc/edit` body `scope=team` → 409 `VIEW_NOT_WRITABLE` |
| C5 | 逐库命令可执行 | C1 文案里给出的 `ki store --scope kisearch` 直接复制执行可成功 |
| C6 | 导出拒绝 | `ki export team` → 列出每个成员的 `ki export <scope>` |
| C7 | scope 操作拒绝 | `ki scope delete team` → 「解散视图请用 `ki view delete team`」 |
| C8 | 单库零回归 | 全部既有 scope-policy 用例保持绿 |
| C9 | op 覆盖断言 | 单测遍历 `withScopeWriteLock` 全部 op 字面量，`assertNotScopeView` 均被调用 |
