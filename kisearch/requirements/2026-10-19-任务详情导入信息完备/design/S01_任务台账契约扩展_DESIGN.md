---
id: REQ-20261019-004
document_type: design
sub_requirement: S-01
version: 1
updated: 2026-10-19
---

# S-01 任务台账契约扩展

## 1. 术语

| 术语 | 定义 |
|---|---|
| 参数快照 `TaskParamSnapshot` | 任务创建时确定的执行参数，之后不再变化 |
| 结果摘要 `TaskResultSnapshot` | 任务结束时写入的文件级结果与原因拆分 |
| 明细上限 `MAX_TASK_DETAIL_ITEMS` | 单类明细最多保存条数（20） |
| 字节预算 | 落盘前 `JSON.stringify` 的字节数必须 < `MAX_TASK_FILE_BYTES`（32KB） |

## 2. 现状（AS-IS）

`src/lib/task-registry.ts:34-52`：

```ts
export interface TaskRecord {
  id: string; source: TaskSource; operation: string; scope: string;
  state: TaskState; phase?: string;
  progress?: TaskProgress;          // 只有阶段进度，无结果
  error?: string;                   // 经 safeErrorSummary 压缩，丢失错误码
  recoveryHint?: string;
  partialCommitted?: number;
  createdAt: number; updatedAt: number; heartbeatAt: number;
  startedAt?: number; finishedAt?: number;
  indexReadiness?: TaskIndexReadiness;
}
```

问题（🟢 代码实证）：
1. 无参数快照 ⇒ group/tags/vector/conflictMode 无处可读；
2. `error` 经 `safeErrorSummary`（`task-registry.ts:101-120`）压缩，未命中白名单一律降级为「请查看发起端的命令输出或服务日志」；
3. 无血缘，重试任务与原始任务无法区分；
4. `readRecordFile` 对 `size > MAX_TASK_FILE_BYTES` 直接 `return null` ⇒ 超限任务**静默消失**。

## 3. 方案（TO-BE）

### 3.1 类型扩展（`src/lib/task-registry.ts`）

```ts
/** 参数快照：任务创建时确定，此后不变（不存绝对路径） */
export interface TaskParamSnapshot {
  /** 来源形态：浏览器上传（受控暂存目录，会被 TTL 清理）/ 外部目录 */
  sourceKind?: 'upload' | 'external';
  /** 用户显式指定的落点 Group；未指定时省略 */
  group?: string;
  /** 文档级自定义标签 */
  tags?: string[];
  /** 是否写 dense 向量层（false = 仅全文索引） */
  vector?: boolean;
  /** 同名文档处理策略：incremental / suffix / overwrite / skip */
  conflictMode?: string;
  /** suffix 策略的后缀模板（仅 conflictMode='suffix' 时有意义） */
  conflictSuffix?: string;
  /** 是否启用「跳过疑似重复」 */
  skipDuplicates?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
}

/** 结果摘要：任务结束时写入一次 */
export interface TaskResultSnapshot {
  files?: {
    /** 白名单后、剔除疑似重复前的文件数 */
    scanned: number;
    /** 文件级完成（含 unchanged） */
    completed: number;
    /** 未提交元数据的文件数 */
    incomplete: number;
    /** 未进入最终处理的文件数 */
    skipped: number;
    /** 其中内容未变、未重算的文件数（completed 的子集） */
    unchanged: number;
    /** 其中疑似重复被跳过的文件数（skipped 的子集） */
    duplicatesSkipped: number;
    /** skipped 的三类拆分：三项之和 == skipped */
    skippedReasons?: { conflict: number; duplicate: number; other: number };
  };
  /** 写入 dense 层的条目数（chunk 合并后） */
  vectorized?: number;
  /** 全文索引条目数 */
  fullTextIndexed?: number;
  /** 复制的本地图片附件数 */
  assets?: number;
  /**
   * 实际写入的 Group 列表（源目录子结构会派生多个；最多 MAX_TASK_DETAIL_ITEMS 个）。
   * ★ 与 `params.group` 不同：`params.group` 是用户显式指定，本字段是执行后真实落点。
   */
  groups?: string[];
  /** 疑似重复明细（≤ MAX_TASK_DETAIL_ITEMS） */
  duplicates?: { path: string; existingGroup: string; existingRelation: string }[];
  /** 同名冲突明细（≤ MAX_TASK_DETAIL_ITEMS） */
  conflicts?: { path: string; relation: string; action: 'overwrite' | 'skip' | 'suffix'; skipReason?: string }[];
  /** 明细是否被截断（完整数见计数） */
  truncated?: boolean;
  /** 可判别错误码（如 ALL_FILES_DUPLICATES / VECTORIZATION_STOPPED） */
  errorCode?: string;
}
```

