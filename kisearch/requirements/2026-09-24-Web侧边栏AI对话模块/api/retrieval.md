---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-25
updated: 2026-09-25
version: 1
tags: [feat, integration, retrieval]
depends_on: []
author: AI
document_type: design
---

# API-11~14 + API-08 事件扩展：检索与生成控制

> 关联需求：R18~R25 / N17~N23｜设计输入：`design/S07_检索与工具调用_DESIGN.md`
> 基础路径：`/api/chat`｜响应外壳与错误载体沿用 `INDEX.md`（`{ok:true,...}` / `{ok:false,error,code,details?}`）

---

## 1. API-08 SSE 事件扩展（★ 契约变更）

### 1.1 事件表 v2

| type | 载荷 | 时机 |
|---|---|---|
| `meta` | `{conversationId, messageId, model, discardedCount?}` | 建立连接后首帧（`discardedCount` 仅 API-12 用） |
| **`tool_start`** | `{name, query, mode}` | 模型发起工具调用、**执行前** |
| **`tool_end`** | `{hits, durationMs, error?}` | 工具执行完成（**抛错也必须发**，带 `error`） |
| **`sources`** | `{sources: SourceRef[]}` | 生成结束前，最多一次 |
| **`degraded`** | `{reason, message}` | 触发降级时；`reason ∈ {tools-unsupported, retrieval-unavailable, semantic-degraded}` |
| `reasoning` | `{text}` | 思考增量（**仅转发，不落盘**） |
| `content` | `{text}` | 回答增量 |
| `usage` | `{promptTokens, completionTokens, reasoningTokens?}` | 上游返回 usage |
| `done` | `{messageId, finishReason, sources, warning?}` | 正常结束（`warning` 如 `tool-rounds-exhausted`） |
| `aborted` | `{messageId}` | 用户中止 |
| `error` | `{code, error, retryable?}` | 失败 |

### 1.2 事件顺序约束（**测试须覆盖**）

```text
正常（含检索）：
  meta → tool_start → tool_end → [tool_start → tool_end]* → reasoning* → content* → sources → usage → done

纯对话（模型未调用工具，合法）：
  meta → reasoning* → content* → usage → done

降级（模型不支持工具）：
  meta → degraded → reasoning* → content* → sources? → usage → done
```

| 约束 | 说明 |
|---|---|
| **`tool_start` / `tool_end` 必须成对** | 工具抛错也要发 `tool_end`（带 `error`），否则前端会永久停留在"正在检索…" |
| `sources` 至多一次且在 `done` 前 | 无来源时**不发**（而非发空数组） |
| `degraded` 至多一次 | 三类 reason 互斥，取最先触发者 |
| `content` 不强制在 `tool_end` 后 | 模型可能直接作答而不检索（合法路径） |
| 事件顺序由 daemon 保证 | 前端按到达顺序渲染，**不做重排** |

### 1.3 `SourceRef`（落盘 + 事件共用同一形状）

```ts
interface SourceRef {
  group: string;
  doc: string;        // = SearchHit.relation（文档名）
  lineStart: number;  // 1-based；chunk fallback 无法映射时为 0
  lineEnd: number;    // 含端；无法映射时为 0
  snippet: string;    // ≤200 字，供刷新后展示引用摘要
}
```

> `lineStart === 0` 表示"只能定位到文档级"，UI 显示文档名而不显示行号（**不得显示 "0-0"**）。

---

## 2. API-11 重新生成

| 项 | 值 |
|---|---|
| 方法 / 路径 | `POST /api/chat/conversations/:id/regenerate` |
| 请求体 | **无**（`{}` 可接受） |
| 响应 | **SSE 流**（事件同 API-08） |
| 幂等性 | 非幂等（每次产生新回答） |
| 前置 | `kbDisclosureAck === true`（否则 403 `DISCLOSURE_REQUIRED`）；会话非生成中（否则 409 `CONVERSATION_GENERATING`） |

**语义（关键）**：

```text
1. 定位会话中最后一条 user 消息（记其 index = U）
2. 删除 U 之后的所有 assistant 消息（**替换语义，不保留旧版本**）
3. 不新增 user 消息（R23 硬要求）
4. 从 U 开始重新生成 → 落盘新的 assistant 消息
```

| 边界 | 行为 |
|---|---|
| 会话无任何消息 | 400 `CONVERSATION_INVALID`（无可重生成的对象） |
| 最后一条是 user（首次生成中途失败） | 等价于"继续生成"，不报错 |
| `messageCount` 变化 | **不变**（删 1 条 assistant + 加 1 条 assistant） |

