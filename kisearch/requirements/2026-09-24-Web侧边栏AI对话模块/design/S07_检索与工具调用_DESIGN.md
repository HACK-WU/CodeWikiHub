---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-25
updated: 2026-09-25
version: 2
tags: [feat, integration, retrieval]
depends_on: []
author: AI
document_type: design
---

# S-07 检索与工具调用 — 设计

> 关联需求：`requirement.md` v7（§4.2 R18~R25、§5 六条硬约束、§7 N17~N23）
> 决策依据：D13（检索复用 `executeSearch`）+ **已拍板 T9/T10/T11/T12/T13**
> 本文件是 D13 反转后新增的**核心设计物**；"检索 skill"正文与工具 schema **同源维护**（见 §3.3）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| **检索工具**（`kb_search`） | 暴露给模型的 function-calling 工具；daemon 内部执行 `executeSearch`，**不经 MCP / HTTP 自调用** |
| **检索 skill** | 注入模型的系统提示片段，规定"何时用 `fulltext` / 何时用 `hybrid`"与反幻觉规则（§3.3 正文） |
| **工具调用循环** | 模型 → `tool_calls` → daemon 执行检索 → `tool` 消息回传 → 模型 → …（上限见 R21） |
| **瘦身投影** | 进上游上下文的检索结果裁剪形态（条数 / 片段长度受 R21 限制），**不等于** `SearchResult` 原始结构 |
| **来源引用**（`sources`） | 从检索结果投影出的可核对来源（group / 文档 / 行号区间 / 摘要），**唯一允许落盘**的检索产物 |
| **预检索降级** | 模型不支持工具调用时，由 daemon **代跑一次**检索并把结果作为上下文注入（T10） |

---

## 2. 现状（AS-IS，代码直读）

| 能力 | 现状 | 证据 |
|---|---|---|
| 检索实现 | `executeSearch(params)` 已是完整实现，**支持 `mode: 'hybrid' \| 'fulltext'`** | `src/search.ts:586-608` |
| 工具包装 | MCP 侧 `ki_search` 已把 `executeSearch` 包成工具（含 scope/limit/threshold/tags/timeout/include_original/mode） | `src/lib/mcp-tools/search.ts:8-53` |
| 命中定位 | `SearchHit` 含 `sourcePath` / `group` / `relation` / 行号区间 / `matchCount` / `matchCountComplete` | `src/search.ts:48-74` |
| 降级信号 | `SearchResult.degraded` / `degradedReason` 已存在（语义侧降级为 FTS-only） | `src/search.ts`（`SearchResult` 联合类型） |
| 排队约定 | **会打开/读取 zvec / local KB / relations-cache 的接口必须与同 scope 写操作共用 `OperationCoordinator`** | `src/lib/mcp-http-api.ts:318-322`（注释明确"新增带 scope 参数的只读接口必须同步加入"） |
| 越权白名单 | 带 `scope` 参数的只读接口须手工登记 | `src/lib/mcp-http-api.ts:300-310` |
| 工具调用先例 | **全仓无**（MCP 的 tool 是"对外暴露"，不是"让模型调用"） | 全仓 grep |

**结论**：检索**本身**可直接复用（`executeSearch`），本设计的全部复杂度在 **① 工具循环 ② 排队口径 ③ 结果投影与来源引用 ④ 降级路径**。

---

## 3. 方案（TO-BE）

### 3.1 文件改动

```
src/
├── lib/
│   ├── retrieval/
│   │   ├── kb-search-tool.ts     # [新增] 工具 schema + 执行器（调用 executeSearch）
│   │   ├── retrieval-skill.ts    # [新增] 检索 skill 正文（与 kb-search-tool 同源维护）
│   │   ├── projection.ts         # [新增] SearchResult → 瘦身投影 / SourceRef 投影
│   │   └── tool-loop.ts          # [新增] 工具调用循环（轮次、预算、超时、降级）
│   ├── llm-client.ts             # [修改] 支持 tools 参数与 tool_calls 解析（见 S-01 v2）
│   ├── chat-store.ts             # [修改] ChatMessage 落 sources（见 S-02 v2）
│   └── mcp-http-api.ts           # [修改] 新增 4 条路由（API-11~14）+ 白名单复核
└── search.ts                     # [不改动] 复用 executeSearch
```

