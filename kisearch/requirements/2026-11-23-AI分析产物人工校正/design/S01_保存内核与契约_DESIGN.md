# S01 保存内核与契约

- 父文档：`DESIGN.md` ｜ 需求：`REQ-20261123-001` v3（R-01a/R-02/R-03/R-04/R-05/R-06/R-07/R-08/R-13/R-14）
- 修订：**r2（2026-11-23）** —— 按 `design-review.md` 修订：补 R-08 重跑/续跑拦截（🔴1）、补保存不变量三条（空 patch 不写盘 / 空内容不置 null / `expectedRunId=null` 语义）、补非功能默认假设、补 `confidence:0` 语义约定、补 `HTTP_STATUS` 登记项。
- 目标：给三块产物一个**唯一写入口**（整块提交、严格校验、runId 闸门、位置验真），把 `editedAt` 打通到读出口，并在重跑前守住人工修订。

---

## 1. 术语

| 术语 | 含义 |
|---|---|
| 整块提交 | 单次 `PATCH` 携带三块目标值 + `expectedRunId`，一次锁内写完整份 `.analysis.json` |
| 严格校验 | 与 `normalizeChain` 同口径（kind 白名单 / text ≤200 / ref 形状 / 分支仅 root），但**超限报错**，不静默丢弃 |
| `expectedRunId` | 并发闸门：`undefined` 不校验、`null` 期望无草稿、字符串须等于当前 `draft.runId` |
| 手工位置 | 用户填 `file:line`，由服务端读真实文件验真后写入 `confirmed[]` |

## 2. 现状分析（AS-IS）

| 事实 | 位置 |
|---|---|
| 写面全集只有 6 个：`POST /analyze`、`POST /analysis/cancel`、`POST /analysis/confirm`（只写 `confirmed[]`）、`DELETE /analysis/draft`、`DELETE /analysis/confirmed/:locId`、`DELETE /analysis`（重置） | `src/lib/governance-http.ts` 事件路由段 |
| `AnalysisDraft` 无 `revision`、无 `editedAt`；写入者仅 `writeDraftStart` / `updateDraftIfMatch`，均带 `runId` 守卫 + 独立锁 `\0analysis:<hash>` | `src/lib/events/analysis-store.ts` |
| `normalizeChain` 对非法项**丢弃不报错**（模型输出不可信时的正确取舍） | `src/lib/events/conclusion-chain.ts` |
| `confirmDraftLocations` 要求 `cur.draft` 存在（否则抛 `ANALYSIS_DRAFT_NOT_FOUND`），`targetDir` 从 draft 复制 | `analysis-store.ts` |
| 位置验真现成：`verifyCandidateLocation(realRoot, file, line, endLine)` → `{ realSnippet }`，拦越界 / 二进制 / 路径越界；snippet 截到 500 字符 | `src/lib/events/analysis-fs-tools.ts` |
| 目标目录可由配置解析：`resolveAnalysisTargetDir(targetDirs, scope)`，与草稿无关 | `src/lib/chat/prompt-config.ts` |
| 重跑闸门只在 `candidates.length > 0` 时拦，**纯文本结论或人工修订会被静默覆盖** | `src/lib/events/analysis-runner.ts` 的 `startEventAnalysis` 前置判定 |
| 错误码 16xx 段已用至 `1621`；`REVISION_CONFLICT=1114(409)`、`ANALYSIS_ALREADY_RUNNING=1601(409)`、`ANALYSIS_LOCATION_NOT_FOUND=1611(404)` | `src/lib/governance-errors.ts` |
| 统一错误出口会透出 `details`（`{ok:false,code,error,details?}`），前端可直接读 `details.errors[]` | `governance-http.ts` 错误出口 |
| 已确认位置里 `confidence` 对人工位置无意义（`CodeLocRow` 已做"缺就隐藏"） | `web/src/components/governance/event-detail/CodeLocRow.tsx` |

## 3. 方案设计（TO-BE）

> **非功能性默认假设**（若前提变化需重估）：单机单进程、事件级文件存储（`.events/{id}.analysis.json`）；单事件保存频率 < 1 次/分钟；单次保存请求体 < 32KB；验真单次读文件 < 2MB（沿用 `verifyCandidateLocation` 现状）。