**错误码**：`CONVERSATION_NOT_FOUND` / `CONVERSATION_INVALID` / `CONVERSATION_GENERATING` / `DISCLOSURE_REQUIRED` / `CHAT_DISABLED` / `LLM_UPSTREAM_ERROR`

---

## 3. API-12 编辑 user 消息并重发

| 项 | 值 |
|---|---|
| 方法 / 路径 | `PATCH /api/chat/conversations/:id/messages/:msgId` |
| 请求体 | `{ text: string }`（1~20000 字，非空白） |
| 响应 | **SSE 流**（事件同 API-08；`meta.discardedCount` = 被截断的消息数） |
| 幂等性 | 非幂等（触发重新生成） |
| 前置 | 同 API-11 |

**语义（N21 原子截断，必须与 S-02 §9.3 的伪代码一致）**：

```text
withConvLock(convId, () => {
  if (msgId 不属于该会话)              → 404 MESSAGE_NOT_FOUND
  if (msgId 指向 assistant 消息)        → 400 MESSAGE_INVALID
  discarded = messages.length - (indexOf(msgId) + 1)
  messages = messages.slice(0, indexOf(msgId) + 1)   // 物理截断其后全部
  messages[last].content = text                        // 替换为编辑后文本
  seq += 1; writeJson(...)                             // 一次落盘
})          // ← 锁在此结束
→ 锁外开始生成（沿用"生成期间不持锁"）
```

| 边界 | 行为 |
|---|---|
| `msgId` 之后无消息 | `discardedCount: 0`，等价于"重新生成"，不报错 |
| 编辑后文本与原文本相同 | 仍执行（用户可能只是想重试） |

**错误码**：`CONVERSATION_NOT_FOUND` / `MESSAGE_NOT_FOUND` / `MESSAGE_INVALID` / `CONVERSATION_GENERATING` / `DISCLOSURE_REQUIRED` / `CHAT_WRITE_FAILED`

---

## 4. API-13 隐私确认（T12）

| 项 | 值 |
|---|---|
| 方法 / 路径 | `POST /api/chat/config/ack` |
| 请求体 | `{ ack: true }` |
| 响应 | `{ ok: true, kbDisclosureAck: true }` |
| 幂等性 | **幂等**（重复确认结果一致） |
| 鉴权 | 不需要 scope 参数 → **不登记越权白名单** |

**语义**：写回 `config.llm.kbDisclosureAck = true`（持久化到主配置文件）。

| 边界 | 行为 |
|---|---|
| `ack !== true` | 400 `API_ERROR`（不接受"取消确认"——撤销入口在配置文件，不在 UI） |
| 配置文件不可写 | 500 `CHAT_WRITE_FAILED`；**前端不得据此放行**（未持久化 = 下次仍会问） |

---

## 5. API-14 清空该 scope 全部会话（N8 补落点）

| 项 | 值 |
|---|---|
| 方法 / 路径 | `DELETE /api/chat/conversations?scope={scope}` |
| 请求体 | 无 |
| 响应 | `{ ok: true, deleted: number }` |
| 幂等性 | **幂等**（无会话时 `deleted: 0`，仍 200） |
| 鉴权 | 带 `scope` 参数 → **须登记越权白名单**（同 API-02/04） |

**语义**：

```text
1. 校验 scope 合法（validateScope）且在 token 授权集合内（否则 403 SCOPE_FORBIDDEN）
2. 删除 {chatDir}/{scope}/ 下全部 *.json
3. 删除 {chatDir}/{scope}/assets/ 下全部本地图片
4. ★ 绝不触碰 kb/{scope}/（知识库资产不属于会话，见 N15）
5. 返回实际删除的会话文件数
```

| 边界 | 行为 |
|---|---|
| 目录不存在 | `deleted: 0`，200（幂等） |
| 部分文件删除失败（权限） | 500 `CHAT_WRITE_FAILED`，**已删的保留**（不假装事务）；响应体带 `error` 说明 |
| 会话正在生成中 | **允许**（删除优先；进行中的生成在下次落盘时发现会话已消失 → 按 S-02 §3.3 的"会话被删"路径丢弃回答） |

---

## 6. 与既有文档的关系

| 文档 | 关系 |
|---|---|
| `INDEX.md` §1 | 本文件是其中"OperationCoordinator 分层口径"与"接口数量 14"的**契约落地** |
| `messages.md`（API-08） | 本文件 §1 是它的**事件扩展**；API-08 的请求/响应外壳不变 |
| `config.md`（API-01） | 需新增 `supportsTools` / `retrievalEnabled` / `ackRequired` / `maxToolRounds` 四字段（见 S07 §3.9） |
| `design/S07` | 本文件是其 §3.9 的契约级展开；**SSOT 关系：行为语义以 S07 为准，字段与错误码以此处为准** |
