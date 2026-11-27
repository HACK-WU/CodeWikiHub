# S-01 外部结论写入内核

承接：R2 R3 R4（详情侧）R9（校验侧）｜依赖：无｜被依赖：S-02、S-03

## 1. 术语

| 术语 | 定义 |
|---|---|
| 外部结论 | `draft.source === 'external'` 的分析草稿，由 MCP 上传，无分析过程（`steps: []`） |
| 来源字段 | `source` / `importedAt` / `sourceClient`，缺省（`undefined`）等价于 `'ai'` |
| 覆盖闸门 | 目标草稿非 external 时，必须显式 `overwrite: true` 才允许替换 |
| 验真 | 逐条校验候选位置的文件存在、行号在范围内、非二进制，取真实 snippet |

**非功能性默认假设**（本子需求适用，超出需另行确认）：单机部署；同一事件的分析写入串行（已有写锁）；单次上传载荷 ≤ 50 KB；无跨进程并发写同一事件。

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/events/types.ts:243-283` | `AnalysisDraft` 无任何来源字段；`runId` 前缀 `run_`（分析）/ `manual_`（人工）是唯一弱标识 |
| `src/lib/events/analysis-store.ts:390-455` | `saveDraftEdits` 是唯一人工写入口：空 patch 不写盘、running 409、`editedAt` 必设 |
| 同文件 `:337-353` | `buildManualDraft` 已给出「无过程草稿」形状：`steps: []`、`candidates: []`、`stats` 全 0，但写 `editedAt` |
| 同文件 `:184-231` | `confirmDraftLocations` 按 `candidateIds` 从 `draft.candidates` 取，写入 `confirmed[]`；按 `file+line` 去重 |
| `src/lib/events/analysis-edit.ts:284-318` | 严格校验（不裁剪）：结论 4000 / 链 5×200 / 分支 3×120 / 未确认 20×300 |
| `src/lib/events/analysis-fs-tools.ts:539-575` | `verifyCandidateLocation` 返回 `{ok:true,file,line,endLine?,realSnippet}` 或 `{ok:false,reason}` |
| `src/lib/events/event-detail.ts:308-323` | 详情只透出 `status/conclusion/chain/unconfirmed/commit/时间/editedAt/error*` |
| `src/lib/scope-policy.ts:70-98` | 写操作白名单登记表，未登记即按拦截处理 |
| `src/lib/events/analysis-runner.ts:1749-1761` | 站内分析对无效候选是**剔除并记录**（`dropped`），不是整批失败 |

## 3. 方案（TO-BE）

### 3.1 数据模型

`src/lib/events/types.ts`

```ts
/** 结论来源：缺省 = 'ai'（历史数据无该字段，读取时按 'ai' 处理） */
export type AnalysisSource = 'ai' | 'external';

