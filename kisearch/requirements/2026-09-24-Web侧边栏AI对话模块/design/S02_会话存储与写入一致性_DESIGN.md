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

# S-02 会话存储与写入一致性 — 设计

## 1. 术语

| 术语 | 定义 |
|---|---|
| 会话文件 | `{chatDir}/{scope}/{convId}.json`，单会话全量数据（含消息） |
| `seq` | 会话级单调递增计数，每次落盘 +1，用于审计与并发观测 |
| 会话级串行化 | daemon 内按 `conversationId` 的读-改-写互斥，防 Last-Write-Wins 丢消息 |
| 归档 | 软删除（`archived:true`），列表默认隐藏、可恢复 |

## 2. 现状（AS-IS）

- 原子写原语：`writeJson`（自动补 `version`/`updatedAt`）→ `walWrite`，见 `src/lib/store.ts:59-62`；`readJson` 对损坏文件抛 `CORRUPT_JSON`（`:30-44`）
- 写入并发保护：WAL 用 `O_CREAT\|O_EXCL` 实现**跨进程文件锁**（超时 10s / 陈旧 30s / 自旋 50ms），但其作用域是**单次写入**，不覆盖"读-改-写"序列 —— `src/lib/wal.ts:1-12,44-60`
- scope 校验与目录约定：`validateScope`（`src/lib/scope.ts:13,38-58`）、每 scope 一目录（`src/lib/scope-collection.ts:168-176` 的路径越界双重校验）
- 无任何会话数据结构（全仓 `chat|conversation` 业务代码 0 命中）

## 3. 方案（TO-BE）

### 3.1 目录与文件

```
{chatDir}/                       # 新增配置 chatDir，默认 ~/.ki/chat（独立于 kb/ 与 vectorDir）
└── {scope}/
    ├── c-mf3k1a-9x2p.json       # 一个会话一个文件
    └── c-mf3k2b-1q7w.json
```

**为什么独立于 `kb/{scope}/`**：快照恢复与删除 Group 会操作 `kb/` 目录，独立目录使会话天然免疫（需求 D4）。

### 3.2 数据模型

```ts
interface ConversationFile {
  version: 1;
  id: string;                    // c-{base36(Date.now())}-{rand4}
  scope: string;                 // 归属 scope（会话跟随 scope，见父文档决策）
  title: string;                 // 默认取首条用户消息前 24 字
  systemPrompt: string;          // 每会话提示词（D6）
  archived: boolean;
  archivedAt: string | null;     // ISO；恢复时置 null
  createdAt: string;             // ISO
  updatedAt: string;             // ISO；由 writeJson 兜底刷新，业务侧亦显式维护
  seq: number;                   // 每次落盘 +1
  messageCount: number;
  lastMessagePreview: string;    // 末条消息前 60 字（列表展示，避免前端读全文）
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;                    // m{seq}
  role: 'user' | 'assistant';
  content: string;
  at: string;                    // ISO
  // 以下仅 assistant 且生成完成/中止时写入
  aborted?: boolean;             // 用户中止
  finishReason?: string;         // stop / length / aborted
  timing?: { ttfbMs: number | null; firstContentMs: number | null; totalMs: number };
  usage?: { promptTokens: number; completionTokens: number; reasoningTokens?: number };
}
```

**关键约束：`ChatMessage` 不含 `reasoning` 字段**（D7 不落盘）；同时它是上游 `messages` 的唯一来源，因此从结构上保证"思考内容永不回传"。

**图片扩展（2026-09-24 增补，详见 S-06）**：`ChatMessage` 增加可选 `images?: ChatImageRef[]`（`local` 指向 `{chatDir}/{scope}/assets/{convId}__{imgId}{ext}`；`kb` 指向知识库资产 `{scope, group, path}`，**不复制文件**）；`content` 仍为纯文本。上游消息构造改为支持 content 数组，图片窗口策略（仅最近 1 轮携带真实图片）见 S-06 §3.3。

**级联删除（N15）**：`DELETE /api/chat/conversations/:id` 除删除会话文件外，还须删除 `{chatDir}/{scope}/assets/{convId}__*`（仅本地图片）；**绝不触碰 `kb/` 下的知识库资产**。

### 3.3 写入一致性

