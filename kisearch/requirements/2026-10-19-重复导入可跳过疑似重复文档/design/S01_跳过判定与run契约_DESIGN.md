# S-01 服务端跳过判定与 `run` 契约

> 父文档：`DESIGN.md`（术语与契约以父文档 §3 为准）
> 对应需求：R1 / R2 / R3 / R7、§3.5 第 1/2/5/7/8/10 条、N9 / N10 / N11、AC2 / AC4 / AC10 / AC11 / AC14

---

## 1. 术语

| 术语 | 本子需求内定义 |
|---|---|
| 跳过集（`dupMap`） | `Map<rel, DuplicateHit>`，`rel` 来自本次待处理文件，`DuplicateHit` = `{ existingGroup, existingRelation, existingSourcePath }` |
| 待处理集（`filesForImport`） | 原扫描集经「重试白名单 ∩」后再减去跳过集的结果 |
| 参数快照（`session.params`） | 写入 `.upload-session.json` 的最小参数集，当前只含 `skipDuplicates` |

---

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 预检判据：原文 sha256 × 全库 local KB；`sourcePath === rel` 不算重复；文件读失败按未命中 | `src/lib/import-preflight.ts:59-130` |
| 判据函数 `buildLibraryIndex` 依赖 `readAllGroupCaches` + `getLocalKbDir`，**不依赖 `import.ts` 的执行逻辑**（但 `preflightImportDuplicates` 依赖其 `collectMarkdownFiles`） | `import-preflight.ts:22-27` |
| 整批预算预检用**全量 `files`**，且发生在 `onlyRelPaths` 过滤之前 | `src/lib/import.ts:722-761`（预算）、`:813-851`（过滤） |
| 进度分母取 `effectiveFiles.length` | `src/lib/import.ts:849-855` |
| run 请求体现有 8 个参数，无跳过开关 | `src/lib/mcp-http-api.ts:1445-1462` |
| upload session 只存状态与 jobId，**不存任何 run 参数** | `src/lib/mcp-http-api.ts:116-124` |
| 同 `uploadId` 且非子集重试时，**无条件复用既有 `jobId`**（即使 job 已终态） | `src/lib/mcp-http-api.ts:1530-1537` |
| job 失败只回传 `error` 文本，无错误码字段 | `src/lib/mcp-http-api.ts:1916-1926` |

**结论**：判据已存在但被"预检"独占；预算与复用两处都缺"跳过意图"的处理位置。

---

## 3. 方案（TO-BE）

### 3.1 抽出判据模块（破循环依赖）

新增 `src/lib/duplicate-index.ts`（**不 import `import.ts`**）：

```ts
export interface DuplicateHit {
  existingGroup: string;
  existingRelation: string;
  existingSourcePath: string;
}

/** 原文哈希 → 命中文档（同哈希取第一条；无原文/空原文跳过） */
export function buildLibraryIndex(scope: string): Map<string, DuplicateHit>;

/** 在 relPaths 中找出「内容与库中一致且来源不同」的文件 */
export function collectDuplicateHits(args: {
  scope: string;
  sourceDir: string;
  relPaths: string[];
  /** 复用已建索引（预检与导入同进程连续调用时可省一次全库哈希） */
  index?: Map<string, DuplicateHit>;
  onProgress?: (done: number, total: number) => void;
}): Map<string, DuplicateHit>;
```

- `import-preflight.ts` 改为调用上述两函数，**对外签名与返回结构不变**（`preflightImportDuplicates` 仍返回 `ImportPreflightResult`，既有 108 行测试不破）。
- `import.ts` 只 import `duplicate-index.js`，不 import `import-preflight.js` ⇒ 无环。

### 3.2 剔除顺序（需求 B1 / N9）

