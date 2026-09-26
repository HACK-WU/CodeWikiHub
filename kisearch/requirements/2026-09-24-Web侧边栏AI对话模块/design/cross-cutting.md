---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 已定稿（骨架期冻结，之后只读）
created: 2026-09-25
updated: 2026-09-25
version: 1
tags: [feat, cross-cutting]
depends_on: []
author: AI
document_type: design
---

# 横切约定 + 权限模型（骨架交付清单第 10 / 11 项）

> **本文件的约束在骨架期冻结，实现期只读**。
> 为什么单列：这两类问题的共同特征是 **不产生文件冲突、编译能过、单测能绿**，只在拼接期与线上暴露。
> 第 10 项漏 → 拼接期排障地狱；第 11 项漏 → 越权漏洞。

---

## 一、横切约定

### 1.1 逐项定稿表

| 项 | 约定 | 与项目现状的关系 | 代码落点 |
|---|---|---|---|
| **时区** | 全部时间用 **ISO 8601 UTC**（`2026-09-25T16:40:12.000Z`） | ✅ 与既有 `writeJson` 的 `updatedAt` 一致，**沿用不改** | `chat-contract.ts`（`ChatMessage.at` 等） |
| **数值精度** | 本模块无金额；`usage` 各字段与 `timing.*Ms` 均为**整数** | ✅ 新增约定（知识库场景无小数金额） | `chat-contract.ts` 类型 |
| **ID 格式** | 会话 `c-{base36(Date.now())}-{rand4}`；消息 `m{seq}`；**不使用 UUID**（可读、可排序、与既有风格一致） | 新增 | `chat-store.ts` |
| **分页** | 游标为 `{updatedAt}__{id}` 复合值，排序键 `(updatedAt, id)` 严格递减 | 新增（既有接口无分页先例） | `chat-routes.ts` |
| **错误载体** | `{ ok:false, error:string, code?:string, details?:{field,message}[] }` | ✅ 与既有 `sendJson` 一致（`mcp-http-api.ts:377/380`），**不引入** `{code,data,message}` | `chat-contract.ts` |
| **命名风格** | 接口字段 `camelCase`（与既有 `fullTextIndexed`/`uploadId` 一致）；**不用 snake_case** | ✅ 沿用 | 全部 |

### 1.2 ★ 错误码分段（**防撞码**）

既有接口的错误载体已有 `code` 字段，但**无号段约定**。本模块新增 **13 个错误码**，必须分段：

| 号段 | 归属 | 错误码 |
|:---:|---|---|
| **1xxx** | chat · 配置 | `CHAT_DISABLED` |
| **2xxx** | chat · 会话 | `CONVERSATION_NOT_FOUND` / `CONVERSATION_INVALID` / `CONVERSATION_GENERATING` / `CHAT_WRITE_FAILED` |
| **3xxx** | chat · 消息与生成 | `MESSAGE_INVALID` / `MESSAGE_NOT_FOUND` / `LLM_UPSTREAM_ERROR` / `LLM_TIMEOUT` / `LLM_RATE_LIMITED` |
| **4xxx** | chat · 检索与隐私 | `DISCLOSURE_REQUIRED` / `KB_IMAGE_MISSING` |

**约定的字面值**（实现时直接用，`chat-contract.ts` 已定义）：

```ts
// 号段本身就是约定：1xxx=配置 / 2xxx=会话 / 3xxx=消息与生成 / 4xxx=检索与隐私
CHAT_DISABLED = 'CHAT_DISABLED'   // 保持字符串码，号段体现在【命名前缀】而非数字
```

> ⚠️ **本项目采用"字符串码 + 命名前缀"而非数字码**（与既有 `SCOPE_FORBIDDEN` 风格一致）。
> 因此"防撞码"的落地形式是：**chat 模块的错误码一律带上述前缀**，且**不得复用既有通用码**（`UNAUTHORIZED`/`SCOPE_FORBIDDEN`/`SCOPE_INVALID`/`NOT_FOUND`/`API_ERROR` 属公共码，chat 只引用不重定义）。
> 调用方按 `code` 分支时，**前缀即模块边界**，不会与其他模块撞。