### 3.1 数据结构

`AnalysisDraft` 增一个字段（`src/lib/events/types.ts`）：

```ts
/** 人工修订时间戳；存在即表示三块产物被人工改过（H6：只记时间，不记人） */
editedAt?: number;
```

`readAnalysisDocRaw` 不动；`normalizeAnalysisDocForRead` 增一句归一（非 number 视为 `undefined`，与 `chain` 同时处理，避免历史文件炸）。

人工位置的 `confidence` 约定：**固定 `0`，语义 = "非 AI 判定"**。它与"AI 置信度 0"在数据层不可区分，因此**不靠数值区分**——由前端 `CodeLocRow` 打「人工」标记（S02），不新增字段。

### 3.2 新增模块：严格校验

**新增 `src/lib/events/analysis-edit.ts`**

```ts
/** 结论 summary 的**硬上限**（H10：取消 120 字软限制，与追问回答统一为 4000） */
export const CONCLUSION_MAX_CHARS = 4000;
export const UNCONFIRMED_ITEM_MAX = 300;
export const UNCONFIRMED_MAX_ITEMS = 20;
export const MANUAL_LOCATION_WHY_MAX = 200;
export const MANUAL_LOCATION_ADD_MAX = 20;    // 单次请求最多加几条

export interface EditFieldError { field: 'conclusion'|'chain'|'unconfirmed'|'confirmed'; index?: number; reason: string }

/** 返回错误清单（空数组 = 通过）；不做任何裁剪 */
export function validateDraftEdit(input: {
  conclusion?: string | null;
  chain?: unknown;
  unconfirmed?: unknown;
  confirmedAdd?: unknown;
  confirmedUpdate?: unknown;
}): EditFieldError[];
```

校验口径：

| 字段 | 规则 | 违规 |
|---|---|---|
| `conclusion` | 长度 ≤ **4000**（H10 统一硬上限，无软限制）；`null` 合法 | `conclusion N 字，超过上限 4000 字` |
| `chain` | ≤5 节点；`kind` ∈ 五值；`text` 去空白后 1..200；`ref` 匹配 `^([^\s:]+):(\d{1,7})$` 且行号 ≥1；`branches` 仅 `root`、≤3 条、每条 ≤120 | 带 `index` 与具体原因 |
| `unconfirmed` | 每条 1..300 字、去重、≤20 条 | 同上 |
| `confirmed.add` | `file` 非空且不含空格 / `line` 为正整数 / `endLine ≥ line` / `why` ≤200 且非空 | 同上 |
| `confirmed.update` | `id` 存在、`why` ≤200 非空 | 不存在 → `ANALYSIS_LOCATION_NOT_FOUND` |

> **v4 起取消"既有超长豁免"**：历史结论在解析层已被硬截断到 2000，必然 < 4000，所以一个 4000 阈值即可覆盖全部存量（R-06 / N10）。相应地 `validateDraftEdit` 不再需要 `currentConclusionLength` 入参。

### 3.3 存储层：唯一写入口

**`src/lib/events/analysis-store.ts` 新增**

```ts
export interface SaveDraftEditsArgs {
  expectedRunId?: string | null;
  conclusion?: string | null;
  chain?: ConclusionNode[];
  unconfirmed?: string[];
  confirmedAdd?: ManualLocationInput[];
  confirmedUpdate?: Array<{ id: string; why: string }>;
}

export async function saveDraftEdits(
  scope: string, eventId: string, args: SaveDraftEditsArgs, now?: number,
): Promise<EventAnalysisDoc>;
```

执行顺序（**验真在锁外**，见 D7）：

