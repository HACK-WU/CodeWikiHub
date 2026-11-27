# S-01 产物字段与归一

所属：`REQ-20261124-001` ｜ 依赖：无（根子需求）｜ 被依赖：S-02 / S-03 / S-04

## 1. 术语

| 术语 | 定义 |
|---|---|
| `dataFlow` | `AnalysisDraft` 上的可选多行字符串，承载「数据链路」文字树；**换行有语义**，禁止压成单行 |
| 归一三态 | ① 合法字符串 → 保留；② 非法类型 / 空串 / 全空白 → 删除键；③ 超限 → 截断并追加提示行 |
| 无变化保引用 | 归一对合法数据必须返回**原对象引用**，否则破坏读盘路径的 `normalized === d` 早退 |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/events/types.ts:252-298` | `AnalysisDraft` 只有 `conclusion: string \| null` 与 `chain: ConclusionNode[]`，无链路字段 |
| `src/lib/events/conclusion-chain.ts:51-53` | `oneLine()` 把任意文本压成单行 —— 与链路「保留换行」的规则**相反**，不能复用 |
| `src/lib/events/analysis-store.ts:83-120` | `normalizeAnalysisDocForRead` 逐字段构造：`conclusion` / `chain` / `editedAt` 三项各有 `*Ok` 判据，三者全 Ok 时返回原对象 |
| `src/lib/events/analysis-runner.ts:997-1000` | `parseJsonSummary` 返回 `{conclusion, chain, candidates, unconfirmed}`，无链路 |
| `src/lib/events/analysis-runner.ts:1231-1252` | `initialDraft`（`running` 态）设 `conclusion: null` / `chain: []` |
| `src/lib/events/analysis-runner.ts:1925-1945` | 收尾 `updateDraftIfMatch` 写 `conclusion` / `chain: pruneChainRefs(...)` 等终态字段 |
| `src/lib/governance-contract.ts:525-556` | `AnalysisDraftDto` 无链路字段；`web/src/api/governanceContract.ts:511-514` 是逐字副本 |

## 3. 方案（TO-BE）

### 3.1 新增模块 `src/lib/events/data-flow.ts`

单一职责：只管多行链路的清洗，**不引入** `oneLine`。

```ts
/** 模型侧要求 ≤30 行 / ≤2000 字；归一上限留缓冲，正常输出永不触发截断 */
export const DATA_FLOW_MAX_LINES = 40;
export const DATA_FLOW_MAX_CHARS = 3000;
/** 截断提示行（不是树的一部分，单独一行） */
export const DATA_FLOW_TRUNCATED_MARK = '…（链路过长，已截断）';

/**
 * 归一链路文本。
 * - 非字符串 / trim 后为空 → undefined（调用方删除该键）
 * - CRLF 统一为 LF；行尾空白清除；3 行以上连续空行压成 1 行；首尾空行去除
 * - **行首**全角空格（`\u3000`）转两个半角（等宽字体下两者宽度不同，混用会让缩进跳档）；行内不动
 * - 超 40 行或超 3000 字 → 截断并追加 DATA_FLOW_TRUNCATED_MARK；
 *   截断预算里**先扣掉提示行长度**（否则「正好 3000 字 + 提示行」会再次超限 → 每次读盘都改写，不幂等）
 * - 字符截断回退到上一个换行（单行超长时无处可退，按预算切平，不再引入第二个换行）
 * - 合法且无需改动时返回与入参等值的字符串（调用方按值比较判「无变化」）
 */
export function normalizeDataFlow(raw: unknown): string | undefined;
```

### 3.2 类型与解析

| 文件 | 改动 |
|---|---|
| `src/lib/events/types.ts` | `AnalysisDraft` 增 `dataFlow?: string`（**不加**进 `conclusion` 的 null 语义：老文件本就没有该键，可选最自然） |
| `src/lib/events/analysis-runner.ts` `parseJsonSummary` | 返回类型增 `dataFlow?: string`；实现 `dataFlow: normalizeDataFlow(parsed.dataFlow)` |
| `src/lib/events/analysis-runner.ts:1933` 附近 | 收尾写盘增 `dataFlow: parsed?.dataFlow`（**显式覆盖**：`...cur` 会带上旧值，重跑必须能清空） |
| `src/lib/events/analysis-runner.ts:1237` 附近 | `initialDraft` **不设**该字段（`running` 态没有链路，避免半截展示） |

### 3.3a 读侧透出（`ki_event_get` / 事件详情）——**实际存在字段白名单，必须显式补**

> ⚠️ **本节在 2026-11-24 前置层实施时被 auto-review 更正**。原判断「event-get 不逐字段拼，会自动带出」是错的。

`src/lib/events/event-detail.ts:322-340` 用**逐字段白名单**构造 `AnalysisDraftSummaryDto`（`status` / `conclusion` / `chain` / `unconfirmed` / `commit` / `startedAt` / `updatedAt` / `editedAt` / `source` / `importedAt` / `sourceClient` / `errorCode` / `errorMessage`），`chain` 之后没有 `dataFlow` ⇒ **不补则写进去了也读不出来**（MCP `ki_event_get` 与详情通道都看不到链路）。

| # | 位置 | 改动 | 状态 |
|---|---|---|---|
| 1 | `src/lib/events/event-detail.ts` 精简 draft 构造 | `chain` 之后加 `...(typeof draft.dataFlow === 'string' && draft.dataFlow ? { dataFlow: draft.dataFlow } : {})`（多一层 `typeof`：该对象直接来自读盘，可能是旧文件或修复前的脏值） | ✅ 前置层已补（1 行，零行为变化） |
| 2 | `src/lib/governance-contract.ts` `AnalysisDraftSummaryDto` | 加 `dataFlow?: string` | ✅ 前置层已补 |
| 3 | `web/src/api/governanceContract.ts` 同 DTO | 同上（同位置、同可选性） | ✅ 前置层已补 |

> 两套 DTO 并存：`EventAnalysisDto.draft`（完整，事件页 AI 分析卡走这个）与 `EventDetailDto.analysis.draft`（精简，MCP / 详情走这个）。**两者都要有 `dataFlow`**，只加一套会出现「页面有、MCP 没有」或反之。

### 3.3 读盘归一（关键）

`normalizeAnalysisDocForRead` 增第四项判据，**必须并入既有的「全 Ok 才返回原对象」表达式**，不得提前 return（该函数已有注释警告：插在僵尸分支里等于只修了部分文件）。

```ts
const rawFlow = (d as { dataFlow?: unknown }).dataFlow;
const flow = normalizeDataFlow(rawFlow);
/*
 * 无变化判据**必须分两支**：`normalizeDataFlow` 对「非字符串」和「字符串」都可能返回 undefined，
 * 单写 `flow === rawFlow` 会把 `dataFlow: 123`（非法类型）误判为「无变化」→ 脏值原样留给前端，
 * 而 React 直接渲染对象会抛错（`Objects are not valid as a React child`）。
 */