### 1.3 日志（最小可用约定）

**项目现状**：无统一 logger，核心 lib（`wal.ts`/`scope.ts`/`config.ts`）**几乎不打日志**，仅 `mcp-http.ts:969` 有一处 `console.log`。

**本模块约定（对齐现状，不引入新依赖）**：

| 规则 | 内容 |
|------|------|
| 输出方式 | `console.error`（错误）/ `console.log`（关键事件），**不引入 logger 库** |
| 结构化 | 单行 JSON：`{"evt":"chat.upstream.error","convId":..., "code":..., "detail":...}` |
| **不打印的内容** | 🔴 **apiKey（含前缀）/ 消息正文 / reasoning 内容 / 检索片段**——它们会进日志文件 |
| 上游错误 | **原文仅入 daemon 日志，不回传浏览器**（`error` 字段只给规范化文案） |
| 必打事件 | ① 上游调用失败（含 HTTP 状态与截断原文 ≤200 字）② 工具调用异常 ③ 会话落盘失败 ④ 检索降级触发 |

### 1.4 ★ trace / 请求 ID（**决策：最小引入，不建 middleware**）

**项目现状**：`requestId` 只存在于 `edit-relation` 链路，**是业务幂等键**（供超时后重试 finish），**不是跨层 trace**；HTTP 层无 trace 中间件。

**决策：本模块只做"单请求内串日志"的最小形态，不引入跨服务 trace。**

| 做什么 | 怎么做 |
|--------|--------|
| 一次生成请求内所有日志带同一个标识 | 用**已有的 `conversationId` + 本次 `messageId`** 作为天然关联键（它们本来就在事件流的 `meta` 里） |
| 日志格式 | `{"evt":..., "convId":"c-xxx", "msgId":"m12", ...}` |

**为什么不做完整 trace**：本模块是**单进程单机**场景，无跨服务调用；引入 middleware 级 trace 属过度设计，且会与既有 `requestId` 语义（幂等键）混淆。

> **判据**：若将来 chat 需要跨进程（如 CLI 也读写会话），再评估引入真正的 trace——**现在不做，但要写明"为什么不做"**，避免后人以为是漏了。

---

## 二、权限模型（骨架清单第 11 项）

### 2.1 资源 × 操作 × 授权

| 资源 | 操作 | 谁可以 | 鉴权层 | 越权语义 |
|------|------|--------|--------|---------|
| `/api/chat/config` | GET | 任意已授权 token | HTTP 层（`mcp-http-api.ts` 统一 Bearer 校验） | 401 `UNAUTHORIZED` |
| `/api/chat/config/ack` | POST | 同上 | 同上 | 401 |
| 会话（按 `scope` 列） | GET 列表 | token 的 `authScopes` 含该 scope | **白名单登记** + `scopeAllowed` 校验 | 403 `SCOPE_FORBIDDEN` |
| 会话（按 `:id` 读/改/删/归档） | GET/PATCH/DELETE/POST | **`authScopes` 内遍历查到该会话** | **代码内遍历授权 scope 目录**（见 §2.2） | **403（不 404）** |
| 会话（发消息 / 重新生成 / 编辑重发） | POST/PATCH | 同 `:id` 规则 + `kbDisclosureAck === true` | 同上 + 隐私门 | 403 `SCOPE_FORBIDDEN` / 403 `DISCLOSURE_REQUIRED` |
| 清空全部会话 | DELETE `?scope=` | 同列表 | **白名单登记** | 403 |
| **知识库资产（`kb/`）** | **任何写操作** | **chat 模块一律不做** | — | 结构性禁止（N15：绝不删 KB 图片） |

**鉴权未启用时**（`authScopes === null`，即非回环且未配 token）：全部 scope 可见——**沿用既有行为，不新增分支**。

### 2.2 两条最容易写错的规则

