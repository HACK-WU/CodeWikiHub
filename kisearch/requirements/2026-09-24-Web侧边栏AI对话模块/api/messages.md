---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-24
updated: 2026-09-24
version: 1
tags: [feat, integration]
depends_on: []
author: AI
document_type: design
---

# 对话 API（SSE 流式）

> 所属需求：REQ-20260924-001｜基础路径：`/api/chat`｜错误码见 [INDEX.md §3](INDEX.md#3-错误码定义)

## API-08：发送消息（SSE 流式响应）

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 / 路径 | POST `/api/chat/conversations/:id/messages` |
| 认证 | Bearer Token（启用鉴权且非回环时） |
| 幂等 | **否**（每次调用写入一条 user 消息；重试会重复写入 → 前端重试前须确认服务端是否已接收） |
| 响应类型 | `text/event-stream; charset=utf-8`（**非** JSON 外壳） |
| 越权白名单 | 不适用（非 GET） |
| 超时 | 首块 30s（`firstByteTimeoutMs`）/ 整体 180s（`requestTimeoutMs`），均来自 `config.llm` |

### Request Body

```ts
interface SendMessageRequest {
  text: string;   // 1~20000 字，去首尾空白后不得为空
}
```

### 响应：SSE 事件协议

事件负载统一为 `data: {"type": ...}`（**不使用 SSE 的 `event:` 字段**，前端按 `data.type` 分派）。

| type | 载荷 | 说明 | 是否落盘 |
|---|---|---|---|
| `meta` | `{ model, ttfbMs }` | 上游首块到达（**服务端口径**：含上游耗时，不含前端渲染） | 否 |
| `meta` | `{ firstContentMs }` | 首个 `content` 到达 | 否 |
| `reasoning` | `{ text }` | 思考内容增量（**仅转发**） | **否**（D7） |
| `content` | `{ text }` | 答案内容增量 | 是（累积到 assistant 消息） |
| `usage` | `{ promptTokens, completionTokens, reasoningTokens? }` | 上游用量（`stream_options.include_usage`） | 是 |
| `done` | `{ messageId, timing, finishReason, truncated?, warning? }` | 正常结束 | 是 |
| `aborted` | `{ timing }` | 客户端中止（已生成内容按 `aborted:true` 落盘） | 条件（见下） |
| `error` | `{ code, message, retryable }` | 失败（发生在流已建立之后） | 否 |

**字段细则**：

- `timing = { ttfbMs: number | null; firstContentMs: number | null; totalMs: number }`
- `truncated: true` 表示上游 `finish_reason === 'length'`（回答被长度截断）
- `warning: 'conversation-too-long'` 表示会话消息数已超过 500 条
- `error.retryable`：`LLM_TIMEOUT` / `LLM_RATE_LIMITED` / `LLM_UPSTREAM_ERROR(5xx)` 为 `true`；`CHAT_DISABLED` / 参数类为 `false`

### 落盘规则（关键，与 D7/质疑意见 2 对齐）

| 情形 | 落盘行为 |
|---|---|
| 正常完成 | 追加 user 消息（请求开始前）+ assistant 消息（含 `content`、`timing`、`usage`、`finishReason`）；**不写 reasoning** |
| 客户端中止且 `content` 非空 | assistant 消息入库，`aborted: true`、`finishReason: 'aborted'` |
| **客户端中止且 `content` 为空** | **不写入 assistant 消息**（避免空消息污染会话与列表预览），`seq` 不递增 |
| 生成期间会话被删除 | 丢弃本次回答，`aborted`/`error` 事件带 `code: 'conversation-gone'` |
| 上游失败（未产生任何 content） | 不写入 assistant 消息；user 消息已落盘（用户可重试） |

### 错误响应

**流建立前**（返回 JSON 外壳）：

| HTTP | code | 触发条件 |
|:---:|---|---|
| 400 | `MESSAGE_INVALID` | `text` 为空/仅空白/超 20000 字 |
| 403 | `SCOPE_FORBIDDEN` | 会话所属 scope 不在授权集合 |
| 404 | `CONVERSATION_NOT_FOUND` | id 不存在 |
| 429 | `CHAT_BUSY` | 进行中的生成数达上限（若启用） |
| 503 | `CHAT_DISABLED` | `config.llm` 未就绪（**前置拦截，不发起上游请求**） |

**流建立后**（以 `error` 事件下发，HTTP 状态已为 200）：

| code | retryable | 触发条件 |
|---|:---:|---|
| `LLM_TIMEOUT` | 是 | 首块或整体超时 |
| `LLM_RATE_LIMITED` | 是 | 上游 429 |
| `LLM_UPSTREAM_ERROR` | 是/否 | 上游 5xx（是）/ 上游 401/403 或返回非 SSE（否） |
| `CHAT_WRITE_FAILED` | 是 | 落盘失败 |
| `conversation-gone` | 否 | 生成期间会话被删除 |

### Demo 请求示例

```bash
curl -N -X POST http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p/messages \
  -H 'Content-Type: application/json' \
  -d '{"text":"向量检索是怎么回事？"}'
```

### Demo 响应示例（实测格式）

```text
data: {"type":"meta","model":"qwen3.8-flash","ttfbMs":783}

data: {"type":"reasoning","text":"用户"}
data: {"type":"reasoning","text":"问的是向量检索"}

data: {"type":"meta","firstContentMs":1209}
data: {"type":"content","text":"简单说："}
data: {"type":"content","text":"把文本变成向量后按距离找近邻。"}

data: {"type":"usage","promptTokens":67,"completionTokens":48,"reasoningTokens":24}
data: {"type":"done","messageId":"m2","timing":{"ttfbMs":783,"firstContentMs":1209,"totalMs":1678},"finishReason":"stop"}
```

中止路径：

```text
data: {"type":"reasoning","text":"需要先确认用户意图……"}
data: {"type":"aborted","timing":{"ttfbMs":469,"firstContentMs":null,"totalMs":3200}}
```

失败路径：

```text
data: {"type":"error","code":"LLM_TIMEOUT","message":"上游在 30s 内未返回首块","retryable":true}
```

### 关键代码设计

#### 主流程（顺序与锁边界）

```ts
// src/lib/mcp-http-api.ts → handleSendMessage
async function handleSendMessage(req, res, conv, text) {
  if (!resolveLlmStatus(cfg, configPath).enabled)
    throw new ApiError(503, 'CHAT_DISABLED', '未配置模型，请在 llm 段填写配置');       // 前置拦截

  // ① 落 user 消息（锁内 RMW，锁随函数返回即释放）
  await appendMessage(conv.id, { id: `m${conv.seq + 1}`, role: 'user', content: text, at: new Date().toISOString() },
    { title: conv.messageCount === 0 ? text.slice(0, 24) : undefined });               // 首条消息回填标题

  // ② 建立 SSE 响应（此后错误只能以事件下发）
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const ac = new AbortController();
  req.on('close', () => ac.abort());                                                   // 客户端断开 → 中止上游

  let content = '', reasoning = '';
  let ttfb: number | null = null, firstContent: number | null = null;
  const t0 = Date.now();

  try {
    for await (const ev of streamChat(buildUpstreamMessages(conv), { signal: ac.signal })) {
      // buildUpstreamMessages 只取 { role, content } —— 结构性保证 reasoning 不回传
      if (ev.type === 'reasoning') { reasoning += ev.text; send({ type: 'reasoning', text: ev.text }); }
      else if (ev.type === 'content') {
        if (firstContent === null) { firstContent = Date.now() - t0; send({ type: 'meta', firstContentMs: firstContent }); }
        content += ev.text; send({ type: 'content', text: ev.text });
      }
      else if (ev.type === 'usage') { usage = ev.usage; send({ type: 'usage', ...ev.usage }); }
      else if (ev.type === 'first-chunk') { ttfb = Date.now() - t0; send({ type: 'meta', model: ev.model, ttfbMs: ttfb }); }
    }
  } catch (err) {
    if (!ac.signal.aborted) return sendError(send, err);
  }

  const timing = { ttfbMs: ttfb, firstContentMs: firstContent, totalMs: Date.now() - t0 };

  // ③ 落 assistant 消息：空内容不落盘
  if (content) {
    try {
      const updated = await appendMessage(conv.id, { id: `m${conv.seq + 1}`, role: 'assistant', content,
        at: new Date().toISOString(), aborted: ac.signal.aborted, finishReason: ac.signal.aborted ? 'aborted' : finish,
        timing, usage });
      send({ type: 'done', messageId: updated.messages.at(-1)!.id, timing, finishReason: finish });
    } catch (e) {
      send({ type: 'error', code: 'CHAT_WRITE_FAILED', message: '会话写入失败', retryable: true });
    }
  } else {
    send(ac.signal.aborted ? { type: 'aborted', timing } : { type: 'done', messageId: null, timing, finishReason: finish });
  }
  res.end();
}
```

#### 上游消息构造（reasoning 隔离的结构性保证）

```ts
function buildUpstreamMessages(conv: ConversationFile) {
  const msgs = [];
  if (conv.systemPrompt.trim()) msgs.push({ role: 'system', content: conv.systemPrompt });
  // 只映射 role + content；ConversationFile 中不存在 reasoning 字段，故不可能误传
  for (const m of conv.messages) msgs.push({ role: m.role, content: m.content });
  return msgs;
}
```

#### 为什么这样设计

1. **user 消息先落盘**：即使用户立刻关闭页面或上游不可用，提问内容也不会丢；代价是"上游失败后重试会重复写入 user 消息"，因此前端重试前须先确认服务端是否已接收（`GET .../:id` 对比末条消息）
2. **锁只覆盖单次 RMW**：生成期间不持锁，否则 12s 长流会阻塞同会话的其他请求（含"停止"后的重试）
3. **`content` 为空不落盘**：reasoning 模型常在思考阶段消耗绝大部分预算，若强行落盘会产生空气泡；前端本地提示「已中止，本次无输出」
4. **错误分层**：流建立前用 HTTP 状态（用户能看到明确原因），建立后用 `error` 事件（HTTP 已 200，无法改状态码）
5. **中止后前端须重拉**：本地累积内容与服务端落盘可能存在尾部差异，前端在 `aborted` 后 `invalidateQueries` 以服务端为准（见 `design/S03` §3.3）

#### 前端消费要点（供实现参考）

- 用 `fetch` + `resp.body.getReader()` 逐块读取并按 `\n\n` 分帧；`AbortController.abort()` 中止
- 渲染需节流（≥100ms 或 rAF 合并），`done` 后全量渲染（`design/S03` §3.3）
- `reasoning` 文本放组件内存 `Map<messageId, string>`，**不得写入消息对象或 react-query 缓存**（`design/S05` §3.3）