**为什么不改 `src/search.ts`**：R18 硬约束"复用既有实现、不新建检索链路"。新增代码全部是**适配层**（投影 / 循环），不触碰检索内核。

### 3.2 检索工具 schema（注入模型的 `kb_search`）

```ts
/** 暴露给模型的工具定义（OpenAI function-calling 格式） */
export const KB_SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'kb_search',
    description: [
      '检索当前知识库，返回可核对的来源片段。',
      '当提问包含【确切字面片段】（引号内文字 / 报错信息 / 函数名 / 配置键 / 文件路径）时用 mode=fulltext（不调用 embedding，快且精确）；',
      '其余概念性问题用 mode=hybrid（语义+全文）。',
      '若本次未命中，必须如实说明"知识库中未找到"，不得用自身知识作答。',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '检索文本；fulltext 模式建议直接给字面片段' },
        mode: {
          type: 'string',
          enum: ['fulltext', 'hybrid'],
          description: 'fulltext=仅全文（快，不调 embedding）；hybrid=语义+全文（默认）',
        },
        limit: { type: 'integer', minimum: 1, maximum: 5, description: '返回条数上限，默认 5' },
      },
      required: ['query'],
    },
  },
};
```

**三条硬约束（与既有 `ki_search` 的差异，均有明确理由）**：

| # | 约束 | 理由 |
|---|------|------|
| 1 | **不暴露 `scope` 参数** | N23 禁止跨 scope；scope 由 daemon 从会话强制注入，**模型不可指定** |
| 2 | **不暴露 `threshold` / `tags` / `timeout` / `include_original`** | 模型无需调参；暴露即增加失控面。`limit` 上限压到 **5**（R21/T11） |
| 3 | 工具名用 `kb_search` 而非 `ki_search` | 避免与 MCP 工具同名混淆（两条链路不同入口，同名会让日志与用户都分不清） |

### 3.3 检索 skill（正文，与 §3.2 schema 同源维护）

> **注入位置**：拼接在会话 `systemPrompt` **之前**（system 消息前半段），保证规则优先于用户自定义提示词。
> **同源要求**：本节"模式选择规则"的措辞必须与 §3.2 的 `description` / `mode` 枚举保持一致；任一侧修改必须同步另一侧（**这是本需求唯一的"双份同源"点，实现时须在代码注释里互相指向**）。

```text
【检索知识库】
回答用户问题前，你应当先检索知识库。可用工具：kb_search(query, mode, limit)。

判断使用哪种检索模式：
· 提问中包含【确切字面片段】→ mode=fulltext
  —— 例如：引号内的原句、报错信息、函数名、配置键、文件路径、命令名。
  —— 特征：用户已经知道要找的"字面"，只是想定位它在哪。（此模式不产生 embedding 调用，更快）
· 其余情况（概念性、原理性、"怎么用"、"为什么"）→ mode=hybrid（语义+全文）。

反幻觉规则（硬性）：
1. 若检索结果为空，必须明确回答「知识库中未找到相关内容」，不得用你自己的知识冒充知识库内容。
2. 若检索过程不可用（工具报错 / 未检索），必须明确说明「本次未检索」，不得静默按普通对话作答。
3. 回答中引用知识库内容时，须与返回片段一致，不得改写、扩写或推测原文未写的细节。
4. 检索次数有限（最多 3 次）；若 3 次仍无相关结果，直接如实说明，不要继续尝试。
```

### 3.4 工具调用循环

```ts
// src/lib/retrieval/tool-loop.ts
export interface ToolLoopBudget {
  maxRounds: number;      // 默认 3（R21 / T11）
  maxHitsPerCall: number; // 默认 5（T11）
  snippetChars: number;   // 默认 300：进上游上下文时单片段截断长度
  totalBudgetMs: number;  // 默认 300000：整体超时（D13 后重估，见 §3.7）
}
```