```text
0. 空 patch 判定：六项输入全未提供 → 直接返回现 doc，不写盘、不打 editedAt
   （与 S02「未改任何内容点保存直接回阅读态」对齐）
1. 读 doc（无锁）→ 判定 running → 抛 ANALYSIS_ALREADY_RUNNING
2. expectedRunId 语义：undefined 不校验；null 且已有草稿 → REVISION_CONFLICT；
   字符串 ≠ draft.runId → REVISION_CONFLICT（details.runId 给当前值）
3. 校验（validateDraftEdit）+ 断言「位置增改不依赖 draft 存在」
4. 有手工位置时：resolveAnalysisTargetDir(配置, scope) → 无则 ANALYSIS_TARGET_NOT_CONFIGURED
   → 逐条 verifyCandidateLocation(realRoot, file, line, endLine)
   失败 → ANALYSIS_LOCATION_VERIFY_FAILED（details.reason 可读，如"行号越界，文件共 N 行"）
5. withAnalysisLock(scope, eventId, 'analysis-save-edits', …)
   a. 重读 doc，二次校验 running 与 expectedRunId（防锁外期间被重跑）
   b. 拼 next draft：
      · 有草稿 → 逐字段覆盖（未传字段保持原值）
      · 无草稿 → 新建（runId `manual_${now36}_${rand6}`、status `ready`、
        targetDir 用 realRoot、commit null、candidates []、steps []、stats 全 0）
   c. **editedAt = now**（只改理由也算修订）；updatedAt = now
   d. confirmed = 原数组 + 新增（按 file+line 去重）+ 理由更新
   e. 一次写完整份 doc（walWrite）
6. 返回 doc
```

**三条不变量**（评审新增）：

| 不变量 | 说明 |
|---|---|
| 空 patch 不写盘 | 六项全缺省 → 直接返回，`editedAt` 不变。否则前端"点保存没改东西"也会把卡片标成「已人工修订」 |
| 清空不置 null | `conclusion=null` + `chain=[]` + `unconfirmed=[]` 是**合法终态**，`draft` 必须保留（R-14 / D-02 依赖它） |
| 每次有效写盘必设 `editedAt` | 含只改位置理由；重跑会重建 draft 从而自然清掉它（R-05「重新分析后消失」由此成立） |

> **v5 变更（H12/H13）**：`conclusion` / `chain` 的**人工编辑入口关闭**，但接口与校验**保留** —— 现在只有"追问补丁覆盖"（S03）会传这两个字段。因此 S01 的严格校验对结论仍然生效（补丁也要过），只是前端不再发人工改的结论。

**位置对象构造**（人工位置与候选路径的区别）：

```ts
{ id: `loc_${now36}_${rand5}`, file: 验真后的 relPath, line, endLine?,
  snippet: realSnippet, why, confidence: 0, targetDir: realRoot,
  commit: 当前 doc.draft?.commit ?? null, confirmedAt: now }
```

### 3.4 HTTP 接口契约

```
PATCH /governance/events/:id/analysis
权限：knowledge.write（与 confirm / draft 同段登记）
```

请求体（除 `scope` 外全部可选；**前端按整块提交**）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `scope` | string? | 缺省取 token 默认库 |
| `expectedRunId` | string \| null | `null` = 期望当前无草稿（有草稿则 409）；省略 = 不校验 |
| `conclusion` | string \| null | 一句话总结 |
| `chain` | `ConclusionNodeDto[]` | 因果链（严格校验） |
| `unconfirmed` | string[] | 未确认点 |
| `confirmed.add` | `{file,line,endLine?,why}[]` | 手工新增位置 |
| `confirmed.update` | `{id,why}[]` | 改理由 |

响应：

```json
// Demo 响应示例（仅示意格式，非最终数据）
{
  "ok": true,
  "scope": "kisearch",
  "eventId": "evt_9f2c1a",
  "editedAt": 1793512345678,
  "draft": { "runId": "run_m3k9_ab12cd", "status": "ready", "conclusion": "…", "chain": [], "unconfirmed": [], "editedAt": 1793512345678 },
  "confirmed": [{ "id": "loc_m3k9_x1y2z", "file": "src/a.ts", "line": 42, "snippet": "…", "why": "手工补充", "confidence": 0 }]
}
```

错误码（新增两个码必须**同时**登记 `GOVERNANCE_CODE_NUMBERS` 与 `HTTP_STATUS`）：

