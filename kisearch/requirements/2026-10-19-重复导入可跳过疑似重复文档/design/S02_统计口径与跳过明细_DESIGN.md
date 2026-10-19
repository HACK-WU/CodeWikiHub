# S-02 跳过可观测：统计口径与明细

> 父文档：`DESIGN.md`（契约以 §3 为准）
> 对应需求：R4、§3.4 全表、W2、AC1 / AC7 / AC9 / AC12 / AC16

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| `scanned` | 本轮**扫描到**的文件数（**剔除前**，含将被跳过的重复项）；恒等式右端 |
| `skipped` | 未进入最终处理的文件数（过大 / chunk 超限 / hook 失败 / 冲突跳过 / **跳过重复**） |
| `duplicatesSkipped`（计数） | `skipped` 的子集：因疑似重复被跳过的文件数 |
| `duplicatesSkipped`（明细） | 逐条跳过记录，用于结果区展开 |

---

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 文件级恒等式 `completed + incomplete + skipped = scanned`，`unchanged` 是 `completed` 的子集（先例：子集字段不占独立项） | `src/lib/import.ts:128-145` |
| `stats.skipped` 合并口径：过大/超限/hook 失败 + 冲突 skip + 失败记录 | `src/lib/import.ts:1851-1852` |
| 早退分支（无文件可导入）单独组装一份 `stats.files` | `src/lib/import.ts:1094-1134` |
| `scanned` 目前取 `effectiveFiles.length`（与进度分母同源） | `src/lib/import.ts:1081`、`:1855` 附近 |
| job 只有 `error` 文本，无错误码 | `src/lib/mcp-http-api.ts:1916-1926` |
| 前端结果区读 `result.stats` 与 `partialFiles` | `web/src/pages/ImportPage.tsx:2043-2050` |

**问题**：剔除若发生在 `effectiveFiles` 之前且不改口径，`scanned` 会悄悄变小 —— 用户"选了 96 篇"却看到"扫描 73"，无法解释差异。

---

## 3. 方案（TO-BE）

### 3.1 计数字段

`ImportStats.files` 新增（S-01 剔除后可用 `dupMap.size`）：

```ts
export interface ImportStats {
  // ...既有字段
  files: {
    total: number;
    completed: number;
    incomplete: number;
    /** 本次扫描到的文件数（剔除前）：completed + incomplete + skipped = scanned */
    scanned: number;
    /** 未进入最终处理的文件数（含因疑似重复被跳过的文件） */
    skipped: number;
    /** 增量导入下「内容未变、跳过重算」的文件数（completed 的子集） */
    unchanged: number;
    /**
     * R-新（REQ-20261019-002）：因「疑似重复」被跳过的文件数，是 skipped 的子集。
     * 恒等式不变：completed + incomplete + skipped(含本项) = scanned
     */
    duplicatesSkipped: number;
  };
}
```

### 3.2 明细字段

`ImportResult` 新增：

```ts
export interface ImportDuplicateSkipItem {
  /** 本次待导入文件的相对路径（与 rel 同口径） */
  path: string;
  existingGroup: string;
  existingRelation: string;
}

export const MAX_DUPLICATE_DETAIL = 500;

export interface ImportResult {
  // ...既有字段
  /** 本次因疑似重复被跳过的文件明细（按 path 升序；最多 MAX_DUPLICATE_DETAIL 条） */
  duplicatesSkipped: ImportDuplicateSkipItem[];
  /** 明细被截断（实际条数见 stats.files.duplicatesSkipped） */
  duplicatesSkippedTruncated: boolean;
}
```

### 3.3 组装口径（所有返回分支一致）

```ts
// ① 分母基准 = 白名单后、剔除重复前（与 S-01 的 baseAfterOnly 同源）
//    不传 skipDuplicates 时 dupSkipCount = 0 ⇒ 本式退化为 effectiveFiles.length（AC8 成立）
const scannedBase = baseAfterOnly.length;                  // S-01 §3.2 的 baseAfterOnly
const dupSkipCount = dupMap?.size ?? 0;
const dupSkipDetail = dupMap
  ? [...dupMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .slice(0, MAX_DUPLICATE_DETAIL)
      .map(([path, hit]) => ({ path, existingGroup: hit.existingGroup, existingRelation: hit.existingRelation }))
  : [];

// stats.files（★ 实现注意：现有代码用 effectiveFiles.length - fileRecords.length - unchangedFileCount
//   反算 skipped（import.ts:1865），改造后必须改为下面的显式公式，否则恒等式差 dupSkipCount）
files: {
  total: fileRecords.length,                               // 既有语义：真正参与导入并落库的文件数（不含跳过项）
  completed: fileRecords.length - failedRecords.size + unchangedFileCount,
  incomplete: failedRecords.size,
  scanned: scannedBase,                                    // 白名单后、剔除前（含 dupSkipCount）
  skipped: Math.max(0, scannedBase - fileRecords.length - unchangedFileCount),
  unchanged: unchangedFileCount,
  duplicatesSkipped: dupSkipCount,
},

// result
duplicatesSkipped: dupSkipDetail,
duplicatesSkippedTruncated: dupSkipCount > dupSkipDetail.length,
```

**恒等式证明**（也解释了为什么 `skipped` 里**不得**再额外加一次 `dupSkipCount`）：