const flowOk = flow === undefined ? rawFlow === undefined : flow === rawFlow;

const normalized = conclusionOk && chainOk && editedAtOk && flowOk
  ? d
  : { ...d, /* 既有三项 */, ...(flowOk ? {} : flow === undefined ? {} : { dataFlow: flow }) };
```

非法值（数字 / 对象 / 空串）时用**解构删除**丢掉 `dataFlow` 键，而不是写 `dataFlow: undefined`（保持落盘 JSON 干净）。

## 4. 数据模型

| 字段 | 类型 | 必填 | 缺省 | 含义与约束 |
|---|---|---|---|---|
| `draft.dataFlow` | `string` | 否 | 键不存在 | 多行文本树（LF 分隔）；归一后 ≤40 行 / ≤3000 字；含 `▼` / `├─` / `└─` / 空格缩进；不含 ``` 围栏；前端原样等宽渲染 |

## 5. 契约（双份，必须同改）

`src/lib/governance-contract.ts` 与 `web/src/api/governanceContract.ts` 的 `AnalysisDraftDto` 同步增：

```ts
/** 数据链路（2026-11-24）：多行文本树，前端等宽原样渲染；缺省表示本次结论没有链路 */
dataFlow?: string;
```

`test/governance-contract.test.ts` 的字段对账用例需覆盖新字段（该测试逐字比对两份 DTO）。

## 6. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 存储形态 | 单个可选字符串 `dataFlow` | ① `dataFlow: {nodes:[...],edges}` 结构化；② 每行一条的 `string[]` | ① 模型输出结构化树准确率未验证，归一与校验成本翻倍，且与已确认的纯文本形态不符；② 行内缩进已是树，拆数组反而让前端要重建层级 | 若链路需要「位置可点」或按节点折叠，重新评估 |
| 归一放哪 | 新建 `data-flow.ts` | 塞进 `conclusion-chain.ts` | 该模块核心是 `oneLine()`（压单行），与本字段规则相反，混放极易被误用 | 无 |
| 类型可空性 | `dataFlow?: string`（键可缺） | `dataFlow: string \| null`（键必在） | 老文件没有该键，必在会逼读盘补 null、落盘写出 `"dataFlow": null`，与 `chain` 的可选风格也不一致 | 无 |
| 上限取值 | 模型侧 30 行 / 2000 字，归一 40 行 / 3000 字缓冲 | 统一 30 行 / 2000 字 | 模型偶发超一行的正常输出会被截断成残树，代价高于多留缓冲 | 实测截断频繁时收紧 |

## 7. 影响范围

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/lib/events/data-flow.ts` | **新增** | 归一函数 + 三个常量 |
| `src/lib/events/types.ts` | 改 | `AnalysisDraft.dataFlow?` |
| `src/lib/events/analysis-store.ts:83-120` | 改 | 读盘归一加第四项判据 |
| `src/lib/events/analysis-runner.ts:997-1000 / :1237 / :1933` | 改 | 解析返回、初始草稿（不设）、收尾写盘（显式覆盖） |
| `src/lib/events/event-detail.ts:322-340` | 改 | 精简 draft 白名单透出 `dataFlow`（见 §3.3a） |
| `src/lib/governance-contract.ts` | 改 | `AnalysisDraftDto` + `AnalysisDraftSummaryDto` + `proposal` 三处 |
| `web/src/api/governanceContract.ts` | 改 | 同上三处（副本，逐字一致） |
| `test/events/data-flow.test.ts` | **新增** | 归一单测（见 S-04 §6 测试口径） |
| `test/governance-contract.test.ts` | 改 | 字段对账覆盖新字段 |

## 8. 待定问题

无。