**流程**（伪代码，实现须严格按此顺序）：

```text
1. 构造 messages：system(检索skill + 会话systemPrompt) + 历史(仅 content) + 本轮 user
2. round = 0
3. loop:
     resp = llm-client.streamChat(messages, { tools: [KB_SEARCH_TOOL], signal })
     ├─ 收到 content 流 → 直接转发为 {type:'content'} 事件（边收边发）
     ├─ 收到 reasoning 流 → 转发为 {type:'reasoning'}（不落盘，见 S-05）
     └─ 回合结束：
         ├─ 有 tool_calls 且 round < maxRounds →
         │    · 发 {type:'tool_start', name, query, mode}
         │    · 执行 kb_search（★ 入 OperationCoordinator，见 §3.6）
         │    · 发 {type:'tool_end', hits, durationMs}
         │    · 投影为瘦身结果（§3.5）→ 追加 assistant(tool_calls) + tool(result) 消息
         │    · round += 1 → 继续 loop
         └─ 无 tool_calls（或 round 已达上限）→ 结束，输出最终 content
4. 落盘：assistant 消息 = { content, sources?, usage?, timing?, finishReason }
```

**四条硬约束**：

| # | 约束 | 理由 |
|---|------|------|
| 1 | **`reasoning` 绝不进 `messages`** | N12 / §5 硬约束；实测单次思考可达 2635 字，误回传同时放大成本与延迟并诱导模型复述 |
| 2 | **`sources` 只落来源引用，原始检索结果不落盘** | N22 / §5；与 reasoning 同款"结构性隔离" |
| 3 | **达 `maxRounds` 后强制作答** | N19：不得让用户无限等待；不发错误，直接进入"无 tool_calls"分支 |
| 4 | **`tool` 消息内容必须是瘦身投影** | 原始结果直接回传会显著放大上下文（一次 fulltext 可能返回整篇原文） |

**实现细节（前置门① 实测所得，必须照此实现 —— 详见 `gate1-verification.md` §2）**：

| # | 细节 | 不这样做的后果 |
|---|------|--------------|
| a | **一次响应的 N 个 `tool_calls` 必须回 N 条 `tool` 消息**（各自 `tool_call_id` 一一对应） | 漏一个 → 模型认为"工具没答完" → 继续请求 → **表现为循环不收敛**（易误判为模型问题）。实测首轮返回 **2 个** tool_calls |
| b | **单次往返不够，必须有循环** | 实测模型在已有检索结果时仍连续 3 轮请求工具（换 query 再试） |
| c | ★ **「强制作答」= 拿掉 `tools` 参数再调一次**，不是截断 | 截断会得到**空终答**（实测：达上限前每轮 `content` 均为 0 字，模型还没产出就结束）。拿掉 `tools` 后模型只能作答 → `finish_reason=stop` |

> **T11（轮次上限 3）的实测评估**：本次**最简场景**（单轮提问 + 1 个 mock 工具）就用满了 3 轮，且第 3 轮靠强制收敛。
> 结论：**3 轮刚好够用、没有余量**。建议保持默认 3 + 实现细节 c，并在 `done` 带 `warning:'tool-rounds-exhausted'` 时由前端提供「继续检索」手动放行——**比提高默认上限更省成本**（详见 `gate1-verification.md` §3）。

### 3.5 结果投影（两种，用途不同，**不可混用**）

```ts
// src/lib/retrieval/projection.ts

/** ① 进上游上下文的瘦身投影（工具返回值，给模型看） */
export interface ToolProjection {
  hits: Array<{
    group: string;
    doc: string;        // = SearchHit.relation（文档名）
    lines: string;      // "12-18"（1-based，含端）
    snippet: string;    // ≤ snippetChars（默认 300）
  }>;
  total: number;        // 命中总数（SearchResult.total ?? hits.length）
  note?: string;        // 如 "仅返回前 5 条" / "语义检索降级为全文"
}

/** ② 落盘的来源引用（给人看，可点击回原文） */
export interface SourceRef {
  group: string;
  doc: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;      // ≤200 字，供刷新后仍可展示引用摘要
}
```

