# S-03 前端来源展示与确认复用

承接：R5 R6 R7 R8 R12｜依赖：S-01（`source` / `importedAt` / `sourceClient` 字段）｜被依赖：无

## 1. 术语

| 术语 | 定义 |
|---|---|
| 来源行 | 分析卡头工具区下方的「来源 + 时间」一行，二元：AI 在线分析 / MCP 上传 |
| 外部分支 | `draft.source === 'external'` 时过程面板的渲染分支（无轮次、无统计） |
| 兜底 | 对可能缺失的 `stats` / `candidates` / `unconfirmed` 取安全默认值 |

**非功能性默认假设**：单个事件的分析卡渲染在浏览器主线程完成（无虚拟滚动）；结论链最多 5 节点、候选最多 20 条，一次渲染量可控；不新增网络请求（来源数据随详情接口返回）。

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `web/src/components/governance/event-detail/EventAnalysisCard.tsx:48-70` | `chipOf` 状态机：running → 已人工定稿 → 已确认 N 处 → 已停止 → 失败 → 草稿 N 处 → 未定位到 → 未开始；**无来源维度** |
| 同文件 `:128` | 整卡渲染门槛：`!draft && confirmed.length===0 && startSignal===0` 时不渲染 |
| 同文件 `:132` `:189` | 「已人工修订」徽标判据 `editedAt !== undefined` |
| 同文件 `:279` / `:60` / `:65` | 直接读 `draft.unconfirmed.length` / `draft.candidates.length`（无兜底） |
| 同文件 `:315-325` | `draft || startSignal>0` 时挂 `AiAnalyzePanel` |
| 同文件 `:328-342` | 追问区仅在 `status === 'ready' \| 'partial'` 时挂载 |
| `web/src/components/governance/AiAnalyzePanel.tsx:280` `:605` | 直接读 `draft.stats.ms` / `stats.turns` / `stats.filesRead`（`stats` 无兜底） |
| 同文件 `:283-291` | `procTitle`：非运行非取消时落到「分析完成 · 未定位到候选位置」 |
| 同文件 `:300-308` | `primaryAction`：「确认」入口条件是 `candidates.length > 0` |
| 同文件 `:229-233` | 「确认」调用 `confirmEventAnalysis({candidateIds, expectedRunId, discardDraft})` |
| `web/src/components/governance/event-detail/ConclusionChain.tsx:186-196` | 引用胶囊需在 `confirmed` 中命中且 `snippet` 非空才可点，否则降级为不可点 span |
| `web/src/api/governanceApi.ts:333-341` `:756-765` | 事件更新（PATCH）与确认（POST confirm）客户端 |

## 3. 方案（TO-BE）

### 3.1 界面（已确认，原图内嵌）

```text
【AI 在线分析】
┌────────────────────────────────────────────────────────────┐
│ ✦ AI 分析  基于事件描述与类型，分析原因与结论  [编辑][重置分析]│
│            来源 AI 在线分析 · 更新于 2026-11-23 11:52       │ ← 新增来源行
├────────────────────────────────────────────────────────────┤
│ 过程区（照旧）· 结论卡 · 未确认点 · 已确认位置              │
└────────────────────────────────────────────────────────────┘

【MCP 上传】
┌────────────────────────────────────────────────────────────┐
│ ✦ AI 分析  基于事件描述与类型，分析原因与结论  [编辑][重置分析]│
│            [外部上传] 来源 MCP · 上传于 2026-11-23 14:02     │ ← 标识 + 来源行
├────────────────────────────────────────────────────────────┤
│ 外部结论 · 无分析过程（不显示轮次统计与「正在读取…」）       │
│ 结论卡（同一组件）· 未确认点 · 已确认位置 · [确认选中位置]   │
└────────────────────────────────────────────────────────────┘
```

变更点：

| 变更点 | 现状 | 预期 | 类型 |
|---|---|---|---|
| 卡头来源行 | 无 | 二元来源 + 时间（AI 显示更新于，外部显示上传于） | 新增 |
| 外部标识 | 无 | 淡色 chip「外部上传」，与「已人工修订」并列 | 新增 |
| 过程区文案 | 「分析完成 · 未定位到候选位置」/「正在读取事件上下文…」 | 外部来源显示「外部上传 · 无分析过程」 | 修改 |
| 轮次统计底栏 | 恒定显示「N 轮 · 读取 N 个文件」 | 外部来源隐藏 | 修改 |
| 确认入口 | 候选数 > 0 才有 | 不变；无候选时给提示「外部结论未附候选位置」 | 保持 + 兜底提示 |