`TaskRecord` 新增三个**可选**字段：

```ts
export interface TaskRecord {
  // ...既有字段不变...
  /** 参数快照（创建时写入；旧记录无此字段） */
  params?: TaskParamSnapshot;
  /** 结果摘要（结束时写入；运行中为 undefined） */
  result?: TaskResultSnapshot;
  /** 重试血缘：本任务重试自哪个任务 */
  retryOf?: string;
}
```

`TaskReporter` 签名扩展：

```ts
export function createTaskReporter(
  config: Pick<KiConfig, 'dataDir'>,
  input: {
    id?: string; source: TaskSource; operation: string; scope: string;
    /** 新增：参数快照（内部过卫生化） */
    params?: TaskParamSnapshot;
    /** 新增：重试血缘 */
    retryOf?: string;
  },
): TaskReporter;

export interface TaskReporter {
  update(patch: TaskPatch): boolean;
  progress(progress: TaskProgress): boolean;
  finish(state: Exclude<TaskState, 'queued' | 'running' | 'unknown'>, options?: {
    error?: string; recoveryHint?: string; partialCommitted?: number;
    /** 新增：可判别错误码 */
    errorCode?: string;
    /** 新增：结果摘要 */
    result?: TaskResultSnapshot;
  }): void;
  stop(): void;
}
```

**契约变更声明（评审 #4 / #5 修正）**

| 变更 | 原状 | 变更后 | 理由 |
|---|---|---|---|
| `update` 返回类型 | `interface` 声明 `void`（实现早已 `return true/false`，`task-registry.ts` 内部） | 声明为 `boolean` | 类型与实现对齐；`finish` 的重试逻辑依赖返回值，声明成 void 会迫使调用方 `as any` |
| `update` patch 白名单 | 7 个字段 | 新增 `params`、`result` | `result` 进白名单是**内部实现需要**（`finish` 复用 `update(terminalPatch)`），但**对外语义仍是「result 只由 finish 写入」**；三端不得直接 `update({result})` |

### 3.2 卫生化（复用既有 `sanitizedText` 口径）

新增 `sanitizeSnapshot`，在 `update`/`finish` 落盘前统一处理：

| 字段 | 规则 |
|---|---|
| `group` / `groups` | 复用 `sanitizeRelPath` 同源判据：拒绝绝对路径、`..`、空值、超长（≥200 字符截断）；非法的**丢弃该条**而非整批失败 |
| `tags` | 逐条 `sanitizedText(80)`，最多 20 个 |
| `duplicates[].path` / `conflicts[].path` | 相对路径净化，非法条目丢弃 |
| `existingRelation` / `relation` | `sanitizedText(200)` |
| `errorCode` | 白名单正则 `/^[A-Z][A-Z0-9_]{1,63}$/`，不匹配则丢弃 |

> **决策 D1-1：为何不存 `sourceDir`**
> 否决方案：存绝对路径便于排障。否决理由：任务台账是共享文件，`sanitizedText` 已把路径替换为 `[path]`（`task-registry.ts:95`），存了也读不出；且路径可能含用户隐私目录名。改存 `sourceKind` 枚举（`upload` / `external`），足以回答「能否事后重试」。

### 3.3 32KB 护栏（关键）

```ts
export const MAX_TASK_DETAIL_ITEMS = 20;

/** 落盘前按预算裁剪明细：优先保计数，其次保前 N 条明细 */
function fitToBudget(record: TaskRecord): TaskRecord {
  const limit = MAX_TASK_FILE_BYTES - 512; // 预留字段增长余量
  const serialize = (value: TaskRecord): string => JSON.stringify(value);
  if (serialize(record) <= limit) return record;
  const result = record.result;
  if (!result) return record;
  // 逐级降级：先砍 conflicts → 再砍 duplicates → 最后只留计数
  const withoutConflicts: TaskResultSnapshot = { ...result, truncated: true };
  delete withoutConflicts.conflicts;
  const candidate: TaskRecord = { ...record, result: withoutConflicts };
  if (serialize(candidate) <= limit) return candidate;
  const withoutDetails: TaskResultSnapshot = { ...withoutConflicts, truncated: true };
  delete withoutDetails.duplicates;
  return { ...record, result: withoutDetails };
}
```