**为什么 `SourceRef` 要落 `snippet`**：会话刷新后 UI 仍要展示"引用摘要"；若不落盘则需重新检索（多一次 embedding 调用 + 结果可能已变）。`snippet` 是**已展示过的内容**，落盘不违反 N22（N22 禁的是"原始工具结果"整体落盘）。

**投影规则**：

| 项 | 规则 |
|---|---|
| 条数 | 取 `SearchResult.results` 前 `maxHitsPerCall` 条 |
| 排序 | 保持 `executeSearch` 返回顺序（不自作排序） |
| 无行号 | `lineStart`/`lineEnd` 缺失时（chunk fallback 无法映射）→ `lines` 记 `"?"`，`SourceRef` 仍落（可定位到文档级） |
| 降级透传 | `SearchResult.degraded === true` → `note` 追加"语义检索降级为全文"，并发 `{type:'degraded'}` 事件（不让用户误以为用了语义检索） |
| 去重 | 同 `(group, doc, lineStart)` 去重（多 tag 可能产生重复命中） |

### 3.6 ★ 排队口径（**修正 `api/INDEX.md` §1 的旧结论**）

`api/INDEX.md` 写着"**不经过 `OperationCoordinator`**"，其理由（"chat 只读写 chatDir，不触碰 zvec/KB"）**在 D13 之前成立，D13 之后不再成立**。精确口径如下：

| 环节 | 是否入队 | 理由 |
|------|:---:|------|
| `/api/chat/*` 的 CRUD 路由（API-01~07、11~14） | ❌ **不入队** | 只读写 `chatDir`，不触碰 zvec / local KB / relations-cache |
| 生成请求本身（API-08 的流式长连接） | ❌ **不入队** | 12s 级长流；入队会阻塞同 scope 的检索与导入请求 |
| **生成期间执行的检索工具调用** | ✅ **入队**（scope 维度） | **它读 zvec / local KB** —— 正是 `src/lib/mcp-http-api.ts:318-322` 约定的适用对象；不入队会绕过同 scope 单写者调度，读到 import / delete / rebuild 的中间态 |

**实现要点**：入队点在 `kb-search-tool.ts` 的执行器内（而不是 HTTP 路由层），因为它可能被同一进程的预检索降级路径（§3.7）复用。

```ts
// kb-search-tool.ts 执行器骨架
async function runKbSearch(scope: string, args: KbSearchArgs): Promise<SearchResult> {
  return operationCoordinator.run(scope, () =>        // ★ 入队（scope 维度，只读）
    executeSearch({ scope, query: args.query, mode: args.mode ?? 'hybrid',
                    limit: Math.min(args.limit ?? 5, 5) }));
}
```

### 3.7 降级路径（T10 已拍板：预检索一次 + 明示）

**触发条件**（任一）：

- `config.llm.supportsTools === false`（用户手填）
- 上游首次返回工具不支持类错误（如 400 `tools is not supported`）
- 工具循环连续 2 轮执行检索均抛错（检索不可用）

**行为**：

```text
1. daemon 代跑一次检索：query = 用户本轮提问原文，mode = hybrid，limit = 5
2. 结果按 §3.5 投影后，作为【上下文】注入（拼在本轮 user 消息之前，标注来源为"自动检索"）
3. 发 {type:'degraded', reason:'tools-unsupported'|'retrieval-unavailable', message:'本次未使用工具检索'}
4. UI 在气泡上标注「本次未使用工具检索」+ 仍展示 sources
5. 检索本身失败 → 不发 degraded 的"预检索"分支，改发 reason:'retrieval-unavailable'，
   并在回答前置一句「本次未检索」（由 skill 反幻觉规则 2 保证模型不编造）
```

**与 N17 的关系**：N17 要求"检索不可用须明示且不得编造"。本节的 3/5 两条分别覆盖"降级但仍检索到"与"完全没检索"。