### 3.2 来源行与标识

`EventAnalysisCard.tsx` 卡头工具区新增（受控于 `draft`）：

```tsx
const isExternal = draft?.source === 'external';
const sourceText = isExternal
  ? `来源 ${draft?.sourceClient ?? 'MCP'} · 上传于 ${fmtTime(draft?.importedAt)}`
  : `来源 AI 在线分析 · 更新于 ${fmtTime(draft?.editedAt ?? draft?.updatedAt)}`;
```

- `fmtTime` **复用详情页现有时间格式化函数**（不新写工具函数）；缺值显示 `—`。
- AI 来源用「更新于」而非「完成于」：`updatedAt` 在人工编辑（`PATCH /analysis`）时也会刷新，写「完成于」会与实际不符；`editedAt` 存在时优先显示它。
- 外部 chip 类名 `gov-chip gov-chip--external`（中性色，不用 AI 紫），文案固定「外部上传」。
- `sourceClient` 仅在存在且非 `'mcp'` 时展示真实值，避免与 chip 重复。

### 3.3 chip 判定顺序（关键）

`chipOf` 在**现有分支最前面**插入来源分支：

```text
1 draft.status === 'running'                       → 分析中 ◐
2 draft.source === 'external' && status !== 'failed' → 外部上传        ← 新增（前置）
3 editedAt && (failed | partial)                   → 已人工定稿
4 全候选已确认                                      → 已确认 N 处
5 errorCode === 'ANALYSIS_CANCELED'                 → 已停止
6 failed                                            → 失败
7 有候选                                            → 草稿 N 处
8 confirmed.length > 0                              → 已确认 N 处
9 有 draft                                          → 未定位到
10 其他                                             → 未开始
```

外部来源必须前置：外部草稿 `candidates` 必填，但若未来放宽或遇到异常写入，落到第 9 条会显示「未定位到」与「已有结论」矛盾；同时保留 `failed` 可见（异常数据不掩盖失败）。

### 3.4 过程面板外部分支

`AiAnalyzePanel.tsx`：

| 位置 | 改动 |
|---|---|
| `:280` `:605` | `draft?.stats?.ms ?? 0` / `draft?.stats?.turns ?? 0` / `draft?.stats?.filesRead ?? 0` |
| `:283-291` | `isExternal` 时 `procTitle = '外部上传 · 无分析过程'`（优先于「未定位到候选位置」） |
| `:530` | `draft?.unconfirmed?.length ?? 0` |
| 轮次/统计底栏 | `isExternal` 时不渲染 |
| `:300-308` | `primaryAction` 逻辑不改；`isExternal && candidates.length === 0` 时给一行说明 |

`EventAnalysisCard.tsx`：

| 位置 | 改动 |
|---|---|
| `:279` | `(draft?.unconfirmed?.length ?? 0) > 0` 才渲染未确认点区块 |
| `:60-66` | chip 内 `draft.candidates` 读取改为 `draft?.candidates ?? []` |
| `:132` `:189` | 「已人工修订」判据保持 `editedAt !== undefined`（外部上传不设该字段，天然不触发） |

### 3.5 确认与追问

- **确认**：不改 `confirmEventAnalysis` 调用。外部候选经服务端验真后落盘，`candidateIds` 与 AI 候选同构。
- **引用胶囊**：未确认前仍是不可点 span（既有行为），确认后 `confirmed[]` 命中即可点（`ConclusionChain.tsx:186-196` 零改动）。
- **追问**：挂载条件不变（`ready` / `partial`）。后端 `analysis-ask-runner.buildContext`（`:150-190`）只用 `conclusion / chain / candidates / confirmed / history / 事件描述 / 文档清单`，**不依赖 `steps`**，因此外部产物可直接追问。

### 3.6 覆盖与跨版本提示

| 场景 | 现状 | 预期 |
|---|---|---|
| 点「重新分析」且当前结论来自外部 | 弹框统称「已有待确认的分析草稿」（`AiAnalyzePanel.tsx:138-139` 按 `REVISION_CONFLICT` 触发） | 弹框按 `draft.source === 'external'` 改文案：「当前结论由外部上传（MCP），覆盖后不可恢复」，确认按钮「覆盖外部结论并重新分析」 |
| 已确认位置含上一版结论的位置 | 只显示「已确认 N 处」，看不出哪些属于旧结论 | 附一行「含 M 处来自上一版结论」；判据 `confirmed[].confirmedAt < draft.startedAt` 的条数 > 0 |

