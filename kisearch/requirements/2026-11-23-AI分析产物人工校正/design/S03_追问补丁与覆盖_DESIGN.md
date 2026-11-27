# S03 追问补丁与覆盖

- 父文档：`DESIGN.md` ｜ 需求：`REQ-20261123-001` v4（R-18~R-23、R-19 模板校验、§2.2-10 不得自动生效）
- **依赖 S01**（`PATCH /analysis` 写入口、`expectedRunId` 闸门、错误码）与 **S02**（卡面 / `gov-modal` 家族 / `onUpdated` 回流）
- 目标：追问能产出**可覆盖结论的补丁**，服务端按类型模板校验，前端弹框由用户确认后才覆盖。

---

## 1. 术语

| 术语 | 含义 |
|---|---|
| 补丁（proposal） | 一次追问末端产出的结构化建议：`conclusion` + `chain` + 一句话理由 |
| 模板校验 | 按事件类型的**视角骨架**校验槽位（fault/perf 5 槽；change/generic 4 槽） |
| 不一致 | 补丁与当前草稿逐字段归一后**确实不同**（由程序判定，不由模型自陈） |
| 覆盖 | 用户确认后走 `PATCH /analysis` 整块替换 `conclusion` + `chain` |

## 2. 现状分析（AS-IS）

| 事实 | 位置 |
|---|---|
| 追问只读：全文无 `updateDraftIfMatch` / `writeAnalysisDoc`，只 `appendAskTurn` 落 `.ask.json` | `src/lib/events/analysis-ask-runner.ts` |
| 系统提示为**代码常量**，含「不超过 400 字」「不要输出代码块」 | `analysis-ask-runner.ts` 的 `systemContent` |
| 流式事件：`delta` / `step` / `thinking` / `done` / `error`；前端 `else if` 链**忽略未知类型** | `governance-http.ts` 的 ask/stream 分支、`web/src/api/governanceApi.ts` |
| 回答硬上限 4000（截断） | `ASK_ANSWER_MAX_CHARS` |
| 骨架权威只在后端 `PROFILES[*].skeleton`；前端是镜像常量 | `src/lib/events/analysis-view.ts`、`web/src/lib/analysisView.ts` |
| 现有校验**不校验骨架**（只槽位白名单 + 上限） | `src/lib/events/analysis-edit.ts` |
| 写入口已具备：整块提交 + `runId` 闸门 + 严格校验 + `editedAt` | `analysis-store.saveDraftEdits`（2026-11-23 落地） |

## 3. 方案设计（TO-BE）

### 3.1 数据结构与契约

`AnalysisAskTurn` 增两字段（`src/lib/events/types.ts`）：

```ts
/** 本轮追问末端给出的结论补丁（缺省 = 模型没给 / 解析失败 / 与当前无差异） */
proposal?: {
  conclusion: string | null;
  chain: ConclusionNode[];
  /** 模型给的一句话理由（展示用，不参与校验） */
  reason: string;
  at: number;
};
/** 用户是否采纳了本轮补丁（审计用） */
proposalAccepted?: boolean;
```

契约三处同步：`src/lib/governance-contract.ts` 的 `AnalysisAskTurnDto`、`web/src/api/governanceContract.ts` 副本（`web/src/api/governanceApi.ts` 复用后端契约类型投影）。

### 3.2 补丁产出（R-18）

**提示词**（改 `analysis-ask-runner.ts` 的 `systemContent`，按 H10 不再写字数软限制）：

```text
查证后用中文简洁作答；不改文件、不执行系统命令、不调用编排类工具。
若你的回答意味着**分析结论应当修改**，在正文之后另起一行，输出一个 fenced 块：
```ki-conclusion-patch
{"conclusion":"…","chain":[{"kind":"symptom","text":"…","ref":"src/a.ts:42"}],"reason":"一句话说明改了什么"}
```
要求：kind 只能用该事件类型模板里的槽位；节点 ≤5；每节点 ≤200 字；不改变结论时**不要**输出该块。
```