```ts
// src/lib/chat-store.ts
const locks = new Map<string, Promise<unknown>>();

function withConvLock<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.then(fn, fn);      // 前序失败不阻塞后续
  const tail = run.catch(() => undefined); // 防未处理拒绝
  locks.set(id, tail);
  // 关键：链尾执行完毕后回收 key，避免 Map 随会话数无界增长
  void tail.finally(() => {
    if (locks.get(id) === tail) locks.delete(id);
  });
  return run;
}

export function appendMessage(convId: string, msg: ChatMessage, patch?: Partial<ConversationFile>) {
  return withConvLock(convId, () => {
    const conv = readConversation(convId);   // 锁内读最新，杜绝 TOCTOU
    if (!conv) throw new NotFoundError();
    conv.messages.push(msg);
    conv.seq += 1;
    conv.messageCount = conv.messages.length;
    conv.lastMessagePreview = msg.content.slice(0, 60);
    Object.assign(conv, patch ?? {});
    writeJson(convPath(conv.scope, conv.id), conv);
    return conv;
  });
}
```

- **生成期间不持锁**：发消息分两段加锁（追加 user → 生成 → 追加 assistant），避免 12s 长思考阻塞同会话其他请求
- **两段之间的窗口语义（必须明确）**：生成期间若会话被**删除** → 助手回答**丢弃**（不落盘），`seq` 不递增，前端在 `aborted`/`error` 事件上收到 `conversation-gone` 并刷新列表；若被**归档** → 回答照常落盘（归档不阻断写入）；若用户在中止前已收到部分内容 → 按"中止"流程落盘 `aborted:true`
- **跨进程边界**：本期只有 daemon 写会话；若未来 CLI/MCP 也写，需扩展为跨进程 RMW 锁（当前 `src/lib/wal.ts` 的文件锁只覆盖单次写）

### 3.4 接口契约

**类型定义**：

```ts
interface CreateConversationReq { scope: string; title?: string; systemPrompt?: string }
interface CreateConversationRes { conv: { id: string; title: string; systemPrompt: string; createdAt: string; updatedAt: string } }

interface PatchConversationReq { title?: string; systemPrompt?: string }   // 至少一项；title ≤48 字、systemPrompt ≤4000 字
interface PatchConversationRes { conv: { id: string; title: string; systemPrompt: string; updatedAt: string } }

interface ArchiveConversationReq { archived: boolean }
interface ArchiveConversationRes { conv: { id: string; archived: boolean; archivedAt: string | null } }

interface SendMessageReq { text: string }                                  // 1~20000 字
interface ConversationSummary {
  id: string; scope: string; title: string; archived: boolean; updatedAt: string;
  messageCount: number; lastMessagePreview: string; corrupted: boolean;
}
interface ConversationListRes { items: ConversationSummary[]; nextCursor: string | null }
```

**鉴权**：所有接口按目标 `scope` 校验 token 授权（`authScopes` 为 null 时表示鉴权未启用）；目标 scope 不在授权范围 → 403 `SCOPE_FORBIDDEN`。**仅带 `scope` 参数的 GET 接口**（conversations 列表与详情）须登记 `src/lib/mcp-http-api.ts:300-310` 白名单，否则不参与越权拦截；`GET /api/chat/config` 不带 scope 参数，**无需登记**（误加会导致该接口恒被 scope 校验拦截）。

**分页**：`cursor` 为 `updatedAt` 与 `id` 的复合值（`{updatedAt}__{id}`），排序键 `(updatedAt, id)` 严格递减，避免同毫秒写入时漏条。

**列表读取成本**：列表需读取每个会话文件（含 `messages`）才能取标题与预览；本期按规模假设（≤2000 会话、单会话 ≤500 条）可接受，超过时按决策点中的阈值切换为元数据分离方案。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/chat/conversations?scope=&archived=0&limit=50&cursor=` | 列表（按 `(updatedAt,id)` 倒序） |
| POST | `/api/chat/conversations` | 新建 |
| GET | `/api/chat/conversations/:id` | 详情（含 messages） |
| PATCH | `/api/chat/conversations/:id` | 改 `title` / `systemPrompt` |
| POST | `/api/chat/conversations/:id/archive` | 归档或恢复 |
| DELETE | `/api/chat/conversations/:id` | 物理删除（前端二次确认） |
| POST | `/api/chat/conversations/:id/messages` | 发消息，SSE 流式返回（事件协议见 S-01/S-03） |

**`:id` 的查找与越权边界（必须遵守）**：

> ## ⚠️ 本节原文**自相矛盾**，已于 2026-09-25 修正（SR-01 窗口实跑发现，它直接导致了一个 P2 安全缺陷）
>
> 原文写：「**只允许在授权 scope 内遍历**」+「命中后再次校验该会话的 `scope` 属于授权集合，否则返回 403」
> —— 这两句**逻辑不通**：若遍历范围**就是**授权集合，则**不可能**命中他 scope 的会话，
> 那句 403 校验**永不触发**；且"遍历完找不到"该返回什么**未定义** → 实现者自然写 **404** →
> **违反 `cross-cutting.md` §2.2 的 P2**（404 是**枚举探测**路径：可用来判断他人会话是否存在）。

**正确语义（三态）**：

```text
服务端查找 :id 时，扫描 chatDir 下【全部 scope】目录（不是只扫授权集合）：
  ① 任何 scope 都没有该 id   → 404 CONVERSATION_NOT_FOUND（确实不存在）
  ② 存在于【非授权】scope    → 403 SCOPE_FORBIDDEN（且【不告知】属于哪个 scope —— 脱敏防探测）
  ③ 存在于【授权】scope      → 命中返回