### 3.8 隐私确认（T12 已拍板：首次使用显式确认一次）

```ts
// config.llm 新增
kbDisclosureAck?: boolean;   // 默认 false：用户是否已确认"知识库内容将发送至外部模型"
```

| 状态 | 行为 |
|------|------|
| `kbDisclosureAck !== true` | `GET /api/chat/config` 返回 `retrievalEnabled: false` + `ackRequired: true`；面板**阻塞发送**并展示确认弹层（明示"含检索到的知识库片段"） |
| 用户确认 | `POST /api/chat/config/ack`（API-13）→ 写回配置 `kbDisclosureAck: true` → 后续不再询问 |
| 已确认 | 正常走检索问答 |

**为什么阻塞而不是"先不检索"**：本面板的差异化价值就是检索问答（§1 背景）；"不检索的对话"等于退回被否决的 D1 方案，且会让用户以为检索已生效而实际没有 —— 属**静默降级**，与 N17 冲突。

### 3.9 接口变更汇总（D13 后）

| 编号 | 方法 | 路径 | 变更 | 来源需求 |
|---|---|---|---|---|
| API-01 | GET | `/api/chat/config` | **改**：+`supportsTools`、+`retrievalEnabled`、+`ackRequired`、+`maxToolRounds` | R22 / T10 / T12 |
| API-08 | POST | `/api/chat/conversations/:id/messages` | **改**：+4 类 SSE 事件（`tool_start` / `tool_end` / `sources` / `degraded`）；`done` 事件带 `sources` | R18~R21 |
| **API-11** | POST | `/api/chat/conversations/:id/regenerate` | **新增**：重新生成（不新增 user 消息） | R23 / D14 |
| **API-12** | PATCH | `/api/chat/conversations/:id/messages/:msgId` | **新增**：编辑 user 消息并原子截断其后消息 → 重新生成 | R24 / D14 |
| **API-13** | POST | `/api/chat/config/ack` | **新增**：隐私确认（T12） | N18 / T12 |
| **API-14** | DELETE | `/api/chat/conversations?scope=` | **新增**：清空该 scope 全部会话（N8 要求"须有接口落点，当前 api 缺失"） | N8 |

**API-12 的原子性（N21）**：编辑 + 截断 + 重新生成必须是**同一把会话锁内**的连续动作；与被编辑会话进行中的生成互斥（进行中则返回 409 `CHAT_BUSY` 或先 abort）。

---

## 4. 关键决策点

| 决策 | 采用 | 被否决方案与理由 | 重新评估触发条件 |
|---|---|---|---|
| 检索入口 | `executeSearch` **in-process** | 绕 HTTP `/api/search` 或 MCP 自调用：多一次鉴权 + 配置快照 + 排队，且引入自调用死锁风险 | 检索需要跨进程隔离时 |
| 工具暴露面 | 3 参数（query/mode/limit） | 全量暴露 `ki_search` 参数：模型调参不可控，`include_original` 会把整篇原文灌进上下文 | 出现模型必须调 threshold 的场景 |
| 结果处理 | 双层投影（模型看瘦身 / 人看引用） | 单一结构：要么上下文爆炸，要么 UI 无法展示引用摘要 | 无 |
| 降级策略 | 预检索一次 + 明示（T10） | ① fail-loud 直接禁用：可用面过窄，用户配置多数模型支持 tools；② 静默不检索：违反 N17 | 预检索命中率明显低于工具检索时 |
| skill 注入位置 | system 消息**前半段**（优先于用户自定义 prompt） | 注入到 user 消息：模型可能忽略；注入到后半段：用户 prompt 可覆盖反幻觉规则 | 无 |
| 轮次上限 | 3（T11） | 无上限：工具循环失控（N19）；1 轮：无法"先定位再追问" | 实测常见问题需 >3 轮时 |

---