```ts
// ① 仅在请求跳过时**额外**提前解析一次重试白名单（既有解析段保持原位不动 ⇒ 错误优先级与
//    非法清单行为完全不变，AC8 成立）；非法全空时沿用既有 fail-loud
const preOnlySet = args.skipDuplicates ? parseOnlyRelPaths(args.onlyRelPaths) : null;
/** 白名单后、剔除重复前 —— 这是 scanned 的基准（S-02 的 scannedBase） */
const baseAfterOnly = preOnlySet ? files.filter((rel) => preOnlySet.has(rel)) : files;

// ② 只有请求跳过时才计算跳过集（不传 ⇒ 完全不执行，AC8）
const dupMap = args.skipDuplicates
  ? collectDuplicateHits({ scope, sourceDir, relPaths: baseAfterOnly })
  : null;

// ③ 待处理集
const filesForImport = dupMap && dupMap.size > 0
  ? baseAfterOnly.filter((rel) => !dupMap.has(rel))
  : baseAfterOnly;

// ④ 预算：仅当跳过时改用剔除后列表；否则沿用既有 `files`
//    ★ 预算块内**两处**入参都必须换：`for (const rel of budgetFiles)` 与
//      `preflightImportBudget({ files: budgetFiles, ... })`（import.ts:733、:747-752）
const budgetFiles = args.skipDuplicates ? filesForImport : files;

// ⑤ 既有 onlyRelPaths 过滤段保持原位，输入换成 filesForImport
const effectiveFiles = onlySet ? filesForImport.filter((rel) => onlySet.has(rel)) : filesForImport;

// ⑥ 全部被剔除 → fail-loud
if (args.skipDuplicates && effectiveFiles.length === 0) {
  const err = new Error(
    `本批 ${baseAfterOnly.length} 篇全部为疑似重复文档，跳过重复将不导入任何文件；`
    + '如需新建副本请改用「仍然导入」；如为重试，请检查重试清单',
  ) as Error & { code?: string };
  err.code = 'ALL_FILES_DUPLICATES';
  throw err;
}
```

**校验顺序（必须固定，避免错误码互相遮蔽）**

| 顺序 | 校验 | 失败行为 |
|---|---|---|
| 1 | `onlyRelPaths` 非法（绝对路径 / `..` / 空 / 超长）且全部非法 | 既有 fail-loud（文案不变） |
| 2 | 重试清单内的文件在源目录全部不存在 | 既有 fail-loud `:843-848`（文案不变） |
| 3 | 剔除后 `effectiveFiles.length === 0` | `ALL_FILES_DUPLICATES`（新增） |

要点：
- 预算、进度分母、日志"扫描到 N 个文件"全部基于剔除后集合（跳过时的正确分母）；
- `retryFilter.missing` 仍用**全量** `files` 计算（既有语义：清单里源文件已删除的条目要单独记账）；
- 判定在 scope 写锁内、循环前**一次**完成（`handleDirectImport` → `withScopeWriteLock`），并 `logInfo` 记录耗时与命中数；
- `dupMap` 与 `baseAfterOnly` 一并交给 S-02 组装统计（本子需求不定义结果字段）。

### 3.3 `run` 契约与幂等复用（需求 B2 / N10）

请求体新增：

```ts
skipDuplicates?: boolean;   // 缺省 false；非 boolean（除 undefined）→ 400
```

`UploadSession` 新增可选字段（向后兼容旧 session）：

```ts
params?: { skipDuplicates?: boolean };   // 参数快照，仅用于复用一致性判定
```

复用分支改为**三态分流**（`src/lib/mcp-http-api.ts:1530-1537`）：

| 既有 job 状态 | 与本次 `skipDuplicates` | 行为 |
|---|---|---|
| 不存在于 `jobs` | — | 409「导入任务状态已失效，请重新上传」（既有） |
| 运行中（非 `done/failed/cancelled`） | **相同** | 202 复用既有 `jobId`（既有，幂等） |
| 运行中 | **不同** | **409 `IMPORT_JOB_PARAMS_MISMATCH`**：「该批次已在导入中（决策不同），请到任务中心查看或等待完成」 |
| 已终态 | 相同 | 202 复用（既有行为，前端会立即看到旧结果） |
| 已终态 | **不同** | **起新 job**（覆盖 `session.jobId` 与 `session.params`），走并发闸门 `rejectIfImportBusy` |

> 判运行中只认 `state === 'running'`（`Job.state` 枚举为 `running | done | failed | cancelled`，无 `pending`），其余一律视为终态；此判定同时用于服务端 job 与前端 `ImportJob`（`web/src/api/httpApi.ts:163-166`）。

