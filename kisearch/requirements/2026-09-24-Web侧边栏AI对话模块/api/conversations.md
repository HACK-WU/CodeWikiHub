---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-24
updated: 2026-09-24
version: 1
tags: [feat]
depends_on: []
author: AI
document_type: design
---

# 会话 API

> 所属需求：REQ-20260924-001｜基础路径：`/api/chat`｜错误码见 [INDEX.md §3](INDEX.md#3-错误码定义)

## 模块级约定

| 项 | 值 |
|---|---|
| 认证 / 权限 | **全部接口统一**：Bearer Token（仅当启用鉴权且来源非回环）；按目标 `scope`（或按 `:id` 所属 scope）校验 token 授权，越权 403。API-04~07 的简表省略此两列，规则同本行 |
| 存储 | `{chatDir}/{scope}/{convId}.json`（独立目录，不写入 `kb/`） |
| 会话 id | `c-{base36(Date.now())}-{rand4}`，全局唯一；同一 id 只应存在于一个 scope 目录 |
| `:id` 查找 | 仅在 **token 授权 scope 集合**内遍历；命中后复核该会话 `scope` 属于授权范围，否则 403（不返回 404，防状态码探测） |
| 数据模型 | 见 `design/S02` §3.2（`ConversationFile`；**不含 `reasoning` 字段**） |
| 并发 | 写操作经 `chat-store` 会话级 mutex 串行化（`design/S02` §3.3） |

## API-02：查询会话列表

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 | GET |
| 路径 | `/api/chat/conversations` |
| 认证 | Bearer Token（启用鉴权且非回环时） |
| 权限 | 目标 `scope` 属于 token 授权集合 |
| 幂等 | 是 |
| 越权白名单 | **必须登记**（`src/lib/mcp-http-api.ts:300-310`） |

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 默认 | 说明 |
|---|---|:---:|:---:|---|---|
| `scope` | query | string | 否 | `default` | 目标 scope；启用鉴权时须在授权集合内 |
| `archived` | query | `0` \| `1` | 否 | `0` | `0`=最近视图，`1`=已归档视图 |
| `limit` | query | integer | 否 | 50 | 1~200 |
| `cursor` | query | string | 否 | — | `{updatedAt}__{id}`，取上一页末条 |

### 响应

```ts
interface ConversationListOk {
  ok: true;
  scope: string;
  items: {
    id: string;
    title: string;
    archived: boolean;
    archivedAt: string | null;
    updatedAt: string;            // ISO 8601
    messageCount: number;
    lastMessagePreview: string;   // 末条消息前 60 字
    corrupted: boolean;           // 文件损坏时为 true（title 为「（损坏）」）
  }[];
  total: number;                  // 当前视图下总条数（不含性能敏感的全文统计）
  nextCursor: string | null;
}
```

### 错误响应

| HTTP | code | 触发条件 |
|:---:|---|---|
| 400 | `SCOPE_INVALID` | `scope` 名非法 |
| 401 | `UNAUTHORIZED` | 鉴权失败 |
| 403 | `SCOPE_FORBIDDEN` | 目标 scope 不在授权集合 |

### Demo 请求 / 响应

```bash
curl -s "http://127.0.0.1:7423/api/chat/conversations?scope=kisearch&limit=2"
```

```json
{
  "ok": true,
  "scope": "kisearch",
  "items": [
    {
      "id": "c-mf3k1a-9x2p",
      "title": "向量检索是怎么回事",
      "archived": false,
      "archivedAt": null,
      "updatedAt": "2026-09-24T16:40:12.000Z",
      "messageCount": 4,
      "lastMessagePreview": "简单说：把文本变成向量后按距离找近邻……",
      "corrupted": false
    },
    {
      "id": "c-mf3j8c-2b7q",
      "title": "（损坏）",
      "archived": false,
      "archivedAt": null,
      "updatedAt": "2026-09-23T09:12:00.000Z",
      "messageCount": 0,
      "lastMessagePreview": "",
      "corrupted": true
    }
  ],
  "total": 7,
  "nextCursor": "2026-09-24T16:40:12.000Z__c-mf3k1a-9x2p"
}
```

## API-03：新建会话

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 | POST |
| 路径 | `/api/chat/conversations` |
| 幂等 | **否**（每次创建新会话） |
| 越权白名单 | 不适用（非 GET） |

### Request Body

```ts
interface CreateConversationRequest {
  scope: string;          // 必填，须通过 validateScope
  title?: string;         // 可选，1~48 字；缺省为「新会话」，首条消息落盘时按内容前 24 字回填
  systemPrompt?: string;  // 可选，≤4000 字；缺省取 config.llm.defaultSystemPrompt
}
```

### 响应（201）

```ts
interface CreateConversationOk {
  ok: true;
  conv: { id: string; scope: string; title: string; systemPrompt: string; createdAt: string; updatedAt: string };
}
```

### 错误响应

| HTTP | code | 触发条件 |
|:---:|---|---|
| 400 | `SCOPE_INVALID` | `scope` 非法 |
| 400 | `CONVERSATION_INVALID` | `title`/`systemPrompt` 超长（附 `details`） |
| 403 | `SCOPE_FORBIDDEN` | 目标 scope 不在授权集合 |
| 500 | `CHAT_WRITE_FAILED` | 目录创建或落盘失败 |

### Demo

```bash
curl -s -X POST http://127.0.0.1:7423/api/chat/conversations \
  -H 'Content-Type: application/json' \
  -d '{"scope":"kisearch","title":"向量检索是怎么回事","systemPrompt":"回答控制在 3 句内。"}'
```

```json
{
  "ok": true,
  "conv": {
    "id": "c-mf3k1a-9x2p",
    "scope": "kisearch",
    "title": "向量检索是怎么回事",
    "systemPrompt": "回答控制在 3 句内。",
    "createdAt": "2026-09-24T16:38:00.000Z",
    "updatedAt": "2026-09-24T16:38:00.000Z"
  }
}
```

## API-04：查询会话详情

| 项目 | 值 |
|---|---|
| 方法 / 路径 | GET `/api/chat/conversations/:id` |
| 幂等 | 是 |
| 越权白名单 | **必须登记** |
| 响应 | `{ ok: true, conv: ConversationFile }`（`messages[]` **无 `reasoning` 字段**） |

| HTTP | code | 触发条件 |
|:---:|---|---|
| 403 | `SCOPE_FORBIDDEN` | 会话所属 scope 不在授权集合（含"他 scope 下存在但无权访问"） |
| 404 | `CONVERSATION_NOT_FOUND` | 授权范围内查不到该 id |
| 500 | `API_ERROR` | 文件损坏且无法降级（列表路径降级，详情路径直接报错并给出文件路径） |

```bash
curl -s http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p
```

```json
{
  "ok": true,
  "conv": {
    "version": 1,
    "id": "c-mf3k1a-9x2p",
    "scope": "kisearch",
    "title": "向量检索是怎么回事",
    "systemPrompt": "回答控制在 3 句内。",
    "archived": false,
    "archivedAt": null,
    "createdAt": "2026-09-24T16:38:00.000Z",
    "updatedAt": "2026-09-24T16:40:12.000Z",
    "seq": 4,
    "messageCount": 4,
    "lastMessagePreview": "简单说：把文本变成向量后按距离找近邻……",
    "messages": [
      { "id": "m1", "role": "user", "content": "向量检索是怎么回事？", "at": "2026-09-24T16:38:20.000Z" },
      {
        "id": "m2", "role": "assistant", "content": "简单说：把文本变成向量后按距离找近邻。",
        "at": "2026-09-24T16:38:33.000Z", "finishReason": "stop",
        "timing": { "ttfbMs": 783, "firstContentMs": 1209, "totalMs": 1678 },
        "usage": { "promptTokens": 67, "completionTokens": 48, "reasoningTokens": 24 }
      }
    ]
  }
}
```

## API-05：修改会话（标题 / 提示词）

| 项目 | 值 |
|---|---|
| 方法 / 路径 | PATCH `/api/chat/conversations/:id` |
| 幂等 | 是（同值重复提交结果一致） |

```ts
interface PatchConversationRequest {
  title?: string;         // 1~48 字
  systemPrompt?: string;  // ≤4000 字（可为空串以清空）
}
// 两者至少提供一项，否则 400 CONVERSATION_INVALID
```

响应：`{ ok: true, conv: { id, title, systemPrompt, updatedAt } }`

| HTTP | code | 触发条件 |
|:---:|---|---|
| 400 | `CONVERSATION_INVALID` | 无任何可改字段 / 超长（附 `details`） |
| 403 | `SCOPE_FORBIDDEN` | 越权 |
| 404 | `CONVERSATION_NOT_FOUND` | id 不存在 |
| 500 | `CHAT_WRITE_FAILED` | 落盘失败（前端需回滚输入框） |

```bash
curl -s -X PATCH http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p \
  -H 'Content-Type: application/json' \
  -d '{"systemPrompt":"你是 ki 知识库助手，回答控制在 3 句内。"}'
```

```json
{ "ok": true, "conv": { "id": "c-mf3k1a-9x2p", "title": "向量检索是怎么回事", "systemPrompt": "你是 ki 知识库助手，回答控制在 3 句内。", "updatedAt": "2026-09-24T16:52:31.000Z" } }
```

## API-06：归档 / 恢复会话

| 项目 | 值 |
|---|---|
| 方法 / 路径 | POST `/api/chat/conversations/:id/archive` |
| 幂等 | 是（重复归档结果一致，`archivedAt` 仅在首次归档时写入） |

```ts
interface ArchiveConversationRequest { archived: boolean }
interface ArchiveConversationOk {
  ok: true;
  conv: { id: string; archived: boolean; archivedAt: string | null; updatedAt: string };
}
```

| HTTP | code | 触发条件 |
|:---:|---|---|
| 400 | `CONVERSATION_INVALID` | `archived` 非布尔 |
| 403 / 404 | 同上 | — |

```bash
curl -s -X POST http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p/archive \
  -H 'Content-Type: application/json' -d '{"archived":true}'
```

```json
{ "ok": true, "conv": { "id": "c-mf3k1a-9x2p", "archived": true, "archivedAt": "2026-09-24T17:01:05.000Z", "updatedAt": "2026-09-24T17:01:05.000Z" } }
```

> 归档会话**仍可继续对话**（不阻断写入），但列表默认隐藏；是否在发消息时自动取消归档见 `design/S04` 决策点。

## API-07：删除会话

| 项目 | 值 |
|---|---|
| 方法 / 路径 | DELETE `/api/chat/conversations/:id` |
| 幂等 | 是（已删除再次删除返回 404） |
| 副作用 | **物理删除** `{chatDir}/{scope}/{convId}.json`；若该会话正在生成，先中止生成再删除（见 messages.md 窗口语义） |

响应：`{ ok: true, id: string, deleted: true }`

| HTTP | code | 触发条件 |
|:---:|---|---|
| 403 | `SCOPE_FORBIDDEN` | 越权 |
| 404 | `CONVERSATION_NOT_FOUND` | id 不存在 |
| 500 | `CHAT_WRITE_FAILED` | 文件删除失败（权限） |

```bash
curl -s -X DELETE http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p
```

```json
{ "ok": true, "id": "c-mf3k1a-9x2p", "deleted": true }
```

## 关键代码设计

### 会话定位与越权判定（所有 `:id` 接口共用）

> ## ⚠️ 本节示例**已过时**，与 `design/cross-cutting.md` §2.2 的 P2 要求**冲突**
>
> 本节示例「**只在授权 scope 内查找**」→ 他人 scope 的会话会返回 **404**，
> 而 P2 要求 **403** —— 404 是**信息泄露路径**（可用来枚举他人会话是否存在）。
>
> **正确语义（以 `cross-cutting.md` §2.2 为准）**：
>
> ```text
> 扫描磁盘上【全部 scope】，区分三态：
>   任何 scope 都没有该 id   → 404（确实不存在）
>   存在于【非授权】scope    → 403（且不告知属于哪个 scope，脱敏防探测）
>   存在于【授权】scope      → 命中返回
> ```
>
> **本矛盾由 SR-01 窗口实跑发现**（P2 首轮实测返回 404 —— 它按本节示例写的）。
> 根因：`cross-cutting.md` 的 P2 是**后补的横切约定**，没有回灌到此前已产出的 API 文档。
> **本节待重写**。

```ts
// src/lib/chat-store.ts
export function resolveConversation(
  id: string,
  authScopes: Set<string> | null,
  chatDir: string,
): ConversationFile {
  if (!/^c-[a-z0-9]+-[a-z0-9]{4}$/.test(id)) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', '会话不存在');
  }
  // 只在授权 scope 内查找；authScopes 为 null = 鉴权未启用，全量扫描
  const scopes = authScopes ? [...authScopes] : fs.readdirSync(chatDir);
  const found: ConversationFile[] = [];
  for (const scope of scopes) {
    const p = path.join(chatDir, scope, `${id}.json`);
    if (fs.existsSync(p)) found.push(readConversationFile(p));
  }
  if (found.length > 1) {
    // 数据异常：同 id 出现在多个 scope → fail-loud 而非静默取其一
    throw new ApiError(500, 'API_ERROR', `会话 id 冲突：${id} 存在于多个 scope`);
  }
  if (!found.length) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', '会话不存在');
  const conv = found[0];
  if (authScopes && !authScopes.has(conv.scope)) {
    // 授权范围内命中但 scope 不匹配（防御性）：按越权处理，不泄露存在性
    throw new ApiError(403, 'SCOPE_FORBIDDEN', '无权访问该会话');
  }
  return conv;
}
```

> **为什么先按正则拒绝非法 id**：避免把用户输入直接拼进路径（路径穿越），同时让"格式非法"与"不存在"统一为 404，不泄露内部规则。

### 列表扫描与损坏容错

```ts
export function listConversations(scope: string, chatDir: string, archived: boolean, limit: number, cursor?: string) {
  const dir = path.join(chatDir, scope);
  if (!fs.existsSync(dir)) return { items: [], total: 0, nextCursor: null };
  const rows = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith('c-') || !f.endsWith('.json')) continue;   // 忽略非法文件
    try {
      const conv = readConversationFile(path.join(dir, f));
      if (!!conv.archived !== archived) continue;
      rows.push(toSummary(conv));
    } catch {
      // 单条损坏不拖垮整列表：降级为占位条目
      rows.push({ id: f.replace(/\.json$/, ''), title: '（损坏）', archived, archivedAt: null,
        updatedAt: fs.statSync(path.join(dir, f)).mtime.toISOString(),
        messageCount: 0, lastMessagePreview: '', corrupted: true });
    }
  }
  rows.sort((a, b) => (b.updatedAt === a.updatedAt ? b.id.localeCompare(a.id) : b.updatedAt.localeCompare(a.updatedAt)));
  const start = cursor ? rows.findIndex((r) => `${r.updatedAt}__${r.id}` === cursor) + 1 : 0;
  const page = rows.slice(start, start + limit);
  const nextCursor = start + limit < rows.length ? `${page[page.length - 1].updatedAt}__${page[page.length - 1].id}` : null;
  return { items: page, total: rows.length, nextCursor };
}
```

### 字段校验（API-03/05 共用）

```ts
function validateConversationPatch(input: { title?: string; systemPrompt?: string }): void {
  const details: { field: string; message: string }[] = [];
  if (input.title !== undefined && (input.title.length < 1 || input.title.length > 48)) {
    details.push({ field: 'title', message: 'INVALID_LENGTH：标题需 1~48 字' });
  }
  if (input.systemPrompt !== undefined && input.systemPrompt.length > 4000) {
    details.push({ field: 'systemPrompt', message: 'INVALID_LENGTH：提示词不得超过 4000 字' });
  }
  if (input.title === undefined && input.systemPrompt === undefined) {
    throw new ApiError(400, 'CONVERSATION_INVALID', '至少提供 title 或 systemPrompt 之一');
  }
  if (details.length) throw new ApiError(400, 'CONVERSATION_INVALID', '参数不合法', details);
}
```