**解析**（新增 `src/lib/events/analysis-ask-patch.ts`）：

```ts
export interface ProposalParseResult {
  patch?: { conclusion: string | null; chain: ConclusionNode[]; reason: string };
  /** 正文（已剥离 fenced 块）—— 前端展示用，保证用户看不到 JSON */
  answer: string;
  /** 解析失败原因（进 step 记录，不报错） */
  error?: string;
}
export function extractProposal(rawAnswer: string): ProposalParseResult;
```

- 用与 `analysis-runner.parseJsonSummary` **同一种**围栏剥离 + `JSON.parse` 兜底；
- **失败即降级**（N13）：`patch` 缺失、`answer` 原样返回，追问正常完成；
- 正文里若出现多处围栏，只认**最后一个** `ki-conclusion-patch`。

### 3.3 模板校验（R-19）

新增 `validateProposal(patch, view)`（放在 `analysis-ask-patch.ts`，**不放进 `analysis-edit.ts`** —— 后者被 PATCH 共用，见 H5）：

| 规则 | 违规处理 |
|---|---|
| `kind` 必须落在 `viewProfile(view).skeleton` 内 | 整份判不合规，理由写明"该类型没有『根本原因』模板" |
| 节点数 ≤5、每节点 ≤200 字 | 同上 |
| `ref` 形状合法（`path:line`，行号 ≥1） | 同上 |
| `conclusion` ≤ 4000 字（H10 统一口径） | 同上 |

**只校验、不裁剪**：与 `validateDraftEdit` 一致，绝不静默删节点（N20）。

### 3.4 不一致判定（R-20）

`diffProposal(current, patch)` → `{ changed: boolean; blocks: Array<{ block: 'conclusion'|'chain'; kind: '改'|'增'|'删'; before?: string; after?: string }> }`

- 比较前统一 `oneLine` 归一（与写盘口径一致，避免"只差空格"也弹框）；
- `conclusion` 逐字比；`chain` 按**顺序 + kind + text** 比（`ref`/`branches` 变化也算改）；
- `changed === false` → 不下发 `proposal` 事件、不落盘（N16）。

### 3.5 流式下发

`POST /analysis/ask/stream` 在 `done` **之前**多发一个事件（向后兼容：旧前端忽略未知类型）：

```json
{ "type": "proposal", "valid": true, "diff": { "changed": true, "blocks": [ … ] }, "patch": { … } }
```

- `valid:false` 时也发（前端只读展示原因，不给确认按钮，N14）；
- 解析失败 / 无差异 → **不发**该事件。

### 3.6 前端

| 组件 | 变动 | 职责 |
|---|---|---|
| `AskBlock.tsx` | 修改 | 接收 `proposal` 事件；有补丁且 `valid` 时弹框；确认后调 `saveEventAnalysisEdits` |
| `AnalysisProposalModal.tsx` | **新增** | 差异渲染（③ 块级 diff）+ 校验结论 + 两个动作 |
| `EventAnalysisCard.tsx` | 修改 | 把 `onUpdated` 传给 `AskBlock`（覆盖成功后刷新卡面） |

确认覆盖的请求体（只用 `conclusion` + `chain`，其余块不动）：

```ts
saveEventAnalysisEdits(scope, eventId, {
  expectedRunId: draft.runId,
  conclusion: patch.conclusion,
  chain: patch.chain,
})
```

> **v5 定位（H12）**：结论一律不可人工编辑，因此**本条链路是 `conclusion` / `chain` 的唯一写路径**（S01 的接口只对它开放）。D2 的"骨架校验不加进 PATCH"随此更无争议。

- 成功 → `onUpdated({ draft: res.draft, confirmed: res.confirmed })`，卡面出现「已人工修订」；
- 409 → 弹框内提示"这次分析已被新一轮分析替换，请刷新"，**不关闭弹框、不丢差异**（N15）；
- 只有 `knowledge.ask` → 确认按钮禁用 + 说明需要写权限（N18）。

### 3.7 界面（待确认）

