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

# API 总览：Web 侧边栏 AI 对话模块

> 关联需求：REQ-20260924-001（v7）｜设计输入：`design/DESIGN.md` + S01~S05｜状态：草案
> 基础路径：`/api/chat`（**沿用项目既有风格：无 `/v1` 版本前缀**）

## 1. 概述

- **接口数量**：8 个（1 个配置查询 + 6 个会话 CRUD + 1 个 SSE 流式对话）
- **认证方式**：Bearer Token（仅当 daemon 启用 `authEnabled` 且来源非回环时校验；token → scope 集合）
- **统一响应外壳（必须与既有 `/api/*` 一致）**：

  ```ts
  // 成功
  type Ok<T> = { ok: true } & T;
  // 失败
  type Err = { ok: false; error: string; code?: string; details?: { field: string; message: string }[] };
  ```

  > ⚠️ **不引入** `{ code, data, message }` 外壳。既有实现见 `src/lib/mcp-http-api.ts:123-126`（`sendJson`）、`:364`（404）、`:367`（400 带 `code`）、`:175`（403）。新增接口沿用同一外壳，仅把错误码统一放进 `code` 字段。

- **字段命名**：`camelCase`（与既有 `fullTextIndexed`、`uploadId`、`maxRequestBody` 一致）；**不使用 snake_case**
- **请求体上限**：16MB（沿用 `MAX_BODY`，`src/lib/mcp-http-api.ts:53`）
- **分页**：`cursor` 为 `{updatedAt}__{id}` 复合值，排序键 `(updatedAt, id)` 严格递减
- **不经过 `OperationCoordinator`**：chat 接口只读写 `chatDir`（独立目录），不触碰 zvec / KB / relations-cache，因此**不登记**同 scope 操作队列；会话内部由 `chat-store` 的会话级 mutex 串行化（见 S-02 §3.3）。误加队列会让 12s 长流阻塞同 scope 的检索/导入请求
- **越权白名单**：仅**带 `scope` 参数的 GET**（API-02、API-04）需登记 `src/lib/mcp-http-api.ts:300-310`；API-01 不带 scope 参数，**无需登记**
- **SSE 约定**：`Content-Type: text/event-stream; charset=utf-8`、`Cache-Control: no-cache, no-transform`、`X-Accel-Buffering: no`；事件负载为 `data: {"type": ...}`（不使用 SSE `event:` 字段，前端按 `data.type` 分派）

## 2. 接口清单

| 编号 | 方法 | 路径 | 模块 | 文档 | 优先级 |
|---|---|---|---|------|:---:|
| API-01 | GET | `/api/chat/config` | 配置 | [config.md](config.md) | P0 |
| API-02 | GET | `/api/chat/conversations` | 会话 | [conversations.md](conversations.md) | P0 |
| API-03 | POST | `/api/chat/conversations` | 会话 | [conversations.md](conversations.md) | P0 |
| API-04 | GET | `/api/chat/conversations/:id` | 会话 | [conversations.md](conversations.md) | P0 |
| API-05 | PATCH | `/api/chat/conversations/:id` | 会话 | [conversations.md](conversations.md) | P0 |
| API-06 | POST | `/api/chat/conversations/:id/archive` | 会话 | [conversations.md](conversations.md) | P0 |
| API-07 | DELETE | `/api/chat/conversations/:id` | 会话 | [conversations.md](conversations.md) | P0 |
| API-08 | POST | `/api/chat/conversations/:id/messages` | 对话 | [messages.md](messages.md) | P0 |
| API-09 | POST | `/api/chat/conversations/:id/images` | 图片 | [images.md](images.md) | P0 |
| API-10 | GET | `/api/chat/images/:id` | 图片 | [images.md](images.md) | P0 |

## 3. 错误码定义

### 3.1 通用错误码（与既有接口一致）

| code | HTTP | 说明 | 触发条件 |
|---|:---:|---|---|
| `UNAUTHORIZED` | 401 | 未认证 | 启用鉴权且 Bearer 缺失/无效（沿用既有文案 `Unauthorized: invalid or missing Bearer token`） |
| `SCOPE_FORBIDDEN` | 403 | 越权 | token 授权 scope 集合不含目标 scope；**按 id 操作时同样返回 403，不返回 404**（防状态码探测他 scope 会话是否存在） |
| `SCOPE_INVALID` | 400 | scope 名非法 | 不符合 `^[a-zA-Z0-9_-]+$` 或属保留字（复用 `src/lib/scope.ts:13,38-58`） |
| `NOT_FOUND` | 404 | 路由不存在 | 未匹配任何 `/api/chat/*` 路由（沿用既有 404 文案） |
| `API_ERROR` | 400 | 未归类请求错误 | 请求体 JSON 解析失败等（沿用既有兜底 `:367`） |

### 3.2 chat 模块错误码

