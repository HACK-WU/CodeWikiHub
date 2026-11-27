# S-04 流式展示与记录

## 术语

- **事件通道 `onEvent`**：追问 runner 新增回调，用于把工具调用进度推给前端（区别于 `onDelta` 只推最终答案文本）。

## 现状（AS-IS）

- `AskBlock.tsx`：卡头文案"只基于本次分析结果回答，不会重新读仓库"；pending 占位"正在基于本次分析结果作答…"；流式 `delta` 逐段填 answer；turn 列表渲染 question/answer。
- `governance-http.ts::/analysis/ask/stream`：`onDelta: (text) => send({type:'delta', text})`，收尾 `send({type:'done', turn})`。
- `analysis-ask-store`：`{eventId}.ask.json`，turn 形状 `{id, question, answer, runId, at, truncated?, usage, context}`。

## 方案（TO-BE）

### 改动 1：卡头文案与占位（界面文案，无布局/结构变更）

- 卡头 hint：`只基于本次分析结果回答，不会重新读仓库` → `可调用只读工具重新核查（源码 / 知识库）`。
- pending 占位：`正在基于本次分析结果作答…` → `正在核查证据并作答…`。
- 说明：纯文案替换，区块排列、显隐、断点均不变 —— 按 `ui-to-ascii`「界面确认闸门」属"改值类豁免"，不出 ASCII 图。

### 改动 2：工具进度事件（追加字段，旧前端忽略）

- runner `onEvent(e)` 推两类事件，SSE 层 `send(e)` 转发：
  - `{type:'tool', name, label}`：工具开始执行时推一次。
  - `{type:'thinking', text}`：模型 reasoning 增量（取消硬预算后思考可能几十秒无 delta，**必须**有此事件避免前端静止；只推不落盘，对齐分析主链路 liveThinking 的"给人看"口径但更轻）。
- `AskBlock` 的 stream 解析：
  - 识别 `type:'tool'`，在 pending 气泡上方显示轻量进度行："正在查证据：读取文档 / 检索源码…"（并发去重，只显示最近一条）。
  - 识别 `type:'thinking'`，在 pending 气泡内以弱色斜体显示最近一段思考（限长 500 字滚动覆盖，不落盘）；另有 `tool` 事件时也可只显示"核查中…"常驻提示，二者取其一由实施期定。
  - `onEvent` 转发必须沿用现有 `seqRef + eventId` 双重校验（H-13）：用户切换事件后晚到的 tool/thinking 事件一律丢弃。
- 旧 daemon 不发这些事件、旧前端不识别 → 均静默忽略，无破坏。

### 改动 3：turn 追加可选 `toolCalls`

```ts
interface AnalysisAskTurn {
  // ...既有字段不变
  toolCalls?: Array<{ name: string; at: number }>; // 本次追问调用过的工具名（去重计数），仅审计/回看
}
```

- 落盘与 GET 返回原样透出；前端可选在 answer 下方显示"本次查证：3 次工具调用"（弱色小字）。
- 不落工具响应正文（避免 ask.json 膨胀 + 敏感内容二次外发）。

## Interface 设计（SSE 追加事件）

```ts
// 新增事件（既有 delta/done 不变）
{ type: 'tool'; name: string; label: string }
{ type: 'thinking'; text: string }   // 思考增量，只推不落盘

// 完成事件 turn 形状（追加可选字段）
{
  "ok": true, "type": "done",
  "turn": {
    "id": "ask_mwxxx_...", "question": "...", "answer": "...",
    "runId": "run_...", "at": 1795..., 
    "toolCalls": [{ "name": "ki_get_module_info", "at": 1795... }, ...],
    "usage": { "promptTokens": 0, "completionTokens": 0 },
    "context": { "conclusionChars": 0, "candidatesUsed": 0, "confirmedUsed": 0, "historyUsed": 0 }
  }
}
```

## 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| SSE 通道不支持 tool 事件 | 前端只认 delta/done，进度行不显示，答案照常 | 否（优雅降级） |
| toolCalls 字段缺失（旧记录） | 前端不显示查证行 | 否 |
| 流中断一字未收 | 回退普通 POST（沿用现有逻辑） | 否 |

## 关键决策点

| 决策 | 采纳 | 被否方案 | 否决理由 |
|---|---|---|---|
| 工具进度是否落盘 | 仅落工具名，不落响应正文 | 全量落盘 | ask.json 有 200 条/512KB 双上限；正文会撑爆且二次外发 |
| 卡头是否改布局 | 只改文案 | 新增状态徽标/按钮 | 属改值类，避免不必要的界面确认闸门 |

## 影响范围

`src/lib/events/analysis-ask-runner.ts`（onEvent 回调 + toolCalls 记账）、`src/lib/governance-http.ts`（SSE 转发 tool 事件）、`src/lib/events/types.ts`（AnalysisAskTurn 加可选字段）、`web/src/components/governance/event-detail/AskBlock.tsx`（文案 + tool 事件解析 + 进度行）、`web/src/api/governanceApi.ts`（DTO 类型追加）、`web/src/api/chatContract.ts`（若 SSE 类型集中定义则同步）。