| 规则 | 说明 |
|------|------|
| **按 `:id` 操作时，越权返回 403 而非 404** | 若返回 404，攻击者可用状态码**探测**其他 scope 的会话是否存在（枚举器）。必须先在 `authScopes` 内遍历查找，命中后校验，**越权一律 403** |
| **白名单只登记"带 `scope` 参数的 GET"** | API-02 / API-04 / API-14 需登记（沿用 `mcp-http-api.ts:300-310` 既有列表）；**API-01 不带 scope 参数，误加会导致它恒被校验拦截** |

### 2.3 越权负向用例（**必须进片级验收清单**）

> 规则：**每条权限规则必须配一条越权负向用例**——否则权限只写在文档里，拼接期无人验。

| # | 用例 | 期望 | 归属 |
|---|------|------|:---:|
| P1 | token 授权 `scope=A`，`GET /api/chat/conversations?scope=B` | **403 `SCOPE_FORBIDDEN`** | SR-01 |
| P2 | token 授权 `scope=A`，`GET /api/chat/conversations/{B 的会话 id}` | **403（不得 404）** | SR-01 |
| P3 | token 授权 `scope=A`，`DELETE /api/chat/conversations?scope=B` | **403** | SR-01 |
| P4 | 未确认隐私（`kbDisclosureAck=false`）发消息 | **403 `DISCLOSURE_REQUIRED`**（前端本应拦截，后端兜底防绕过） | SR-01 |
| P5 | 会话正在生成中，调 API-11/12 | **409 `CONVERSATION_GENERATING`** | SR-01 |
| P6 | `DELETE /api/chat/conversations/:id` 后，检查 `kb/{scope}/` | **知识库资产零变化**（N15） | SR-01 |
| P7 | 无 token（启用鉴权时）访问任一 `/api/chat/*` | **401 `UNAUTHORIZED`** | SR-01 |

> **P2 是最容易写错的一条**：直觉会写"查不到就 404"，而那正是信息泄露路径。

---

## 三、公共代码冻结清单（骨架清单第 6 项）

**冻结 = 实现期只读复用，不改一字**。改动它们会影响**既有 13 条路由与全部 CLI 命令**，属跨需求影响。

| 文件 | 复用什么 | 冻结理由 |
|------|---------|---------|
| `src/search.ts` | `executeSearch()` | **R18 硬约束**：检索必须复用不新建链路。若需改动 → 说明"复用"前提不成立，**回设计** |
| `src/lib/store.ts` | `readJson` / `writeJson`（version 校验 + WAL 原子写） | 全项目持久化原语 |
| `src/lib/wal.ts` | 跨进程文件锁 | 会话写入依赖它 |
| `src/lib/scope.ts` | `validateScope` / `getKbDir` | scope 校验与目录约定 |
| `src/lib/operation-coordinator.ts` | `getSharedOperationCoordinator().submit()` | **检索入队的唯一入口**（S07 §3.6） |

### ⚠️ 两个**有意的例外**（列为本需求的独占写，不算冻结）

| 文件 | 改动 | 为什么必须改 | 风险控制 |
|------|------|------------|---------|
| `src/lib/config.ts` + `config-schema.ts` | 新增 `llm` 段字段（`supportsTools` / `kbDisclosureAck` 等） | 配置段必须落在既有配置链路（S01 决策：不用独立 chat.yaml） | 新字段**全部可选**，旧配置无它们须正常加载（回归点） |
| `src/lib/mcp-http-api.ts` | **单行挂载** `handleChatRoutes` | 路由必须注册在既有 if 链上 | 只加一行 + import，**不动既有 13 条分支**；归 SR-01 独占 |

> **例外的判定标准**：改动是"**接线**"（把我方代码挂到既有机制上）还是"**改机制**"？
> 接线 → 允许（受控、单行、可回归）；改机制 → 一律回设计评估。
> 这两个例外都是接线，且**已在 `parallel-decision.md` §2.3 登记为挂载点**。