export interface AnalysisDraft {
  runId: string;                 // ai: run_… / manual: manual_… / external: ext_…
  bootId?: string;
  status: AnalysisRunStatus;     // 外部上传固定 'ready'
  targetDir: string;             // 外部上传必填（由配置解析）
  commit: string | null;
  errorCode?: string;
  errorMessage?: string;
  conclusion: string | null;     // ≤4000
  chain: ConclusionNode[];       // ≤5 节点
  liveThinking?: { round: number; text: string; chars: number };
  candidates: AnalysisCandidate[]; // 外部上传：验真后落盘，≥1
  unconfirmed: string[];         // ≤20 条 × ≤300 字
  steps: AnalysisStepRecord[];   // 外部上传固定 []
  stats: AnalysisStats;          // 外部上传固定全 0
  startedAt: number;
  updatedAt: number;
  editedAt?: number;             // ★ 外部上传【不写】
  /** 来源（新增）；undefined = 'ai' */
  source?: AnalysisSource;
  /** 外部上传时间（新增），仅 source==='external' 出现 */
  importedAt?: number;
  /** 外部来源标识（新增），如 MCP 客户端名；仅 source==='external' 出现 */
  sourceClient?: string;
}
```

字段取舍说明：

| 字段 | 为什么这样定 |
|---|---|
| `source?` 可选而非必填 | 历史文件无该字段，必填会要求全量迁移 + 读盘写回 |
| `importedAt` 独立于 `editedAt` | `editedAt` 语义是「人改过」，外部上传不是人工修订（U6） |
| `sourceClient` 可选 | 仅用于回读与排障，不参与判定 |
| 不新增 `origin`/`version` | 本期覆盖式，无版本需求 |

三处 DTO 同步：`src/lib/events/types.ts`、`src/lib/governance-contract.ts:520-545`、`web/src/api/governanceContract.ts:498-523`。字段名与可选性必须逐字一致（契约测试机械比对）。

### 3.2 校验扩展

`src/lib/events/analysis-edit.ts`

1. `EditField` 增加 `'candidates'`。
2. 新增 `validateExternalCandidates(raw, errors, value)`：数组、1~20 条、每项 `{file, line, endLine?, why, confidence?}`，`file` 非空且不含空格、`line` 正整数、`endLine ≥ line`、`why` ≤200 字、`confidence` ∈ [0,1]（缺省 0.5）。
3. 新增 `validateExternalImport(payload)`：在 `validateDraftEdit` 之上追加三条：
   - `candidates` 必填且 ≥1（U2：必须带代码）；
   - `chain` 至少 1 个节点；
   - **`chain[].ref` 必须落在 `candidates` 的 `file:line` 集合内**（剔除模式下按剔除后的集合判），否则 400 `ANALYSIS_EDIT_INVALID`（`field='chain'`, `reason='引用位置不在候选位置内'`）。
     理由：`pruneChainRefs`（`conclusion-chain.ts:102-113`）只在模型侧剪枝，外部入口若放过悬空 ref，前端胶囊会因 `confirmed` 无匹配而永久不可点（`ConclusionChain.tsx:186-196`），用户看到「无法预览」却查不出原因。

阈值一律从 `conclusion-chain.ts` 与 `analysis-edit.ts` 既有常量导入，**不复制数字**。

### 3.3 写入口

`src/lib/events/analysis-store.ts` 新增：

```ts
export interface ExternalAnalysisInput {
  conclusion?: string | null;
  chain?: unknown;
  candidates: unknown;              // 必填
  unconfirmed?: unknown;
  /** 入参覆盖根目录；**必须等于配置解析根目录**，否则拒绝 */
  targetDir?: string;
  commit?: string | null;
  /** 覆盖已有【非外部】草稿必须为 true；不豁免 expectedRunId */
  overwrite?: boolean;
  /** 允许剔除验真失败项（默认 false = 整批失败） */
  skipInvalidCandidates?: boolean;
  /** 并发闸门：undefined 不校验 / null 期望无草稿 / string 必须等于当前 runId */
  expectedRunId?: string | null;
  sourceClient?: string;
}

export async function saveExternalAnalysis(
  scope: string,
  eventId: string,
  input: ExternalAnalysisInput,
  now?: number,
  deps?: { loadConfigFn?: () => ReturnType<typeof loadConfig> },
): Promise<EventAnalysisDoc>;
```

执行顺序（**验真在锁外、锁内二次校验**，与 `saveDraftEdits` 同构）：

```text
1 读 before = readAnalysisDocRaw
2 before.draft?.status === 'running' → 409 ANALYSIS_ALREADY_RUNNING
3 assertRunIdMatch(before.draft?.runId ?? null, input.expectedRunId)
    —— 先判并发闸门，再判覆盖闸门：expectedRunId 是「我看见的是哪一份」，
       覆盖是「我允许替换哪一份」，后者不能豁免前者
4 覆盖闸门：
    有 draft 且 draft.source !== 'external' 且 input.overwrite !== true
      → 409 ANALYSIS_DRAFT_EXISTS（details.currentRunId）
    有 draft 且 source === 'external' → 允许直接覆盖（无需 overwrite）
5 validateExternalImport → errors 非空 → 400 ANALYSIS_EDIT_INVALID（details.errors 逐项）
6 解析真实根目录：
    configRoot = resolveEditableTargetRoot(scope, deps?.loadConfigFn?.())
    入参 targetDir 提供时：realpath 后必须 === configRoot，否则 400 ANALYSIS_TARGET_OUT_OF_ROOT
7 逐条 verifyCandidateLocation：
    默认（skipInvalidCandidates=false）任一失败 → 400 ANALYSIS_LOCATION_VERIFY_FAILED（指出第几条）
    skipInvalidCandidates=true → 剔除无效项进 dropped[]；若有效项为 0 → 409 ANALYSIS_CANDIDATE_ALL_DROPPED
8 withAnalysisLock('analysis-import')：
    8.1 锁内重读 cur，重复 2/3/4（规则同上，错误码同）
    8.2 构造 draft：
          runId      = `ext_${now36}_${randomBytes(3).hex}`
          status     = 'ready'
          targetDir  = configRoot
          conclusion = 校验后的值
          chain      = 校验后的值
          candidates = 验真后的值（id = `cand_${now36}_${rand}`，snippet 用 realSnippet）
          unconfirmed= 校验后的值
          steps      = []
          stats      = { turns: 0, filesRead: 0, tokens: 0, ms: 0 }
          startedAt  = now
          updatedAt  = now
          source     = 'external'
          importedAt = now
          sourceClient = input.sourceClient（有值才写）
          editedAt   = 不写
    8.3 confirmed 原样保留（不清空、不追加）
    8.4 writeAnalysisDoc