> 第二行不改变数据（沿用 `confirmDraftLocations` 的保留语义），只做可见性说明：外部重传会换 runId，旧位置仍留在 `confirmed[]` 中，不提示就会被误读为「本次结论已确认」。

## 4. 数据模型（前端镜像）

`web/src/api/governanceContract.ts:498-523` 的 `AnalysisDraftDto` 与后端逐字一致地追加三个可选字段：

```ts
/** 结论来源；缺省 = 'ai'（历史数据无该字段） */
source?: 'ai' | 'external';
/** 外部上传时间（仅 source==='external'） */
importedAt?: number;
/** 外部来源标识（仅 source==='external'） */
sourceClient?: string;
```

约束：可选性与后端一致（`source` 缺省视为 `'ai'`）；字段名不得改名（契约测试逐字段比对后端 `governance-contract.ts:520-545`）。

## 5. 影响范围

| 文件 | 改动 |
|---|---|
| `web/src/components/governance/event-detail/EventAnalysisCard.tsx` | chip 顺序、来源行、未确认点与 chip 兜底 |
| `web/src/components/governance/AiAnalyzePanel.tsx` | 统计兜底、外部 `procTitle`、隐藏统计底栏、无候选提示 |
| `web/src/components/governance/event-detail/ConclusionChain.tsx` | 不改 |
| `web/src/api/governanceContract.ts` | DTO 三字段（**由 S-01 改**，本子需求只读消费） |
| `web/src/styles/ki.css`（或治理页样式文件） | `gov-chip--external` + 来源行样式（复用 `--ki-*` token） |
| `web/test/event-analysis-source.test.mjs`（新增） | 外部/缺字段/追问三类 |

## 6. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-11 | 来源行放卡头工具区下方独立一行 | 塞进标题文案 / 逐个结论节点标注 | 标题已固定「AI 分析 基于事件描述与类型…」，塞入会改写既有文案；逐节点标注会淹没结论正文（5 节点 × 来源 = 噪音） | 需要按节点区分来源时（多来源拼接结论） |
| D-12 | chip 判定中来源前置（且保留 `failed` 可见） | 放判定末尾 | 外部草稿若候选为空或未定位，会先命中「未定位到」，与「已有结论」直接矛盾 | 无 |
| D-13 | 外部来源隐藏过程区而非显示空态 | 显示「0 轮工具调用 · 读取 0 个文件」 | 空统计会被读成「分析失败」；且「无过程」本身就是信息，用一句话说明即可 | 若外部也提供过程 steps（二期） |
| D-14 | 外部上传仍走「编辑」入口，不给独立按钮 | 新增「上传结论」页面按钮 | 用户诉求就是「完全复用」，多一个入口等于两套 UI | 出现仅上传、不查看的使用者角色 |
| D-18 | AI 来源文案用「更新于」 | 「完成于 `updatedAt`」 | `updatedAt` 在人工校正后也会变，「完成于」会与实际不符 | 若引入独立的 `finishedAt` 字段 |

## 7. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `stats` 缺失 | 按 0 渲染，不崩 | 否（静默兜底） |
| `candidates` / `unconfirmed` 缺失 | 按空数组渲染，区块隐藏 | 否 |
| `importedAt` 缺失 | 时间显示 `—` | 是（可见但可读） |
| `sourceClient` 为 `mcp` 或缺失 | 只显示「来源 MCP」 | 否 |
| 外部来源无候选位置 | 底栏给一行提示，不显示确认按钮 | 是 |
| 外部来源追问失败 | 沿用既有追问错误展示 | 是 |
| 结论链 `ref` 未确认 | 降级为不可点 span（既有，带 title 说明） | 是 |
| 外部草稿 `status=failed`（异常数据） | chip 显示「失败」而非「外部上传」，不掩盖异常 | 是 |

## 8. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| Q-3 | 来源行是否需要 hover 展示完整客户端名（`sourceClient`） | 本期直接用文本展示，不做 hover；过长由 CSS 截断 |
| Q-4 | 「编辑」按钮在外部来源下是否允许 | 允许（编辑未确认点与位置，结论仍只读），与 AI 来源一致 |