```
┌ AI 建议更新分析结论 ───────────────────────────── ✕ ┐
│ 这轮追问的结论与当前不一致（⑨），AI 建议改为：          │
│ ┌ ⑩ 差异 ──────────────────────────────────────────┐ │
│ │ 一句话总结  - 本次定位是两个前端缺陷…               │ │
│ │            + 本次定位是三处缺陷，含网关配置缺失…     │ │
│ │ 影响面      + 缺少 3301001 错误码兜底                │ │
│ └────────────────────────────────────────────────────┘ │
│ ⑪ 校验：✅ 符合「bug 排查」模板（5 槽 / 4 节点 / 文本合规）│
│                          [保留当前] [⑬ 确认覆盖]        │
└──────────────────────────────────────────────────────────┘
```

## 4. 关键决策点

| # | 决策 | 选定 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|---|
| D1 | 补丁载体 | 回答末尾 fenced 块，服务端解析后发 `proposal` 事件 | ①只发正文让前端解析 ②追问后二次调用模型 | ①前端要懂模型话术，解析逻辑会两端各写一份 ②多一次调用、多一次延迟与费用 | 实测解析成功率 <60%（改为二次调用 + 强 schema） |
| D2 | 校验放哪 | 新模块 `analysis-ask-patch.ts`，**不进 PATCH** | 复用 `validateDraftEdit` 加骨架参数 | 会让**人工编辑**也被骨架锁死（需求类事件加不了「根本原因」），破坏已上线行为 | 产品明确要求人工编辑也受骨架限制 |
| D3 | 不一致谁判 | 程序 diff | 让模型自陈"结论是否变了" | 模型自陈不稳定，会出现"每次都说不一致"或"真变了却说没变" | 无 |
| D4 | 失败处理 | 补丁缺失/不合规 → 降级纯文本，`valid:false` 只读展示 | 追问报错 / 自动重试到合法 | 追问本身不能因补丁失败；无限重试会拖长等待 | 出现"补丁几乎总是不合规"（说明提示词要重写） |
| D5 | 覆盖后标识 | 置 `editedAt`（算人工修订） | 新增 `acceptedFrom:'ask'` 字段 | 多一个字段要多改契约三处且卡面文案还得区分；用户确认过就算人工修订 | 需要区分"人写"与"AI 建议人确认"的统计 |

## 5. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 模型没出补丁 / JSON 坏 | 降级纯文本，追问正常返回，`step` 记一条 `proposal-skip` | 否 |
| 补丁不合规（骨架/超限/ref） | `proposal` 事件带 `valid:false` + 原因；前端只读展示 | 是（只读） |
| 补丁与当前无差异 | 不发事件、不落盘 | 否 |
| 流式中断 / 超时 | 已解析的补丁不落（原子） | 是（追问失败提示，沿用现有） |
| 确认时草稿被替换 | 409 `REVISION_CONFLICT`，弹框保留 | 是 |
| 确认时运行中 | 409 `ANALYSIS_ALREADY_RUNNING` | 是 |
| 只读账号 | 能看差异，确认禁用 | 是 |
| 补丁 `conclusion` 超 4000 | 判不合规（不截断） | 是（只读） |

## 6. 影响范围

```text
src/lib/events/
├── analysis-ask-patch.ts     [新增] 提取 / 模板校验 / diff
├── analysis-ask-runner.ts    [修改] 系统提示加补丁说明；末轮解析；落 proposal
├── types.ts                  [修改] AnalysisAskTurn.proposal / proposalAccepted
src/lib/
├── governance-http.ts        [修改] ask/stream 增发 proposal 事件
├── governance-contract.ts    [修改] AnalysisAskTurnDto 加两字段
web/src/
├── api/governanceContract.ts [修改] 副本同步
├── api/governanceApi.ts      [修改] AskProgressEvent 增 'proposal'
├── components/governance/event-detail/AskBlock.tsx           [修改] 收事件 → 弹框 → 覆盖
├── components/governance/event-detail/AnalysisProposalModal.tsx [新增]
├── components/governance/event-detail/EventAnalysisCard.tsx   [修改] 透传 onUpdated
└── styles/governance.css     [修改] 差异块样式（.gov-pdiff*）
test/
├── events/analysis-ask-patch.test.ts   [新增] 提取 / 骨架校验 / diff
├── events/analysis-ask.test.ts         [修改] 补丁落盘与采纳标记
└── governance-ask-route.test.ts（若存在同类）[修改] proposal 事件
```