| code | HTTP | 说明 | 触发条件 |
|---|:---:|---|---|
| `CHAT_DISABLED` | 503 | 模型未配置 | `config.llm` 缺失，或 `baseURL`/`model`/`apiKey` 为空，或 `${ENV}` 变量未解析 |
| `CONVERSATION_NOT_FOUND` | 404 | 会话不存在 | `:id` 在**授权 scope 范围内**查不到 |
| `CONVERSATION_INVALID` | 400 | 会话参数非法 | `title` >48 字 / `systemPrompt` >4000 字 / `PATCH` 无任何可改字段 / `scope` 为空 |
| `MESSAGE_INVALID` | 400 | 消息参数非法 | `text` 为空、仅空白或 >20000 字 |
| `CHAT_WRITE_FAILED` | 500 | 落盘失败 | 磁盘满、权限不足（不返回部分成功） |
| `LLM_UPSTREAM_ERROR` | 502 | 上游异常 | 上游 4xx/5xx、返回非 SSE、chunk 解析连续失败 >10 次 |
| `LLM_TIMEOUT` | 504 | 上游超时 | 首块超时（默认 30s）或整体超时（默认 180s） |
| `LLM_RATE_LIMITED` | 429 | 上游限流 | 上游返回 429 |
| `CHAT_BUSY` | 429 | 本地并发上限 | 进行中的生成数达上限（建议 5；🟢 增强项，未启用时不会返回） |
| `IMAGE_INVALID` | 400 | 图片非法或能力未开启 | mime 不在白名单 / 魔数不符 / 超 `maxImageBytes` / `supportsImages !== true`（详见 `images.md`） |
| `IMAGE_NOT_FOUND` | 404 | 本地图片不存在 | id 非法或文件缺失（同码，不泄露命名规则） |
| `KB_IMAGE_MISSING` | 409 | 引用的知识库图片已失效 | 发送前校验失败，**须指明具体图片**（N13 fail-loud） |

### 3.3 字段级错误详情

`details` 仅在 `CONVERSATION_INVALID` / `MESSAGE_INVALID` 时返回：

| 字段 | code | 说明 |
|---|---|---|
| `title` | `INVALID_LENGTH` | 长度不在 1~48 字 |
| `systemPrompt` | `INVALID_LENGTH` | 长度超过 4000 字 |
| `text` | `INVALID_LENGTH` | 长度不在 1~20000 字 |
| `scope` | `SCOPE_INVALID` | 非法 scope 名 |

## 4. 通用约定

| 项 | 约定 |
|---|---|
| 幂等性 | API-01/02/04 天然幂等；API-05/06 幂等（同值重复提交结果一致）；API-03 新建非幂等（每次产生新会话）；API-07 删除幂等（已删除再删 404）；**API-08 非幂等**（每次调用写一条 user 消息） |
| 时间格式 | ISO 8601 字符串（`2026-09-24T16:40:12.000Z`），与 `writeJson` 的 `updatedAt` 一致 |
| 错误文案语言 | 中文描述 + 英文 code（沿用既有混合风格） |
| 日志 | 上游错误原文仅写 daemon 日志，不回传浏览器（🟢 增强项；若采纳，`error` 只给规范化文案） |
| 限流 | 无独立限流；生成本身受上游速率限制；`CHAT_BUSY` 为可选的本地并发闸（见 §3.2） |

## 5. 与设计文档的差异声明（独立设计后的修正）

| 项 | 设计文档（demo 级） | 本文档（契约级） | 原因 |
|---|---|---|---|
| 响应外壳 | 直接返回 `{ conv }` / `{ items }` | 统一 `{ ok: true, ... }` | 与既有 `/api/*` 一致 |
| 错误载体 | 未定义 | `code` + `error` + 可选 `details` | 既有 400 分支已有 `code`，统一到所有错误 |
| 列表分页字段 | `nextCursor` | `nextCursor`（值改为 `{updatedAt}__{id}`） | 避免同毫秒漏条 |
| API-01 白名单 | 设计表述为"GET 类接口须登记" | **明确不登记** | 该接口不带 scope 参数，误加会被 scope 校验恒拦 |
| OperationCoordinator | 未提及 | **明确不使用** | chat 不触碰 zvec/KB，入队会阻塞同 scope 检索 |

## 6. 待确认事项

| 编号 | 事项 | 影响范围 | 状态 |
|---|---|---|---|
| Q1 | 是否启用 `CHAT_BUSY` 本地并发闸（建议上限 5） | API-08 | 待定（🟢 增强项，不阻塞） |
| Q2 | 上游错误原文是否改为仅入日志 | API-08 | 待定（🟢 增强项，安全取舍） |
| Q3 | `GET /api/chat/config` 的 `configPath` 返回绝对路径还是 `~` 形式 | API-01 | 待定（本机单用户可接受绝对路径） |