### 3.4 错误码

| code | 触发 | 文案要点 |
|---|---|---|
| `ALL_FILES_DUPLICATES` | 剔除后 `effectiveFiles.length === 0`（含与重试白名单交集为空） | 说明"全部为疑似重复"，给两条出路：改用「仍然导入」/ 检查重试清单 |

`runImportJob` 的 catch 分支把 `(err as {code?}).code` 写入 `job.errorCode`（字段由 S-02 定义与展示）。

**任务台账口径（challenger 意见 4）**：该错码下 `taskReporter.finish` 仍记 `failed`（不新增任务状态值，守住既有契约），但 `error` 必须使用引导性文案「本批全部为疑似重复，未写入任何文件；如需建副本请改用「仍然导入」」，并在任务详情标注「未写入 / 可重试」。判定依据 = `errorCode`，不得靠文案匹配。

**性能与降级（challenger 意见 3）**：判定耗时 = 全库 local KB 读取 + 全量 sha256 + 本批文件二次读盘。

**实测（2026-10-19，`temp/probe-duplicate-hits-cost.ts`，500 篇 × ~2KB、热缓存、全部命中）**：

| 阶段 | 耗时 | 单篇 |
|---|---|---|
| `buildLibraryIndex`（全库 500 篇） | 9ms | 0.018ms |
| `collectDuplicateHits`（本批 500 篇读盘 + 比对） | 8ms | 0.016ms |
| 合计 | **17ms** | 0.034ms |
| 线性外推 1 万篇 | ≈ 340ms | — |
| 按真实文档体积 5–10 倍、冷缓存估算 | ≈ 1.5–3.4s | — |

结论：常规规模百毫秒级、万篇级秒级以内，**可接受**，源方案里"数十~数百 ms"的旧估算虽偏乐观但不影响结论。措施：
1. 判定期间前端 `progressText` 用「正在比对库内文档并跳过疑似重复…」（静态文案，后端无阶段进度）；
2. 日志记录实际耗时与命中数（`重复导入判定：N / M 篇…耗时 Xms`），便于线上复盘；
3. 降级预案**保留不启用**：若线上实测 >5s，再按"库内文档数超阈值简化比对"处理。

---

## 4. 接口设计

### `POST /api/import/run`

| 项 | 内容 |
|---|---|
| 方法/路径 | `POST /api/import/run` |
| 新增入参 | `skipDuplicates?: boolean`（缺省 `false`） |
| 既有入参 | `scope`、`uploadId`、`group?`、`chunkSize?`、`chunkOverlap?`、`vector?`、`tags?`、`conflictMode?`、`conflictSuffix?`、`onlyRelPaths?` |
| 成功 | `202 { ok: true, jobId, scope }` |
| 失败 | `400` 参数非法 / `409` 并发或参数不一致 / `410` 上传过期 |

Demo（跳过，202）：

```json
{ "ok": true, "jobId": "job_7f3c1a", "scope": "kisearch" }
```

Demo（运行中且参数不同，409）：

```json
{
  "ok": false,
  "code": "IMPORT_JOB_PARAMS_MISMATCH",
  "error": "该批次已在导入中（与本次跳过设置不同），请到任务中心查看或等待完成后再试"
}
```

Demo（全部重复，job 终态失败）：

```json
{
  "job": {
    "state": "failed",
    "errorCode": "ALL_FILES_DUPLICATES",
    "error": "本批 96 篇全部为疑似重复文档（或不在重试清单内），跳过重复将不导入任何文件；如需新建副本请改用「仍然导入」"
  }
}
```

### `HandleDirectImportArgs.skipDuplicates`

```ts
/**
 * 跳过「内容与库中一致但 sourcePath 不同」的文件（REQ-20261019-002）。
 * 缺省 false：不计算跳过集、预算与进度完全沿用既有口径（行为等价）。
 * true：先在本批内算出跳过集，再从待处理集剔除；预算与进度分母均基于剔除后集合。
 */
skipDuplicates?: boolean;
```

---