| 状态 | code | 触发 |
|---|---|---|
| 400 | `ANALYSIS_EDIT_INVALID`（1622） | 任一字段校验失败，`details.errors[]` 带 `field/index/reason` |
| 400 | `ANALYSIS_LOCATION_VERIFY_FAILED`（1623） | 手工位置验真失败，`details.reason` |
| 409 | `REVISION_CONFLICT` | `expectedRunId` 不匹配（含 `null` 但已有草稿） |
| 409 | `ANALYSIS_ALREADY_RUNNING` | 草稿 `running` |
| 404 | `EVENT_NOT_FOUND` / `ANALYSIS_LOCATION_NOT_FOUND` | 事件不存在 / 理由更新指向不存在的 id |
| 400 | `ANALYSIS_TARGET_NOT_CONFIGURED` | 手工位置需要目录但配置缺失 |

### 3.5 重跑 / 续跑拦截（R-08）

`startEventAnalysis` 的既有前置闸门（当前仅在 `candidates.length > 0` 时拦）扩展为：

```text
原：draft.status ∈ {ready, partial} && draft.candidates.length > 0 && !forceOverwrite → REVISION_CONFLICT
新：draft 存在 && (draft.candidates.length > 0 || draft.editedAt !== undefined) && !forceOverwrite → REVISION_CONFLICT
```

- **续跑同样被覆盖**：闸门位于 `resume` 读取之前，`resume:true` 走的是同一个判定，无需另加分支；续跑收尾的 `updateDraftIfMatch` 会整段重写 `conclusion / chain / unconfirmed`，正是需要守住的写入。
- **不新增错误码**：沿用 `REVISION_CONFLICT`，`details.runId` 给当前 runId；文案改为「当前草稿已有未处理的内容或人工修订，重新分析会覆盖结论与未确认点（已确认的代码位置不受影响）」。
- **不新增接口**：前端走既有 `forceOverwrite: true` 表示"确认覆盖"（S02 负责提示形态）。

### 3.6 出口与契约同步

| 出口 | 改法 |
|---|---|
| `GET /governance/events/:id` | `draft` 原样透出，`editedAt` 自动带上，**无需改代码** |
| `GET /analysis` | 同上 |
| MCP `ki_event_get` | `AnalysisDraftSummaryDto` 加 `editedAt?: number` |
| MCP `ki_event_list` | 扁平结构里加 **`conclusionEditedAt`**（与 `conclusionPreview` 同级；该出口没有 `analysis` 子对象） |
| 契约三处 | `src/lib/governance-contract.ts` 的 `AnalysisDraftDto` / `AnalysisDraftSummaryDto` + `web/src/api/governanceContract.ts` 副本 |

## 4. 关键决策点

| # | 决策 | 选定 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|---|
| D1 | 哪些状态可编辑 | **除 `running` 外均可** | 仅 `ready`/`partial`（需求 A1 原写法） | R-17 明确要求"NO_RESULT 草稿被人工补齐"，而 NO_RESULT 落盘即 `failed`；按 A1 原文会导致最需要人工补的场景反而不能编辑 | 出现"failed 草稿必须视为不可改"的业务约束 |
| D2 | 接口形态 | `PATCH /analysis` | ① `PUT /analysis/edit` 新路径 ② `POST /analysis/draft/save` | ①新增同义资源路径，与既有 `GET`/`DELETE /analysis` 分裂 ②`draft` 段已被 `DELETE` 占用，语义会混 | 需要"保存草稿版本"这类非覆盖语义 |
| D3 | 提交粒度 | 整块提交，但**接口字段可省略**（省略=不改） | 强制三块全传 | 缺字段即 400 会让"只改一句理由"必须回传整条链，徒增前端负担与误覆盖风险 | 出现三块必须原子关联的业务规则 |
| D4 | 校验实现 | 独立 `analysis-edit.ts` 严格校验 | 复用 `normalizeChain` 后比对长度 | 丢弃式归一无法定位"第 3 个节点超 200 字"，前端只能给笼统报错 | 无 |
| D5 | 并发闸门 | `expectedRunId` | 给 `AnalysisDraft` 加 `revision` | `confirm` 已有 `expectedRunId` 先例；`revision` 只在"同一 runId 内双标签页编辑"才有增量价值，场景稀有 | 出现同 runId 内并发编辑的真实案例 |
| D6 | 修订标识存储 | 单字段 `editedAt` | `edited: boolean` + `editedAt` 双字段 | 双字段必然漂移；`edited` 由 DTO 层派生 | 无 |
| D7 | 验真加锁范围 | 验真在锁外，锁内二次校验 | 全程在锁内 | 验真要读真实文件（单次可达几十 ms），持锁会阻塞同事件的后台分析写盘与 confirm | 验真出现长尾（>200ms）需要加缓存 |
| D8 | 覆盖保护判据 | **`editedAt` 存在即拦**（与 candidates 或关系） | 仅按"结论文本非空"判 | 文本为空但位置被手工补过同样是修订，按文本判会漏；`editedAt` 是唯一可靠的"改过"信号 | 出现不经 `saveDraftEdits` 的修订入口 |

