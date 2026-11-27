# S-02 工具契约与门禁

## 1. 术语

| 术语 | 含义 |
|---|---|
| 单通道 | `ki_recall` 只有一个执行路径：模型通道。不存在 `mode` 参数 |
| 门禁三态 | 模型未配置 / 未确认外发 / 模型不支持 tools —— 任一未过即**不可用**（不降级） |
| 频控 | 每个调用方每分钟 20 次的拒绝式限流（不排队） |
| 锁定工具 | `ki_get_module_info`，工具白名单内不可取消 |

## 2. 现状（AS-IS）

| 现状 | 位置 |
|---|---|
| 工具注册与编排（含 `mode` 选择、缓存包装、并发槽） | `src/lib/mcp-tools/recall.ts` 全文 |
| 运行参数（缓存/并发/频控/超时/候选数 5 键） | `src/lib/recall/limits.ts:34` 默认值、`:47` `resolveRecallConfig` |
| 12 个错误码（含 `MODE_UNAVAILABLE`/`BUSY`/`DEFAULTS_EMPTY`） | `src/lib/recall/codes.ts` |
| 模型消耗型准入名单含 `ki_recall` | `src/lib/mcp-tools/tool-access.ts` `MODEL_CONSUMING_TOOL_NAMES` |
| 能力表登记 `knowledge.ask` | `src/lib/auth/tool-permissions.ts` |

## 3. 方案（TO-BE）

```
executeRecall(args)
 ├─ ① 入参校验（task / hints / limit）
 ├─ ② scope 必填（漏传 → 回可用库与视图清单）
 ├─ ③ 门禁三态（顺序固定：外发 → 模型 → tools）
 ├─ ④ 范围预检（不存在/无权 → 点名即报错）
 ├─ ⑤ 频控（20/min，满了 RECALL_THROTTLED + retryAfterSec）
 ├─ ⑥ runRecall（45s 硬超时；超时返回 partial 或 RECALL_TIMEOUT）
 └─ ⑦ 审计日志一行 + 装配对外形状
```

**删除项**：结果缓存（LRU/TTL/`cached`）、并发槽（`RECALL_BUSY`/`maxConcurrent`）、`mode` 参数与 `MODE_UNAVAILABLE`。

## 4. 接口设计

### 4.1 工具 schema

```ts
server.tool('ki_recall', TOOL_DESCRIPTION, {
  scope: z.union([z.string().min(1), z.array(z.string().min(1)).min(1).max(8)])
    .describe('检索范围（必填）：库名或知识视图名，可多个。不确定有哪些库时先调 ki_scope_list / ki_view_list；'
      + '不传会直接报错并返回当前 Token 可用的库与视图清单，不会自动挑库'),
  task: z.string().min(1).max(2000)
    .describe('任务画像（2-3 句）：要做什么 / 涉及哪个模块或页面 / 什么现象 / 期望什么。不是提问'),
  hints: z.array(z.string().max(200)).max(10).optional()
    .describe('强线索：文件路径 / 报错码 / 模块名 / 接口名'),
  exclude: z.array(z.string().max(300)).max(50).optional()
    .describe('已读清单："scope::group::name" 或 "group::name"；再次调用时传入，避免重复推荐'),
  limit: z.number().int().min(1).max(20).optional().describe('候选条数上限，默认 8'),
});
```

> `mode` 参数**删除**：只保留模型通道后，它没有可选项。

### 4.2 返回契约

```ts
interface RecallToolResponse {
  ok: true;
  targets: string[];                 // 实际参与的范围（视图保留视图名）
  summary: string;                   // ≤3 句整体判断
  candidates: Array<{ scope; group; name; why; evidence: 'full' | 'snippet' }>;
  uncertainties: string[];           // 判断不了的点
  nextActions: Array<{ tool: 'ki_get_module_info'; args; why }>;
  needMore: Array<{ field: 'symptom'|'errorCode'|'module'; hint: string }>;
  skipped: Array<{ name: string; reason: 'forbidden'|'missing'|'view-members-changed'|'truncated' }>;
  dropped: number;                   // 编造/失效被剔除的条数
  rounds: number;
  partial?: boolean;
  durationMs: number;
}
```

### 4.3 错误码表（12 个 `RECALL_*`，另有 `TOKEN_MODEL_FORBIDDEN` 由 tool-access 定义）

| 码 | 触发 | retryable | 文案要点 |
|---|---|---|---|
| `RECALL_TASK_INVALID` | task 空 / >2000 字 | false | 说明上限，要求压到 2-3 句 |
| `RECALL_HINTS_INVALID` | hints 超 10 条或单条 >200 字 | false | 说明只是强线索，不是材料 |
| `RECALL_SCOPE_REQUIRED` | 未传 scope | false | **同响应回可用库/视图清单**（≤20 项）+「本工具不会自动挑库」 |
| `RECALL_SCOPE_UNKNOWN` | scope 不存在 | false | 回显非法项 + `ki_scope_list` 指引 |
| `RECALL_SCOPE_FORBIDDEN` | scope 存在但无权 | false | 说明需授权，或改传有权的库 |
| `RECALL_TARGETS_EMPTY` | 全部 target 被剔除 | false | 列出每项与原因 |
| `RECALL_MODEL_UNAVAILABLE` | 未配置模型 | false | **「请改用 ki_search 自己检索」** + 去 AI 设置配模型 |
| `RECALL_DISCLOSURE_REQUIRED` | 外发未确认（`kbDisclosureAck=false`） | false | **「请改用 ki_search」** + 去设置页确认外发 |
| `RECALL_TOOLS_UNSUPPORTED` | 模型 `supportsTools=false` | false | **「请改用 ki_search」** + 说明需支持 function calling 的模型 |
| `RECALL_THROTTLED` | 每分钟超 20 次 | true | 带 `retryAfterSec` |
| `RECALL_TIMEOUT` | 45s 内无任何结论 | true | 建议补强线索或缩小 scope |
| `RECALL_INTERNAL` | 未预期异常 | true | 不泄露堆栈，指引看服务端日志 |