> **`truncated` 语义（评审 #7 修正）**：表示「明细不完整」，**不区分**成因——可能是「条数超 20」也可能是「字节预算裁剪」。UI 文案必须是中性表述（「明细未完整显示」），不得写成「超过 20 条」，否则预算裁剪会被误读。

调用点：`writeRecord` 内、`JSON.stringify` 之前（唯一入口，避免第三处漏改）。

**不变量（单测锁死）**：
- `MAX_TASK_DETAIL_ITEMS(20)` × 两条明细 × 每条约 120B ≈ 4.8KB，远小于 32KB；
- 任何情况下 `fitToBudget` 后的记录必须能通过 `readRecordFile` 的 size 校验。

> **决策 D1-2：为何是「上限 + 裁剪」而非「明细外置文件」**
> 否决方案：明细写 `.ki-tasks/{id}.details.json` 旁挂文件。否决理由：① 任务有 1h TTL 清理逻辑（`listTaskRecords` 只删 `{id}.json`），旁挂文件会成为孤儿；② 原子写要同时保证两份一致，复杂度高于收益；③ 20 条已能覆盖「看一眼是哪些」的场景，完整清单本就在导入页结果摘要与未完成清单里。

### 3.4 旧记录兼容

- `readRecordFile` 的白名单校验**不改**（只校验既有必填字段），新增字段天然向后兼容；
- 旧记录 `params` / `result` / `retryOf` 均为 `undefined` ⇒ 前端显示「—」（S-03）；
- **不做数据迁移**（任务 1h TTL，迁移无收益）。

> **决策 D1-3：`params` 用内联对象还是复用 `ImportRetryParams`**
> 决定：**内联定义 + 字段对齐**。否决方案：直接 `import type { ImportRetryParams }`。否决理由：`task-registry.ts` 是零业务依赖的落盘层（文件头注释明确），引用 `import-retry.ts` 会把 scope/fs 依赖带进来；字段名与语义保持一一对应即可，S-02 用映射函数收敛。

## 4. 数据模型

```
.ki-tasks/{taskId}.json
├── id / source / operation / scope / state / phase      # 既有
├── progress{phase,done,total,persisted,failed,...}       # 既有（运行中存在）
├── params{sourceKind,group,groups[],tags[],vector,
│          conflictMode,conflictSuffix,skipDuplicates,
│          chunkSize,chunkOverlap}                       # 新增，可选
├── result{files{scanned,completed,incomplete,skipped,
│                unchanged,duplicatesSkipped,
│                skippedReasons{conflict,duplicate,other}},
│          vectorized,fullTextIndexed,assets,
│          duplicates[],conflicts[],truncated,errorCode} # 新增，可选
├── retryOf                                              # 新增，可选
└── createdAt/updatedAt/heartbeatAt/startedAt/finishedAt/indexReadiness  # 既有
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 快照字段非法（绝对路径 / `..`） | 丢弃该条，其余照写 | 否（静默降级为缺失，UI 显示「—」） |
| 记录超 32KB 预算 | `fitToBudget` 裁剪明细并置 `truncated: true` | 是（UI 显示「明细已截断」） |
| `errorCode` 不匹配白名单 | 丢弃 | 否 |
| **`writeRecord` IO 失败（对应需求 N3）** | 沿用 `reportWriteFailure`（stderr，30s 节流）+ 终态重试 3 次；**内存 `record` 不前进 ⇒ 落盘 heartbeat 停滞** ⇒ 读侧 30s 后由 `listTaskRecords`/`getTaskRecord` 判为 `unknown` | **是（间接）**：详情以 `unknown` + 「心跳丢失，数据可能不完整」呈现，不静默 |

> **为什么不能直接"在记录里写一个 writeIssue 标记"**：写失败意味着记录写不进去，任何新字段同样写不进去 ⇒ 只能依赖**读侧的陈旧判定**表达"这份数据可能不可信"。这与既有 `unknown` 语义同源（心跳 > 30s 未更新），不新增状态值。

## 6. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/task-registry.ts` | 新增 2 个 interface + 3 个可选字段 + `fitToBudget` + `sanitizeSnapshot` |
| `test/task-registry.test.ts` | 新增 4 例：超预算裁剪 / 非法路径丢弃 / 旧记录可读 / `errorCode` 白名单 |

## 7. 待定问题

| # | 问题 | 状态 |
|---|---|---|
| 1 | 明细上限 20 条是否够（大库排查场景） | 需拍板 |