## 5. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D1 | 开关为布尔 `skipDuplicates`，服务端重算 | 前端回传 `skipRelPaths` 清单 | ① 预检明细上限 50，重复超过即漏跳（AC4）；② 前端 `name` ≠ 后端 `rel`（需复刻 `stripTopSegment`）；③ 与 `onlyRelPaths` 白名单语义混淆 | 若将来要做逐篇勾选（需求 R7），改为服务端返回可寻址的 `rel` 清单 + 数量上限提高 |
| D2 | 剔除点在**预算预检之前** | 在文件循环内逐文件判断 | 预算按全量判会误报超限（B1）；进度分母含跳过项则永远到不了 100% | 无 |
| D3 | 判据抽 `duplicate-index.ts` | ① `import.ts` 直接 import `import-preflight.ts`；② 复制一份判据到 `import.ts` | ① 成环（`import-preflight` → `import`）；② 两份真相必然漂移 | 若预检被淘汰（例如改成导入时判定），可回收该模块 |
| D4 | 复用按「终态 + 参数一致性」分流，**适用范围 = 「被拦截后改选」**（跳过成功后前端会正常清理 plan、面板消失，不存在第二次请求） | ① 一律 409；② 一律新建 job | ① 用户换决策必须重新上传整批（AC3-a 不可达）；② 重复点击会双跑（成本翻倍且写入竞争） | 若出现 `uploadId` 复用导致的数据事故，收紧为"一律 409"；若将来支持"同 uploadId 补导"，需同时放宽前端 plan 生命周期 |
| D5 | 全部重复在 job 内 fail-loud | 在 run 接口前置一遍预检以同步 400 | 判定成本翻倍（全库 sha256 × 2） | 若前端对"立即失败"体验强烈不满，可加一次轻量缓存复用 |

---

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 单个 Group 的 local KB 缺失/解析失败 | 跳过该 Group（既有 catch），其余照常 | 否（日志） |
| 待判定文件读取失败 | 视为"未命中"（不算重复），由循环阶段既有逻辑报错 | 否 |
| 库中 relation 无 `sourcePath` | 视为来源不同 ⇒ 命中（既有语义） | 是（出现在明细，`existingSourcePath` 为空） |
| 判定期间同 scope 并发导入 | 判定在 `withScopeWriteLock` 内，天然串行 | 否 |
| 剔除后为空 | `ALL_FILES_DUPLICATES`，job `failed` | 是（S-03 渲染为可纠正提示） |
| `skipDuplicates` 非布尔 | 400 参数非法 | 是 |
| session 无 `params` 的旧数据 | `skipDuplicates` 视为 `false`（不误判不一致） | 否 |
| 参数不一致且 job 运行中 | 409 `IMPORT_JOB_PARAMS_MISMATCH` | 是 |
| 参数不一致且 job 已终态 | 新建 job，覆盖 session 快照 | 否 |

---

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/duplicate-index.ts` | **新增**：`buildLibraryIndex` / `collectDuplicateHits` |
| `src/lib/import-preflight.ts` | 改为复用新模块；对外返回结构不变 |
| `src/lib/import.ts` | 新增 `skipDuplicates` 参数；重试白名单解析前移；剔除 → 预算 → 进度顺序改造；`ALL_FILES_DUPLICATES` |
| `src/lib/mcp-http-api.ts` | 请求体新增参数与校验；`UploadSession.params`；复用分支三态分流；`job.errorCode` |
| `docs/import.md`、`docs/mcp-http.md` | 接口与参数说明、错误码 |
| `test/import-preflight.test.ts` | 回归（判据迁移后行为不变） |
| `test/import-skip-duplicates.test.ts`（新增） | 剔除/预算/全部重复/白名单交集/附件不复制 |
| `test/mcp-http-api*.test.ts` | run 参数校验、409 参数不一致、终态可新建 job |

---

## 8. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| 1 | `job.state` 的初始值是否可能为 `pending`？（影响"终态判定"的排除法） | 实施时以 `jobs.get(id)?.state` 实测确认；排除法已兼容 `pending` |
| 2 | 判定耗时在超大库（>5 万篇）是否需要进度提示 | 本期只打日志；若实测 >2s 再评估 |
| 3 | `docs/mcp-http.md` 的错误码表是否需要统一登记 | 由实施者按既有文档结构追加 |