### 4.4 审计日志

格式不变（`[recall] {json}` 单行），字段调整：删 `cached`/`degraded`，加 `rounds`、`tools`（本次调了哪些工具，逗号分隔，≤6 个）。

### 4.5 Demo 返回

```json
{
  "ok": true,
  "targets": ["kisearch-docs"],
  "summary": "本任务涉及删除链路的向量残留，最该先读错误库那篇排查记录；另有 2 篇是同一问题的修复验证，可按需再看。",
  "candidates": [
    { "scope": "kisearch-memory", "group": "错误库", "name": "删除文档后向量残留（delete-relation 三层兜底均未命中）",
      "why": "完整记录了三层兜底的判据与实测证据，直接对应「怀疑没删干净」这一现象", "evidence": "full" }
  ],
  "uncertainties": ["映射到「向量残留」的两篇记录口径略有差异，以哪篇为准我判断不了"],
  "nextActions": [{ "tool": "ki_get_module_info", "args": { "scope": "kisearch-memory", "group": "错误库",
    "relation": "删除文档后向量残留（delete-relation 三层兜底均未命中）", "max_chars": 8000 }, "why": "…" }],
  "needMore": [],
  "skipped": [],
  "dropped": 0,
  "rounds": 3,
  "durationMs": 18400
}
```

## 5. 数据模型

```ts
export interface RecallConfig {          // config.yaml → recall（仅运维参数）
  throttlePerMinute?: number;            // 1~120，默认 20
  hardTimeoutMs?: number;                // 1000~45000，默认 45000
}
```

> 相对现状**删除** `cacheTtlSec` / `maxConcurrent` / `maxCandidates`。**候选数只由 `limit` 入参承载**（1..20），不进任何配置域 —— 配置与入参同时决定条数就是两个来源。

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 门禁未过 | 返回对应错误码 + `ki_search` 引导，**不执行任何检索** | 是 |
| 频控打满 | `RECALL_THROTTLED` + `retryAfterSec`，不排队 | 是 |
| 45s 超时且已有结论 | 返回 `ok:true` + `partial:true` | 是 |
| 45s 超时且无任何结论 | `RECALL_TIMEOUT` | 是 |
| 模型中途报错 | 重试 1 次；仍失败 → `RECALL_INTERNAL` | 是 |
| 只读 Token 调用 | **放行**（已从模型消耗型名单移除） | 否 |

## 7. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/mcp-tools/recall.ts` | 删 `mode`/缓存包装/并发槽；加门禁三态与 `runRecall` 调用 |
| `src/lib/recall/limits.ts` | 删缓存与并发槽，只留频控与超时；配置键 5 → 2 |
| `src/lib/recall/codes.ts` | 错误码表替换（删 3 加 3） |
| `src/lib/mcp-tools/tool-access.ts` | 从 `MODEL_CONSUMING_TOOL_NAMES` 移除 `ki_recall`，删专属文案 |
| `src/lib/auth/tool-permissions.ts` | `ki_recall` 能力由 `knowledge.ask` 改 `knowledge.read` |
| `src/config-schema.ts` | `recall` 段删 3 键 |
| `docs/mcp-tools.md` | 工具数仍 24，但 `ki_recall` 行重写（去 `mode`、加 summary/uncertainties） |
| `test/recall-tool.test.ts` | 重写：门禁三态、频控、无缓存、Token 放开 |

## 8. 关键决策点

| # | 决策 | 被否决 | 理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-02-1 | 门禁未过**不降级**，返回错误 + `ki_search` 引导 | 返回空清单 | 空清单会被读成"没有相关文档"，比报错更坏 | 无 |
| D-02-2 | 删 `mode` 参数 | 保留 `mode:'auto'` 兼容 | 只有一个通道时它没有语义，留着会让调用方以为还能选 | 无 |
| D-02-3 | 只读 Token 放行（移出模型消耗型名单） | 继续禁止 | 用户明确「本来就是只读」；代价是只读 Token 也能触发模型调用，已确认接受 | 出现只读 Token 滥用审计 |
| D-02-4 | 删并发槽、保留频控 | 两者都删 | 频控是唯一有效护栏（20/min 已足够拦住误调用洪峰）；并发槽在低频场景只会制造 `BUSY` 噪声 | 出现并发打满上游的场景 |
| D-02-5 | 超时上限从 20s 提到 45s | 保持 20s | 模型循环（读 3~5 篇）20s 不够 | 试点 P95 > 40s |