## 5. 异常处理（对应 N17~N23）

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 检索无命中（`results` 为空） | 不报错；模型按反幻觉规则 1 回答"知识库中未找到"；`sources` 为空数组 | 是（回答文案） |
| 检索不可用（向量服务 / Collection 异常、`executeSearch` 返回 `ok:false`） | 发 `{type:'degraded', reason:'retrieval-unavailable'}`；回答前置"本次未检索"；**禁止编造** | 是 |
| 语义侧降级（`SearchResult.degraded=true`，已降为 FTS-only） | `note` 标注"语义检索降级为全文"，并发 `degraded` 事件（reason:`semantic-degraded`） | 是 |
| 模型不支持工具调用 | 走 §3.7 预检索降级；UI 标注「本次未使用工具检索」 | 是 |
| 工具循环超轮次（达 3 轮仍要调工具） | **强制作答**：不再执行检索，按已有结果回答；`done` 带 `warning:'tool-rounds-exhausted'` | 是（弱提示） |
| 工具循环整体超时（>300s） | 中止上游，已生成部分按"中止"落盘（`aborted:true`）；发 `error`（`LLM_TIMEOUT`） | 是 |
| 检索超出 scope | **不可能发生**：scope 由 daemon 注入，模型无此参数；若代码层面出现跨 scope 调用 → 抛错并记 daemon 日志（内部错误） | 否（审计日志） |
| 来源引用的文档已被删除 | `SourceRef` 仍落盘（历史事实）；点击打开时由既有 `/api/asset` / `doc/list` 返回 404，UI 提示"原文已不可用" | 是 |
| 编辑消息时该会话正在生成（N21） | 409 或先 abort 再执行（实现时定，须在 API-12 契约中明确） | 是 |
| 重新生成时原回答正在生成中 | 同上（互斥） | 是 |

---

## 6. 影响范围

| 文件 | 改动 | 回归点 |
|---|---|---|
| `src/lib/retrieval/*`（4 个新文件） | 新增 | — |
| `src/lib/llm-client.ts` | 支持 `tools` 参数与 `tool_calls` 解析 | **不得影响无 tools 的普通流**（现有对话路径） |
| `src/lib/chat-store.ts` | `ChatMessage` + `sources` | 旧会话文件无 `sources` 字段须正常读取（可选字段） |
| `src/lib/mcp-http-api.ts` | +4 路由（API-11~14） | 现有 13 条路由不变；白名单复核 |
| `src/lib/config.ts` / `config-schema.ts` | `llm.supportsTools` / `kbDisclosureAck` | 旧配置无这两字段 → 走默认（`supportsTools` 默认 **true**，见 T10 建议口径；`kbDisclosureAck` 默认 false） |
| `src/search.ts` | **不改动** | 复用；若发现需改动 → 说明 R18 的"复用"前提不成立，须回设计 |
| **回归风险点** | MCP 侧 `ki_search` 行为不得受影响（两条链路共用 `executeSearch`） | `npm run test:all` 中检索相关用例 |

---

## 7. 待定问题

| 问题 | 影响 | 处理时机 |
|---|---|---|
| `snippetChars` / `sources[].snippet` 的具体截断长度（暂定 300 / 200） | 上下文成本与引用可读性 | 前置门验证时用真实数据校准 |
| `supportsTools` 默认值（T10 建议默认 **true**） | 影响首次体验与降级触发率 | 已按 T10 拍板取"默认开"，实测发现误判率高时改默认 false |
| 预检索降级的注入形式（拼在 user 前 / 独立 system 段） | 影响模型对"这是检索结果"的识别率 | 前置门验证时对比 |
| 是否需要在 UI 展示"已检索 N 次 / 命中 M 条" | 透明度 vs 界面噪音 | 交互设计阶段定（非阻塞） |

---

## 8. 不在范围内

- 检索以外的工具（写入 / 删除 / 导入类）—— §3.2 明确排除
- 多步自主规划 Agent 循环（只做"检索→作答"，不做任务分解）
- 跨 scope 检索（N23 禁止）
- 纯向量模式（`mode=semantic`）—— T9 已拍板取 `hybrid`，零改动复用
- 检索结果落盘为可搜索资产（会话内来源引用不等于知识库内容）
- 重排（rerank）与查询改写