```

**不校验事件阶段**：与既有 `PATCH /analysis` 一致（已收口事件仍可改结论 —— 结论是对已发生事实的记录）。该行为写入 §6 与负向需求。

### 3.3.1 反方向保护：AI 重跑覆盖外部结论

现有闸门（`analysis-runner.ts:1035-1049`）**已覆盖大部分情形**：外部草稿 `status='ready'` 且 `candidates ≥ 1`（U2 强制），必然命中 `hasUnhandledCandidates` → 未带 `forceOverwrite` 时抛 `REVISION_CONFLICT`，前端 `AiAnalyzePanel.tsx:138` 走两段式确认。因此「重跑静默吃掉外部结论」在正常数据下不成立。

真实缺口是**来源不可见**（用户看到的仍是「已有待确认的分析草稿」，以为是自己跑的分析）。补两处：

1. **服务层**（`analysis-runner.ts` 闸门）：
   - 增加独立判据 `hasExternalDraft = existingDoc.draft?.source === 'external'`（防御异常数据：外部草稿 status 非 ready 或 candidates 为空时仍能拦住），并入 `details`；
   - 文案按来源分档：外部 → 「当前结论由**外部上传（MCP）**，重新分析会整份覆盖且**不可恢复**（已确认的代码位置不受影响）」；其他沿用原文案。
2. **前端**（`AiAnalyzePanel.overwritePrompt`）：按 `analysis.draft?.source === 'external'` 显示外部文案，确认按钮改「覆盖外部结论并重新分析」。

错误码复用 `REVISION_CONFLICT`（前端已有按 code 分支的两段式确认），`details` 增加 `hasExternalDraft`，**不新增错误码**。

`scope-policy.ts` 的 `BLOCKED_OPS` 追加 `'analysis-import'`（`test/scope-readonly.test.ts:69-77` 会扫全部 op 字面量，未登记即红）。

### 3.4 读出口

`src/lib/events/event-detail.ts:308-323` 的 `analysis.draft` 增加：

```ts
...(draft.source ? { source: draft.source } : {}),
...(draft.importedAt !== undefined ? { importedAt: draft.importedAt } : {}),
...(draft.sourceClient ? { sourceClient: draft.sourceClient } : {}),
```

`ki_event_get` 复用 `getEventDetail`，因此自动可见。**`ki_event_list` 不透出来源**（列表是定位用途，不带分析摘要），该口径同步写入 requirement R4。

### 3.5 Demo 返回（内部 service 示意，非最终数据）

```json
{
  "version": 1,
  "eventId": "evt_01J8X2",
  "draft": {
    "runId": "ext_m3k9x1_a1b2c3",
    "status": "ready",
    "targetDir": "/data/code/demo",
    "commit": null,
    "conclusion": "采样表只按 table_id 取队列 10 条、未按配置过滤，导致趋势图误判为故障",
    "chain": [{ "kind": "root", "text": "采样未按 bk_collect_config_id 过滤", "ref": "src/collect/sample.py:700" }],
    "candidates": [{ "id": "cand_m3k9x1_aa11", "file": "src/collect/sample.py", "line": 700, "snippet": "...", "why": "采样过滤点", "confidence": 0.9 }],
    "unconfirmed": ["配置 22 的停用原因不在代码内"],
    "steps": [],
    "stats": { "turns": 0, "filesRead": 0, "tokens": 0, "ms": 0 },
    "startedAt": 1795500000000,
    "updatedAt": 1795500000000,
    "source": "external",
    "importedAt": 1795500000000,
    "sourceClient": "mcp"
  },
  "confirmed": [],
  "updatedAt": 1795500000000
}
```

## 4. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/events/types.ts` | `AnalysisSource` + `AnalysisDraft` 三字段 |
| `src/lib/governance-contract.ts` | `AnalysisDraftDto` 三字段 |
| `web/src/api/governanceContract.ts` | 同上（镜像） |
| `src/lib/events/analysis-edit.ts` | `EditField` + 两个校验函数 |
| `src/lib/events/analysis-store.ts` | `saveExternalAnalysis` + 私有 `buildExternalDraft` |
| `src/lib/events/event-detail.ts` | 三字段透出 |
| `src/lib/events/analysis-runner.ts:1035-1049` | 重跑闸门增加 `hasExternalDraft` 判据与来源分档文案（§3.3.1） |
| `src/lib/scope-policy.ts` | 登记 `analysis-import` |
| `src/lib/governance-errors.ts` | 新增 3 个错误码（见 §6） |
| `test/analysis-store-external.test.ts`（新增） | 覆盖 §6 全部行 |

