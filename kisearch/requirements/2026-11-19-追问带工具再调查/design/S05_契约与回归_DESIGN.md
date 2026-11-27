# S-05 契约、影响范围与回归

## 术语

- **对外契约**：`/analysis/ask`（POST/GET/DELETE）、`/analysis/ask/stream`（SSE）的 URL、方法、既有字段。
- **内部契约**：`AnalysisToolEntry` 工厂的可见性、ask-limiter 的导出形态。

## 现状（AS-IS）

- 对外：URL 与字段见 `governance-http.ts::776-864`；turn 形状见 `types.ts::AnalysisAskTurn`。
- 内部：`buildKbReadToolEntries` 是 `analysis-runner.ts` 模块私有；`ask-limiter.ts` 导出 `acquireAskSlot` / `releaseAskSlot` / `askInFlight` / `resetAskLimiterForTest`（模块级单例）。

## 方案（TO-BE）

### 接口设计（对外契约，只追加不改既有）

**`POST /api/governance/events/:id/analysis/ask/stream`**（SSE）
- 请求 body：`{ scope: string; question: string; runId?: string }`
- 响应事件流：`{type:'delta', text:string}` ｜ `{type:'tool', name:string, label:string}`（新）｜ `{type:'thinking', text:string}`（新，只推不落盘）｜ `{type:'done', turn:AnalysisAskTurn}` ｜ `{type:'error', code:string, message:string}`
- 异常：非 200 返回 JSON；流内 error 事件抛错（沿用 `governanceApi.ts:644-647`）
- 兼容性：`governanceApi.ts:639-647` 只分派 delta/done/error，未知 type 静默忽略 → 旧前端不受影响

**`GET /api/governance/events/:id/analysis/ask?scope=&runId=`**
- 响应：`{ ok:true, turns:AnalysisAskTurn[], total:number, truncated:boolean, activeRunId:string|null }`（turn 新增可选 `toolCalls`）

**`POST /api/governance/events/:id/analysis/ask`**
- 请求 body：`{ scope, question, runId? }`；响应 `{ ok:true, scope, eventId, turn }`

**`DELETE /api/governance/events/:id/analysis/ask`**
- 请求 body：`{ scope }`；响应 `{ ok:true, scope, eventId, cleared }`

**Demo（done 事件，仅示意形状）**

```json
{ "type":"done", "turn":{
  "id":"ask_mwx_abc123","question":"那篇参考文档怎么看？",
  "answer":"文档强调 selectEvent 是单一入口…","runId":"run_mwxxx_1a2b",
  "at":1795,"toolCalls":[{"name":"ki_get_module_info","at":1795}],
  "usage":{"promptTokens":0,"completionTokens":0},
  "context":{"conclusionChars":0,"candidatesUsed":0,"confirmedUsed":0,"historyUsed":0}
}}
```

`runId` 冲突校验（409 REVISION_CONFLICT）不变。

### 内部契约变更（需影响评估）

| 变更 | 调用方 | 处理 |
|---|---|---|
| `buildKbReadToolEntries` 由私有 → export | 仅追问新增引用 | 无破坏；export 不改签名 |
| `ask-limiter.ts` 模块级单例 → `createAskLimiter()` 工厂 + 默认实例 | `ki_ask`（ask-runner）、`analysis-ask-runner`、测试 `resetAskLimiterForTest` | **保持默认导出 API 签名不变**（`acquireAskSlot` 等委托给默认实例），`ki_ask` 零改动；测试可继续用现有 reset |
| 新增 2 个错误码 | governance-errors 表 + status 映射 + 前端文案兜底 | 按现有 error-code 规范补齐 |

### 文件级影响清单

```
src/lib/events/analysis-ask-runner.ts       [修改] 工具循环 + 上下文 + onEvent
src/lib/events/analysis-runner.ts           [修改] export buildKbReadToolEntries / DSML 兜底提示
src/lib/events/types.ts                     [修改] AnalysisAskTurn 加 toolCalls?
src/lib/chat/ask/ask-contract.ts            [修改] ASK_TOOL_MAX_ROUNDS 常量
src/lib/chat/ask/ask-limiter.ts             [修改] 工厂化 + 追问独立实例
src/lib/governance-errors.ts + 错误码表     [修改] 2 个新码
src/lib/governance-http.ts                  [修改] SSE 转发 tool 事件
web/src/components/governance/event-detail/AskBlock.tsx  [修改] 文案 + tool 事件 + 查证行
web/src/api/governanceApi.ts / chatContract.ts            [修改] DTO 类型追加
test/（新增）analysis-ask-tools.test.ts      [新增] 工具循环闸门/轮次/onEvent/toolCalls 断言
```

## 回归策略

| 层 | 用例 | 通过判据 |
|---|---|---|
| 单元 | 工具白名单过滤、轮次上限、达上限强制作答、错误码 status、ask-limiter 双实例隔离 | 新测试全绿 |
| 既有 | `test/` 下 ask 相关（ask-limiter.test / mcp-ask-tool.test / governance-refs-route 等） | 无新增失败 |
| 前端 | `web` 构建 + 现有 1276/1300+ 测试 | 全绿 |
| 真机（需 daemon 重启） | 对 `evt_mwmzvoon_7xd1fu` 重发追问"那篇参考文档怎么看"，观察是否调 `ki_get_module_info` + 答案引用文档 | SSE 出 tool 事件、turn 有 toolCalls |

## 关键决策点

| 决策 | 采纳 | 被否方案 | 否决理由 |
|---|---|---|---|
| ask-limiter 重构方式 | 工厂化 + 默认实例保持 API | 复制一份 limiter 代码 | 复制会漂移；工厂化对 ki_ask 零改动 |
| 契约演进 | 只追加字段/事件 | 新开 `/analysis/ask-v2` | 追加即可满足，新端点增加维护面 |

## 待定问题

1. `targetDir` 未配置时追问只留 KB 工具——是否要在卡头提示"当前未配置源码目录，仅可查知识库"？（UI 文案，实施时定）
2. 追问的 `toolCalls` 审计行是否默认展开——建议默认一行弱色，不展开（实施时定）
3. 本次新需求未挂 REQ-ID：是否需要在实施前补建 REQ 并 `req update` 注册本文档？（请用户拍板）
