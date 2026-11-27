# S-03 写入入口（追问补丁 + MCP 外部上传）

所属：`REQ-20261124-001` ｜ 依赖：S-01（归一）、S-02（降级句式）｜ 被依赖：S-04（补丁弹框展示）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 补丁（patch） | 追问回答末尾的 ```ki-conclusion-patch 围栏块，由模型给出、服务端校验、用户确认后覆盖结论 |
| 缺省不改 | 补丁不带 `dataFlow` ⇒ 保留旧值；这是本轮唯一「不传即保留」的入口 |
| 整篇覆盖 | 外部上传（`overwrite=true`）重建整份草稿；不带 `dataFlow` ⇒ 该结论明确没有链路（清空） |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/events/analysis-ask-patch.ts:31` | 围栏标记 ` ```ki-conclusion-patch ` |
| `src/lib/events/analysis-ask-patch.ts:190-212` | 只解析 `conclusion` / `chain` / `reason`；`conclusion` 必非空、`chain` 必数组 |
| `src/lib/events/analysis-ask-patch.ts:257-280` | `diffProposal(current, patch)` 只比 `conclusion` 与 `chain` 两块 |
| `src/lib/events/analysis-ask-runner.ts:676` | 构建补丁上下文时只传 `{conclusion, chain}` |
| `src/lib/events/analysis-ask-runner.ts:431-460` | 补丁提示词：JSON 样例 + kind 白名单 + 「结论没变化不要输出该块」 |
| `src/lib/governance-http.ts:1276-1302` | `PATCH /analysis` 字段白名单：`expectedRunId / conclusion / chain / unconfirmed / confirmed.*`；`acceptedProposalTurnId` 仅做审计标记 |
| `src/lib/events/analysis-ask-store.ts:115` | `markAskProposalAccepted` 只标记采纳，不写结论 |
| `src/lib/mcp-tools/event-edit.ts:62 / 69 / 440-447` | `ALLOWED_FIELDS.analysis`、`KNOWN_FIELDS`、zod schema 三处均无 `dataFlow` |
| `src/lib/events/analysis-store.ts:476-660` | `ExternalAnalysisInput` + `saveExternalAnalysis`：整篇重建草稿，`source=external`，候选真值校验 |
| `src/lib/events/analysis-edit.ts:321-360` | `validateExternalImport` 严格报错、绝不静默裁剪；`candidates` 必填 ≥1、`chain` 必 ≥1 节点 |

## 3. 方案（TO-BE）

### 3.1 追问补丁（缺省不改）

| 文件 | 改动 |
|---|---|
| `src/lib/events/types.ts` `AskProposal` | 增 `dataFlow?: string` |
| 契约 `askTurn.proposal`（`governance-contract.ts` + 前端副本） | 增 `dataFlow?: string`（✅ 前置层已落地，两处同位置） |
| `analysis-ask-patch.ts:190-212` | 解析 `dataFlow`：非字符串忽略；字符串走 `normalizeDataFlow`；归一后为空（含空串）**不写进 patch**（= 不改） |
| `analysis-ask-patch.ts:34-45` `ProposalDiffBlock` | `block` 枚举增 `'dataFlow'`；新增比较：行数变化 + 首行对照（**不铺全文**，弹框放不下） |
| `analysis-ask-patch.ts:257-280` `diffProposal` | 增一段：`patch.dataFlow !== undefined` 且与 `current.dataFlow` 不同 → 推一块 `{block:'dataFlow', kind:'改', before:'7 行 · 首行…', after:'9 行 · 首行…'}` |
| `analysis-ask-runner.ts:676` | current 增 `dataFlow: analysis.draft?.dataFlow`（让模型判断是否需要改链路） |
| `analysis-ask-runner.ts:431-460` | 补丁提示词：JSON 样例加 `"dataFlow"`；并加一句「结论若变了，必须同时给出新链路；链路没变就不要写该字段」 |
| `web/src/components/governance/event-detail/AskBlock.tsx` | **采纳动作要把 `patch.dataFlow` 带进 `PATCH /analysis` 的 body**（否则解析出来了也不落盘）；弹框额外展示一行 `dataFlow` 摘要 |

### 3.2 PATCH /analysis 接受该字段（供补丁采纳，UI 不开放）

`src/lib/governance-http.ts:1276-1283` 白名单补一行：

```ts
...(has('dataFlow') ? { dataFlow: b.dataFlow } : {}),
```

`saveDraftEdits` / `validateDraftEdit`（`src/lib/events/analysis-edit.ts:86-120`、`:284`）增 `dataFlow`，**用 `normalizeDataFlow` 宽松归一**（截断 + 提示行），不逐字符报错。

> **口径更正（本次设计发现需求 U8 表述需修正）**：U8 原文是「PATCH /analysis 不加该字段」，但那会让补丁无法带链路。正确口径与既有 H13 一致：**接口接受、编辑态 UI 不提供输入**（结论/链路都不可人工手改）。

### 3.3 MCP 外部上传（严格校验）

| 文件 | 改动 |
|---|---|
| `src/lib/mcp-tools/event-edit.ts:62` | `ALLOWED_FIELDS.analysis` 增 `'dataFlow'` |
| `src/lib/mcp-tools/event-edit.ts:69` | `KNOWN_FIELDS` 增 `'dataFlow'` |
| `src/lib/mcp-tools/event-edit.ts:440-447` | zod：`dataFlow: z.string().optional().describe('[analysis] 数据链路（多行文本树，≤40 行 / ≤3000 字）；不传表示这份结论没有链路')` |
| `src/lib/mcp-tools/event-edit.ts:430-431` | 工具描述：「导出结论」→「导出结论与数据链路」 |
| `src/lib/events/analysis-store.ts:476-500` | `ExternalAnalysisInput` 增 `dataFlow?: string` |
| `src/lib/events/analysis-store.ts:568` | `validateExternalImport({...})` 透传 `dataFlow` |
| `src/lib/events/analysis-store.ts` 草稿重建处 | `draft` 增 `...(input.dataFlow ? { dataFlow: normalized } : {})` —— **不传即不带该键**（整篇覆盖 ⇒ 清空） |
| `src/lib/events/analysis-edit.ts:349-370` | `ExternalImportPayload` / `NormalizedExternalImport` 增字段；新增 `validateExternalDataFlow`：非字符串 / 超 40 行 / 超 3000 字 → push `errors`（**严格报错，不静默截断**） |
| `docs/mcp-tools.md:23 / :38` | `ki_event_get` 描述补「数据链路」；`ki_event_edit` 参数列表补 `dataFlow` 并写明缺省语义 |

## 4. 接口设计

### 4.1 `ki_event_edit`（`action=analysis`）新增参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `dataFlow` | `string` | 否 | 多行文本树（LF 分隔），≤40 行 / ≤3000 字；**不传 = 这份结论没有链路**（`overwrite=true` 时清空原值） |

```
// Demo 入参（仅示意格式）
{ "event": "#48", "action": "analysis", "overwrite": true,
  "conclusion": "…", "chain": [ … ],
  "candidates": [ { "file": "src/a.ts", "line": 128, "why": "…" } ],
  "dataFlow": "前端打开「链路状态」页 → transfer_latest_msg\n    ▼\ntable_ids = 全部表的 set\n    ▼\n…" }