**验收断言**：追问产出补丁后前端收到 `proposal` 事件；不合规补丁 `valid:false` 且无确认按钮；确认后 `GET /analysis` 与追问上下文同时为新值；`editedAt` 出现；409 时弹框保留差异。

## 6.5 真机实测记录（2026-11-23，批 5 落地时）

| 轮次 | 结果 | 结论 |
|---|---|---|
| 第 1 轮 | `proposal.valid=false`，原因「`root_cause` 不在该事件类型的模板里（可用槽位：symptom / cause / root / impact / fix）」 | 模型会**自造槽位名**。降级链路正确（正文已剥块、不落库、记一条 step），但白跑一轮 |
| 修正 | 提示词改为**按事件类型注入合法 kind 清单**（`symptom（现象）/ cause（直接原因）/ …`，与校验同源 `patchView`） | 「提示说能写、校验说不能」的错位被消除 |
| 第 2 轮 | `valid=true`；`kinds = symptom,cause,cause,impact,fix`；diff 6 块（1 改结论 + 3 改节点 + 3 增节点）；正文无围栏；补丁落库 | 链路通 |
| 覆盖 | `PATCH /analysis`（带 `acceptedProposalTurnId`）→ 200、`editedAt` 置位、chain 5 节点；`.ask.json` 的 `proposalAccepted=true` | R-22 / R-23 已验证 |

**教训（改提示词前先看这条）**：补丁提示里**必须列出该事件类型的合法 kind**，只说"用模板里的槽位"不够 —— 模型没有骨架上下文，会按常识造 `root_cause` / `fix_suggestion`。

### 第 3 次修正：解析必须容忍真实形状（用户实测暴露）

| 项 | 内容 |
|---|---|
| 现象 | 答案里直接出现 `ki-conclusion-patch{"conclusion":…}`，**没有弹框** |
| 根因 | 旧解析用成对围栏正则（要求标记后换行），而模型给的是**标记与 JSON 同一行**、甚至**不带围栏**；不匹配 → 既不解析也不剥离 |
| 修正 | 改成「大小写不敏感定位标记 → 从 `{` 做**字符串感知的括号配对** → 删掉整段补丁区」；**无论解析成败都剥离**，用户不再看到 JSON |
| 覆盖 | 22 例：标准围栏 / 同行 / 无围栏 / 闭合围栏被截断 / 围栏后还有解释 / JSON 字符串含 `{}` / 全大写标记 / 缺 JSON |
| 复验 | 真机强制出补丁：`valid=true`、6 个差异块、答案无标记无裸 JSON、补丁落库 |

> **设计守恒**：解析的正交性是「**永远不把补丁 JSON 泄漏给用户**」—— 解析成功就校验 + 弹框，失败就只留正文并记一条 step。这两条不能因为"模型格式不规范"放弃任何一条。

## 7. 待定问题

| 编号 | 事项 | 状态 |
|---|---|---|
| H1 | 补丁范围（仅结论 / 含未确认点） | 待拍板（推荐仅结论） |
| H2 | 补丁载体 | 待拍板（本文件按"fenced 块 + 服务端解析"设计，D1） |
| H3 | 提示词归属（代码常量 vs 新增 `ask` 配置域） | 待拍板（推荐先用常量） |
| H4 | 覆盖后标识（`editedAt` vs `acceptedFrom`） | 待拍板（本文件按 `editedAt` 设计，D5） |
| H5 | 骨架校验是否也约束人工编辑 | 待拍板（本文件按"仅 AI 补丁"设计，D2） |
| Q-A | 弹框差异粒度（块级 / 全文对照） | 交 UI 阶段 |