## 5. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 草稿运行中 | 409 `ANALYSIS_ALREADY_RUNNING`，提示"先停止或等待完成" | 是 |
| 保存时草稿已被新一轮分析替换 | 409 `REVISION_CONFLICT`，`details.runId` 给当前 runId | 是 |
| `expectedRunId=null` 但已有草稿 | 409 `REVISION_CONFLICT`（同一条语义） | 是 |
| 无草稿且未传 `expectedRunId` / 传 `null` | 新建草稿（Q1） | 否（正常路径） |
| 六项输入全缺省 | 返回现 doc，不写盘、不打 `editedAt` | 否 |
| 手工位置路径不存在 / 越界 / 二进制 | 400 `ANALYSIS_LOCATION_VERIFY_FAILED`，`details.reason` 可直接展示 | 是 |
| 未配置目标目录 | 400 `ANALYSIS_TARGET_NOT_CONFIGURED`，前端引导到 AI 设置 | 是 |
| 链第 N 个节点超限 | 400 `ANALYSIS_EDIT_INVALID`，`errors[0]={field:'chain',index:N,reason}` | 是 |
| 有修订时重跑 / 续跑 | 409 `REVISION_CONFLICT`，文案说明"位置不受影响" | 是 |
| 写盘失败（磁盘/权限） | 原 500 路径，不做半写（walWrite 单文件） | 是 |
| 锁超时 | 沿用 `withScopeWriteLock` 的超时与错误码 | 是 |

## 6. 影响范围

```text
src/lib/events/
├── analysis-edit.ts          [新增] 严格校验 + 上限常量
├── analysis-store.ts         [修改] saveDraftEdits / editedAt 归一
├── analysis-runner.ts        [修改] 重跑/续跑闸门加 editedAt 条件（§3.5）
├── types.ts                  [修改] AnalysisDraft.editedAt?
└── analysis-fs-tools.ts      [只读] 复用 verifyCandidateLocation
src/lib/
├── governance-http.ts        [修改] PATCH /analysis 分支（放在既有 analysis 段内）
├── governance-errors.ts      [修改] + ANALYSIS_EDIT_INVALID(1622) / ANALYSIS_LOCATION_VERIFY_FAILED(1623)，含 HTTP_STATUS
├── governance-contract.ts    [修改] AnalysisDraftDto / AnalysisDraftSummaryDto 加 editedAt
├── auth/route-permissions.ts [修改] PATCH /analysis → knowledge.write
├── chat/prompt-config.ts     [只读] resolveAnalysisTargetDir
└── mcp-tools/event-list.ts   [修改] analysis 加 editedAt
web/src/api/governanceContract.ts [修改] 副本同步
test/
├── events/analysis-store.test.ts  [修改] 保存 / 冲突 / 新建 / 验真 / 空 patch 用例
├── events/analysis-edit.test.ts   [新增] 校验口径逐条
├── events/analysis-runner.test.ts [修改] 有 editedAt 时重跑被拦
└── governance-contract.test.ts    [修改] editedAt 两端一致
```

**验收断言**：正常保存回读一致；`expectedRunId` 不匹配 409 且磁盘未变；无草稿保存后 `GET /analysis` 能读到；手工位置验真失败不写盘；**空 patch 不产生 `editedAt`**；**有 `editedAt` 时重跑 / 续跑被拦**；`editedAt` 出现在 MCP 两个出口。

## 7. 待定问题

无。