| 量 | 含义 | 关系 |
|---|---|---|
| `S = scannedBase` | 白名单后、剔除前 | `S = E + D`（`E` = `effectiveFiles.length`，`D` = `dupSkipCount`） |
| `F = fileRecords.length` | 进入导入流程并生成记录的文件 | `E = F + U + O`（`U` = unchanged，`O` = 过大/超限/hook失败/冲突 skip） |
| `completed + incomplete` | `(F - failed + U) + failed` | `= F + U` |
| `skipped`（本式） | `S - F - U` | `= O + D` |
| 合计 | `F + U + O + D` | `= E + D = S = scanned` ✅ |

> 即：把 `skipped` 的基数从 `effectiveFiles.length` 换成 `scannedBase` 之后，跳过数**自动**被吸收；再手动 `+ dupSkipCount` 会重复计数（这是本次评审抓到的实现陷阱）。
- **早退分支**（`fileRecords.length === 0`，`import.ts:1094-1134`）同样带 `duplicatesSkipped`，`scanned` 用 `scannedBase`；
- 跳过项**不 push 进 `conflicts`**（那是同名冲突的容器），也**不进 `incomplete`**（W2 / AC12）；
- `partialFiles`（job 侧）直接复用 `stats.files`，无需另算；
- `Job.errorCode` 需要在 `GET /api/import/status` 的响应体里**显式透传**（该 handler 是手工挑字段，见 `mcp-http-api.ts:1982-1996`，不补则前端永远拿不到错码）。

### 3.4 job 错误码

`Job` 新增可选字段 `errorCode?: string`；`runImportJob` 的 catch 写入 `(err as { code?: string }).code`。用于 S-03 把 `ALL_FILES_DUPLICATES` 渲染成可纠正提示而非失败红态。

---

## 4. 数据模型

| 字段 | 类型 | 含义 | 缺省（不跳过时） |
|---|---|---|---|
| `stats.files.duplicatesSkipped` | `number` | 跳过重复的文件数（`skipped` 的子集） | `0` |
| `result.duplicatesSkipped` | `ImportDuplicateSkipItem[]` | 跳过明细，按 path 升序 | `[]` |
| `result.duplicatesSkippedTruncated` | `boolean` | 明细是否被截断（>500 条） | `false` |
| `Job.errorCode` | `string \| undefined` | 可判别错误码（如 `ALL_FILES_DUPLICATES`） | `undefined` |

> 不新增 `skipped` 的子项拆分（如 `oversized / hooksFailed`）：既有实现未拆，本期不扩大范围。

---

## 5. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D1 | `scanned` 保持**剔除前** | 改成剔除后数量 | 用户看到"扫描 73"但选了 96 篇会认为丢文件；且与"本批共 96 篇"面板文案自相矛盾 | 若产品改为"本批"只统计待导入项，需同时改面板文案 |
| D2 | 跳过重复**计入 `skipped`**，另加 `duplicatesSkipped` 子集 | ① 只加独立计数、不进 `skipped`；② 单独新增顶层 `stats.duplicatesSkipped` 并从恒等式扣除 | ① 恒等式破裂；② 与 `unchanged` 的既有先例不一致 | 若将来 `skipped` 需要按原因分组展示，可升级为 `skippedByReason` 字典 |
| D3 | 明细上限 500 | 无上限 / 上限 50（与预检一致） | 无上限会让 job.result JSON 膨胀（数万条可达 MB 级）；50 会让用户无法核对（面板已有 50 的限制） | 实测单批重复数常 >500 时上调；或改为分页接口 |
| D4 | 明细来源 = 服务端重算的 `dupMap` | 复用前端预检清单 | 前端清单截断、且有预检后库变化的时序差 | 无 |
| D5 | 跳过项不进 `conflicts` / `incomplete` | 复用 `conflicts` 的 `action:'skip'` + `skipReason:'duplicate'` | 会让「重试未完成」把重复文档捞回来（W2），且前端冲突摘要已按 `same-name/already-imported` 分支渲染 | 若要统一"跳过原因"统计，改为只读的统计字段而非复用清单 |

---

## 6. 异常处理

| 场景 | 行为 | 是否对外 |
|---|---|---|
| 明细超过 500 条 | 截断 + `truncated=true`；计数仍取完整 `dupMap.size` | 是（S-03 显示"仅展示前 500 条，共 N 条"） |
| 早退分支（无可导入文件） | 同样带 `duplicatesSkipped`（多为 0），`scanned` 用剔除前 | 是 |
| `dupMap` 为 `undefined`（未传 skipDuplicates） | 所有新字段取缺省 `0/[]/false` | 是（与改前一致） |
| 组合场景：跳过 + 未完成 + 冲突 | 三者分别计数互不覆盖：`skipped = 过大/超限 + 冲突skip + 失败 + 跳过重复` | 是（AC12 口径） |

---

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/import.ts` | `ImportStats.files` / `ImportResult` 类型；两处（含早退）stats 组装；明细排序与截断；`MAX_DUPLICATE_DETAIL` |
| `src/lib/mcp-http-api.ts` | `Job.errorCode`；catch 写入错误码；`partialFiles` 直接透传（无需改） |
| `web/src/api/httpApi.ts` | `ImportResult` / `ImportJob` 类型补 3 个字段（S-03 使用） |
| `test/import-skip-duplicates.test.ts` | 恒等式、明细截断、早退分支、组合场景 |
| `docs/import.md` | CLI 结果字段说明（新增字段标注"仅 Web 跳过场景非零"） |

---

## 8. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| 1 | 任务中心/任务详情是否展示"已跳过重复"（推演 G2） | 本期不改；若任务中心直接渲染 `stats.files` 则自动可见，实施时确认 |
| 2 | `docs/import.md` 是否要为 CLI 打印新增一行"已跳过重复" | CLI 无该能力 ⇒ 恒为 0，不打印；仅在字段表补充说明 |