## 5. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-01 | `saveExternalAnalysis` 独立函数 | 给 `saveDraftEdits` 加 `source` 参数 | `buildManualDraft` 必设 `editedAt`、`expectedRunId: null` 语义是「期望无草稿」，与「允许覆盖外部草稿」冲突，塞在一起会让两条语义互相污染 | 若后续出现 3 种以上写来源，再抽公共内核 |
| D-02 | `source` 可选、缺省视为 ai | 必填 + 启动迁移 | 需全量读写回迁移，且旧文件一旦迁移失败整卡不可读 | 当来源需要参与索引或统计时改为必填 |
| D-03 | 外部草稿直接覆盖、AI 草稿需 `overwrite` | 一律需 `overwrite` | 重传同一份结论是常态，每次都要额外参数会诱使 AI 乱传 | 出现「误覆盖外部草稿」的真实事故 |
| D-04 | `candidates` 必填且逐条验真 | 允许为空 | 空候选 → 前端确认入口不出现（`AiAnalyzePanel.tsx:300-308`），与 U2「必须代码」矛盾；且空 snippet 的引用胶囊点不开 | 结论类事件确实没有代码位置时，另立「无代码结论」类型 |
| D-05 | 覆盖时保留 `confirmed[]` | 覆盖时清空 | 已确认位置是人工产出，清空等于丢数据；且 `saveDraftEdits` 同款行为 | 需按 runId 追溯位置来源时 |
| D-15 | 入参 `targetDir` 必须等于配置根 | 允许传子目录 | 子目录会让 `chain.ref` 与 `confirmed[].file` 的相对基准漂移（前端按 `targetDir` 解析），且需额外的「是否在根内」安全校验 | 需要多仓库同事件使用时 |
| D-16 | 验真默认整批失败，可选剔除 | 一律剔除无效项 | 外部 AI 的幻觉路径若被静默剔除，用户会以为「上传的就是这些位置」，属于静默失败；与 `analysis-edit.ts` 的严格取向一致 | 若实测外部路径错误率高导致可用性差，再调默认值 |
| D-19 | 重跑覆盖外部结论复用 `REVISION_CONFLICT` + `details.hasExternalDraft` | 新增 `ANALYSIS_EXTERNAL_DRAFT_EXISTS` 错误码 | 前端 `AiAnalyzePanel.tsx:138` 已按 `REVISION_CONFLICT` 做两段式确认，新增码要同步改前端分支与全部测试断言，收益仅是「码更专一」 | 若前端需要按来源走完全不同的交互流程时 |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 分析进行中 | 409 `ANALYSIS_ALREADY_RUNNING`，锁外与锁内各判一次 | 是（结构化错误码） |
| 目标草稿非外部且未带覆盖参数 | 409 `ANALYSIS_DRAFT_EXISTS`，附当前 runId | 是 |
| `expectedRunId` 不符 | 409 `REVISION_CONFLICT`，附当前 runId | 是 |
| 字段超限 / 类型非法 | 400 `ANALYSIS_EDIT_INVALID`，`details.errors[]` 逐项含 index 与原因 | 是 |
| 候选位置验真失败（默认） | 400 `ANALYSIS_LOCATION_VERIFY_FAILED`，指出第几条与原因 | 是 |
| 候选位置全部无效（允许剔除时） | 409 `ANALYSIS_CANDIDATE_ALL_DROPPED`（新增） | 是 |
| `chain.ref` 指向不在候选内的位置 | 400 `ANALYSIS_EDIT_INVALID`（`field='chain'`，指出第几个节点） | 是 |
| 入参 `targetDir` 与配置根不一致 | 400 `ANALYSIS_TARGET_OUT_OF_ROOT`（新增） | 是 |
| 分析目标目录未配置 / 不可读 | 400 `ANALYSIS_TARGET_NOT_CONFIGURED` / `ANALYSIS_TARGET_UNREADABLE` | 是 |
| 只读库 | 403 `SCOPE_READONLY`（由写锁前置判定） | 是 |
| scope 传视图名 | 写操作被拒（`assertNotScopeView`） | 是 |
| 事件已收口 | **不拦截**：允许上传（与 `PATCH /analysis` 一致） | 否（正常路径） |
| AI 重跑遇外部结论且未带 `forceOverwrite` | 409 `REVISION_CONFLICT`（`details.hasExternalDraft=true`），文案说明「外部上传、不可恢复」 | 是 |
| 分析文件损坏 | 读盘归一为空，按「无草稿」处理 | 否（内部降级） |
| 候选与已确认位置重复 | 确认时按 `file+line` 去重，不重复添加（既有 `confirmDraftLocations` 行为） | 否 |

## 7. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| Q-5 | 已收口事件上传结论是否需要提示「事件已关闭」 | 本期不提示（与页面编辑一致）；若后续要求只读收口事件，再统一加闸门 |