```

失败返回（既有信封）：

```json
{ "ok": false, "code": "ANALYSIS_EDIT_INVALID",
  "error": "dataFlow 共 52 行，超过上限 40 行", "errors": [ { "field": "dataFlow", "reason": "…" } ] }
```

### 4.2 补丁围栏样例（`ki-conclusion-patch`）

```
```ki-conclusion-patch
{"conclusion":"…","chain":[ … ],"dataFlow":"…","reason":"补上链路：原结论未覆盖 metadata 那一跳"}
```
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 补丁 `dataFlow` 非字符串 | 忽略该字段，其余（conclusion/chain）照常生效 | 否（静默降级） |
| 补丁 `dataFlow` 超限 | 归一截断 + 追加 `…（链路过长，已截断）` | 是（文本可见） |
| 补丁未带 `dataFlow` | 保留旧值 | 否 |
| MCP `dataFlow` 非字符串 / 超限 | 整批拒绝，`ANALYSIS_EDIT_INVALID` + 字段级 reason | 是 |
| MCP `overwrite=true` 且未带 `dataFlow` | 草稿重建后无该键（清空） | 否（UI 显示"外部上传未提供链路"） |
| MCP 与 `expectedRunId` 冲突 | 既有 `REVISION_CONFLICT`，不受本次影响 | 是 |

## 6. 影响范围

| 文件 | 类型 |
|---|---|
| `src/lib/events/analysis-ask-patch.ts` | 改（解析 + diff） |
| `src/lib/events/analysis-ask-runner.ts` | 改（上下文 + 提示词） |
| `src/lib/events/types.ts` | 改（`AskProposal`） |
| `src/lib/governance-http.ts` | 改（PATCH 白名单一行） |
| `src/lib/events/analysis-edit.ts` | 改（PATCH 归一 + 外部严格校验） |
| `src/lib/events/analysis-store.ts` | 改（外部上传透传 + 草稿重建） |
| `src/lib/mcp-tools/event-edit.ts` | 改（三表 + 描述） |
| `web/src/components/governance/event-detail/AskBlock.tsx` | 改（补丁弹框展示 `dataFlow` 一行摘要） |
| `docs/mcp-tools.md` | 改（两处文案） |

## 7. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 补丁缺省语义 | 不传 = 保留旧值 | 不传 = 清空（与外部上传一致） | 追问是「沿当前结论继续」，模型多数轮次并不想动链路；清空会让用户每次追问都丢链路 | 无 |
| 外部上传缺省语义 | 不传 = 清空 | 不传 = 保留旧值 | 整篇覆盖语义下，「保留」会让外部 AI 无法删除一条错误链路 | 无 |
| PATCH 是否收该字段 | 收（供补丁采纳），UI 不开放 | 完全不收（按需求 U8 原文） | 补丁采纳就走 PATCH，不收则补丁永远带不上链路 | 无（已回写需求 U8） |
| PATCH 与 MCP 的校验强度 | PATCH 宽松归一（截断），MCP 严格报错 | 两者都用严格 | 补丁来源是模型，超一行就整份拒绝会让补丁频繁失效；外部 AI 属可对话调用方，报错能被纠正 | 若发现 PATCH 截断被用户感知为"内容丢失"，改严格 |
| 是否支持"只改链路"局部更新 | 不做 | 新增 `action=analysis-link` 或 `allowPartial` | 与「外部上传 = 一份完整产物」冲突，且需要定义与 conclusion/chain 一致性校验，成本不成比例 | 出现真实「只想补链路」诉求时立项 |

## 8. 待定问题

| # | 问题 | 影响 | 处理 |
|---|---|---|---|
| Q1 | 补丁 diff 里 `dataFlow` 用「行数 + 首行」摘要是否够用 | 用户可能看不清改了什么 | 一期先这样；若真机反馈看不清，改为展开全文（弹框可滚） |