鉴权未启用（authScopes === null）→ 视为全部 scope 授权，直接走 ③
```

会话 id 采用时间戳 + 4 位随机（`c-{base36}-{rand4}`）保证全局唯一，`chatDir` 下同名 id 只应存在于一个 scope 目录；若同名 id 出现在多个 scope → **fail-loud（500）**，不静默取其一。

Demo 返回示例（`GET /api/chat/conversations?scope=kisearch`）：

```json
{
  "items": [
    {
      "id": "c-mf3k1a-9x2p",
      "title": "向量检索是怎么回事",
      "archived": false,
      "updatedAt": "2026-09-24T16:40:12.000Z",
      "messageCount": 4,
      "lastMessagePreview": "简单说：把文本变成向量后按距离找近邻……",
      "corrupted": false
    }
  ],
  "nextCursor": null
}
```

## 4. 关键决策点

| 决策 | 采用 | 被否决方案与理由 | 重新评估触发条件 |
|---|---|---|---|
| 存储粒度 | 单会话单文件 | ① 单一大文件：并发写互相覆盖、一处损坏全丢；② 拆分 meta+messages 双文件：多一次写入与不一致窗口，本期收益不足 | 单会话文件 >2MB 或列表扫描 >200ms 时 |
| 并发控制 | daemon 内会话级 mutex + `seq` 审计 | ① 客户端乐观锁（前端需重试与冲突 UI，复杂度高）；② 依赖 WAL 文件锁做 RMW（锁仅在写期间持有，无法覆盖读-改-写） | 出现第二写入进程（CLI/MCP）时 |
| 列表实现 | 目录扫描 + 读取每个文件的轻量字段 | 内存索引缓存：CLI/多进程写入下缓存易失效 | 会话数 >2000 或扫描 >200ms 时 |
| 删除语义 | 归档（软删）与物理删除分离 | 只做软删：用户无法真正清空；只做硬删：误操作不可恢复 | 无 |

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 会话不存在或已删除 | 404 `CONVERSATION_NOT_FOUND` | 是 |
| 会话文件 JSON 损坏 | 列表：该条 `corrupted:true` 且标题显示「（损坏）」，其余正常返回；详情：500 + 文件路径 | 是 |
| 写盘失败（磁盘满/权限） | 500 `CHAT_WRITE_FAILED`，不改动已读内容，不返回部分成功 | 是 |
| scope 名非法 | 400 `SCOPE_INVALID`（复用 `validateScope`） | 是 |
| 同会话并发发消息 | mutex 串行化，两条消息均保留（不丢、不覆盖） | 否（无感） |
| 中止且 `content` 为空（仍在思考阶段被停止） | **不写入 assistant 消息**（避免空消息污染会话、把列表预览顶成空白）；前端本地提示「已中止，本次无输出」 | 是 |
| 会话消息数 > 500 | 仍可写入，SSE `done` 事件带 `warning:"conversation-too-long"` | 是（前端提示新建会话） |
| 归档会话上继续发消息 | 允许（不自动恢复归档态），列表仍隐藏 | 是（详情页可见） |
| 磁盘上出现非法文件名（非 `c-*.json`） | 忽略该文件，不报错 | 否 |

## 6. 影响范围

| 文件 | 改动 | 回归点 |
|---|---|---|
| `src/lib/chat-store.ts` | 新增（读/写/列表/删除/归档/lock） | — |
| `src/lib/config.ts` | `KiConfig` 增 `chatDir?: string`（默认 `~/.ki/chat`） | 现有配置无该字段时走默认值，不报错 |
| `src/lib/mcp-http-api.ts` | 新增 6 条 CRUD 路由；GET 类接口登记越权白名单 | 现有 13 条路由与鉴权行为不变 |
| `src/lib/scope.ts` | 复用 `validateScope` | 不修改既有校验规则 |

## 7. 待定问题

| 问题 | 影响 | 处理时机 |
|---|---|---|
| 会话自动清理（TTL / 上限）策略 | 磁盘长期增长 | 本期不做，仅提供手动删除；积累使用数据后再定 |
| 是否需要导出/导入会话 | 迁移与备份 | 本期不做；`chatDir` 可整目录复制作为临时方案 |

## 8. 不在范围内

会话内容全文检索、跨 scope 会话迁移、会话分享、按 tag 分类、MCP/CLI 侧会话读写接口、会话内容加密。

---

## 9. v2 修订（2026-09-25，D13 检索与工具调用 + D14 重新生成/编辑重发）

> 变更来源：`S07_检索与工具调用_DESIGN.md`｜**覆盖**前文冲突处，其余条款继续有效。

### 9.1 `ChatMessage` 新增 `sources`（接 §3.2 数据模型）

```ts
interface ChatMessage {
  // ...v1 字段全部保留（id/role/content/at/aborted?/finishReason?/timing?/usage?/images?）
  sources?: SourceRef[];   // 仅 assistant；来源引用（类型定义见 S07 §3.5）
}
```

**两条不变量**（与 §3.2 原有约束并列，同为结构性隔离手段）：

- 仍**不含** `reasoning`
- 仍**不含检索原始结果**（N22）；`sources` 是**投影后的引用**（group / doc / 行号区间 / ≤200 字摘要），不是 `SearchResult`

**向后兼容**：旧会话文件无 `sources` → 可选字段，正常读取。

### 9.2 新增接口（完整契约见 `api/retrieval.md`，此处只登记）

| 编号 | 方法 | 路径 | 说明 | 来源 |
|---|---|---|---|---|
| API-11 | POST | `/api/chat/conversations/:id/regenerate` | 重新生成；**不新增 user 消息** | R23 / D14 |
| API-12 | PATCH | `/api/chat/conversations/:id/messages/:msgId` | 编辑 user 消息 → 原子截断其后 → 重新生成 | R24 / D14 |
| API-13 | POST | `/api/chat/config/ack` | 隐私确认（T12） | N18 / T12 |
| API-14 | DELETE | `/api/chat/conversations?scope=` | 清空该 scope 全部会话（**N8 指出当前 api 无此落点**，本次补齐） | N8 |

> **API-14 的删除范围**：仅删 `chatDir/{scope}/` 下的会话文件与 `assets/`；**绝不触碰 `kb/{scope}/`**（与 N15 同级约束）。

### 9.3 原子截断语义（N21，**细化** §3.3 的并发描述）

"编辑并重发"必须在**同一把会话锁内**完成：

```text
withConvLock(convId, () => {
  conv = readConversation()              // 锁内读最新
  if (msgId 不是该会话的 user 消息) → 400 MESSAGE_INVALID
  conv.messages = conv.messages.slice(0, indexOf(msgId) + 1)   // 物理截断其后全部
  conv.messages.push(新 user 消息)        // 用编辑后的文本
  conv.seq += 1; writeJson(...)          // 一次落盘
})
→ 锁外：开始生成（沿用 §3.3 "生成期间不持锁"）
```

| 规则 | 说明 |
|---|---|
| 截断是**物理删除** | 不保留"被丢弃的分支"（D14 本期不做分支树） |
| `msgId` 之后无消息 | 等价于"重新生成"，**不报错** |
| `msgId` 指向 assistant 消息 | 400 `MESSAGE_INVALID`（只能编辑 user 消息） |
| 会话正在生成中 | 互斥：返回 409 `CHAT_BUSY`，或先 abort 再执行 —— **实现时二选一并在此处回填** |

### 9.4 与 §3.3 的交互（不覆盖，仅澄清）

§3.3 "生成期间不持锁"**仍有效**；§9.3 的锁只覆盖"截断 + 写入"这一段，生成仍在锁外。两段之间的窗口语义（会话被删 / 归档）沿用 §3.3 既有约定，不新增分支。
