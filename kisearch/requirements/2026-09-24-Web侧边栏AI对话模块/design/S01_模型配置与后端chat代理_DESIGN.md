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

# S-01 模型配置与后端 chat 代理 — 设计

## 1. 术语

| 术语 | 定义 |
|---|---|
| `config.llm` | 用户自配的模型配置段（baseURL/model/apiKey），**无默认值**，缺失即 fail-loud |
| 归一化事件流 | 上游 OpenAI SSE chunk 经解析后统一成 `{type}` 事件，供前端消费 |
| reasoning 隔离 | 思考内容仅作为流事件转发，**不落盘、永不回传上游** |

## 2. 现状（AS-IS）

- 全仓唯一外部模型调用是 embedding：`POST ${baseURL}/embeddings`，见 `src/zvec-engine/embedding/siliconflow.ts:145`
- 配置结构 `KiConfig` 无 llm 段：`src/lib/config.ts:132-156`（`EmbeddingConfig` 在 `:132-142`，默认值 `:160-167`）
- apiKey 支持明文或 `${ENV}` 引用且**不做隐式 env 回退**：`src/lib/config.ts:428-438`
- `/api/*` 路由集中在 if 链：`src/lib/mcp-http-api.ts:313-364`；响应一律 `sendJson`（`:123-126`），**无 SSE 先例**
- 带 scope 的只读接口需登记越权白名单：`src/lib/mcp-http-api.ts:300-310`

## 3. 方案（TO-BE）

**文件改动**：

```
src/
├── lib/
│   ├── config.ts            # [修改] 新增 LlmConfig 类型 + KiConfig.llm + resolveLlmApiKey
│   ├── config-schema.ts     # [修改] 新增 llm 段校验（必填项缺失即报错）
│   ├── llm-client.ts        # [新增] 上游调用、SSE 解析、事件归一化、超时与错误映射
│   ├── mcp-http-api.ts      # [修改] 新增 /api/chat/config 与 /api/chat/... 路由 + 白名单登记
│   └── chat-store.ts        # [新增，见 S-02]
├── config.ts                # [修改] 配置模板新增 llm 段（含注释，不带默认模型）
```

**1）配置段（改什么/改成什么/为什么）**

`src/lib/config.ts` 在 `KiConfig` 增加 `llm?: LlmConfig`：

```ts
export interface LlmConfig {
  baseURL: string;              // 必填，OpenAI 兼容地址（如 https://host/compatible-mode/v1）
  model: string;                // 必填，用户自填，不预置默认（D8）
  apiKey: string;               // 必填，支持 ${ENV_VAR} 引用
  maxTokens?: number;           // 默认不传（不下发 max_tokens）：实测该上游的 reasoning token 与 max_tokens 关系不确定（设 800 仍返回 944 completion tokens），设小值有截断答案风险
  temperature?: number;         // 默认 0.7
  requestTimeoutMs?: number;    // 默认 180000（reasoning 模型首答实测可达 12s，留足余量）
  firstByteTimeoutMs?: number;  // 默认 30000，仅约束"建立连接并收到首个 chunk"
  defaultSystemPrompt?: string; // 可选，新建会话的初始提示词
  supportsImages?: boolean;     // 默认 false：模型是否支持图片输入（用户手填，不自动探测 —— D11，见 S-06）
  maxImagesPerMessage?: number; // 默认 4：单条消息最多携带图片数
  maxImageBytes?: number;       // 默认 4MB：单图原始大小上限（base64 后约 1.33 倍，受 MAX_BODY 16MB 约束）
}
```

**为什么必填而非给默认**：D8 要求模型完全由用户配置；给默认模型会把第三方服务与计费绑定到项目上（被否决方案：默认 `qwen3.8-flash`）。

**2）`llm-client`（新增，`src/lib/llm-client.ts`）**

职责与约束：

- `streamChat(messages, opts)`：调用 `${baseURL}/chat/completions`（`stream: true`, `stream_options.include_usage`），逐块解析上游 SSE，产出归一化事件
- **只接收 `content` 字段**：入参 messages 由调用方（S-02/S-03 路径）构造，必须只含 `{role, content}`；`llm-client` 不接触 reasoning
- **出参分流**：`reasoning_content` → `{type:'reasoning'}` 事件（仅转发）；`content` → `{type:'content'}`；`usage` → `{type:'usage'}`
- **容错**：上游 chunk 无 `reasoning_content` 字段时按普通流处理（不视为异常）
- **超时双层**：`firstByteTimeoutMs`（无首块即中断，映射 `LLM_TIMEOUT`）与 `requestTimeoutMs`（整体上限）
- **中止**：接受外部 `AbortSignal`，中止后返回已累积内容，由调用方落盘为 `aborted: true`

**3）接口：`GET /api/chat/config`**

> 完整契约（请求/响应/错误码/Demo/关键代码）以 **`api/config.md`（API-01）** 为准；此处仅说明设计意图，**不重复定义字段**，避免两处漂移。

响应字段遵循项目既有外壳 `{ ok: true, ... }`，核心语义：

| 字段 | 语义 |
|---|---|
| `enabled` | llm 配置是否就绪；`false` 时面板禁用发送并展示配置指引 |
| `model` / `baseURLHost` | 当前生效模型与上游主机**（只含 host，绝不回传 apiKey 与完整路径）** |
| `configPath` | 配置文件路径，供 fail-loud 文案引用 |
| `requestTimeoutMs` | 生效的整体超时，供前端提示预期等待时长 |
| `reason` / `code` | 未就绪原因（人话 + `CHAT_DISABLED`） |

**未就绪时仍返回 200 + `ok: true`**：配置缺失是可预期的产品状态而非请求错误，由 `enabled:false` 表达，面板据此显示指引而不是报错。

**4）路由与鉴权**

在 `src/lib/mcp-http-api.ts:313-364` 的 if 链中新增 `/chat/*` 分支；`/api/chat/conversations`（GET）与 `/api/chat/conversations/:id`（GET）带 scope 参数 → **必须加入 `:300-310` 的越权白名单**。写接口（POST/PATCH/DELETE）按会话所属 scope 校验 token 授权。

## 4. 关键决策点

| 决策 | 采用 | 被否决方案与理由 | 重新评估触发条件 |
|---|---|---|---|
| 调用方 | **daemon 代理**（浏览器不直连上游） | 前端直连：apiKey 暴露给浏览器、受 CORS 限制 | 无 |
| 配置位置 | 主配置文件的 `llm` 段 | 独立 `chat.yaml`：与既有配置读取链路割裂，需另建加载器 | 若 llm 需多套凭据（多模型切换）时评估 |
| 超时策略 | 双层（首块 30s / 整体 180s） | 单一整体超时：无法区分"连不上"与"在思考"，前者应快速失败 | 上游若无首块回调能力时调整 |
| 上游字段容错 | 缺失 `reasoning_content` 即普通流 | 强制校验该字段：会误伤非 reasoning 模型 | 无 |

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `llm` 段缺失或必填项为空 | 路由返回 503 `CHAT_DISABLED`，附 `configPath`；`GET /chat/config` 返回 `enabled:false` | 是（面板据此禁用发送并展示配置指引） |
| apiKey 为 `${ENV}` 但环境变量为空 | 同上（视为未配置），日志记录变量名 | 是 |
| 上游 401/403 | 502 `LLM_UPSTREAM_ERROR`，`hint:"凭据无效"`，不重试 | 是 |
| 上游 429 | 429 `LLM_RATE_LIMITED`，`retryable:true` | 是 |
| 上游 5xx | 502 `LLM_UPSTREAM_ERROR`，`retryable:true` | 是 |
| 超时 | 504 `LLM_TIMEOUT`，`retryable:true`；已累积内容按"中止"落盘 | 是 |
| 上游提前结束（`finish_reason==='length'`） | `done` 事件带 `truncated:true`，前端提示「回答因长度上限被截断」 | 是 |
| 上游返回非 SSE（如 JSON 错误体） | 解析失败 → 502 `LLM_UPSTREAM_ERROR`，附截断原文（≤200 字） | 是（便于排查） |
| chunk JSON 解析失败（单个） | 跳过该块并计数，累计 >10 块则中断并报错 | 是（计数超限时） |
| 客户端断开 | abort 上游 → 按"中止"流程落盘 | 否（前端自处理） |

## 6. 影响范围

| 文件 | 改动 | 回归点 |
|---|---|---|
| `src/lib/config.ts` | 新增 `LlmConfig`、`KiConfig.llm`、`resolveLlmApiKey` | 现有 embedding 配置读取不受影响；`config doctor` 补 llm 段状态检查，**缺失定为 warn（非 fail）**，与 embedding 预检口径一致（`src/mcp-server.ts:694-714`），避免未使用对话功能的用户升级后自检变红 |
| `src/lib/config-schema.ts` | 新增 llm 段校验 | 既有配置（无 llm 段）必须保持可加载（可选字段，不报错） |
| `src/lib/mcp-http-api.ts` | 新增路由 + 白名单 | 现有 13 条路由行为不变；鉴权分支不得放宽 |
| `src/config.ts` | 模板新增 llm 段注释 | 模板生成结果需通过 schema 校验 |

## 7. 待定问题

| 问题 | 影响 | 处理时机 |
|---|---|---|
| 上游模型消耗展示是否需要单价（用于估算金额） | 影响面板用量文案 | 前置门③（价目表确认）后定 |
| 是否需要多套 llm 配置（多模型切换） | 影响配置结构与 R12 | 本期不做，D8 已定"用户配置单模型" |

## 8. 不在范围内

多模型切换器与模型列表拉取、代理/中转配置、上游重试退避策略（仅供 `retryable` 标记由前端决定重试）、embedding 配置的任何变更。

---

## 9. v2 修订（2026-09-25，D13 检索与工具调用）

> 变更来源：`S07_检索与工具调用_DESIGN.md`｜拍板依据：T9 / T10 / T11 / T12
> **修订原则**：本节**覆盖**前文冲突处；未提及的条款继续有效。数值以本节为准，结构（如"双层超时"）不变。

### 9.1 `LlmConfig` 新增字段（接 §3 的接口定义）

```ts
export interface LlmConfig {
  // ...v1 字段（baseURL/model/apiKey/maxTokens/temperature/requestTimeoutMs/
  //            firstByteTimeoutMs/defaultSystemPrompt/supportsImages/...）全部保留
  supportsTools?: boolean;      // 默认 true：模型是否支持 function calling（T10）
                                //   false → 走预检索降级（S07 §3.7）
  kbDisclosureAck?: boolean;    // 默认 false：用户是否已确认"知识库内容外发"（T12）
                                //   false → 面板阻塞发送并弹一次性确认（S07 §3.8 / S03 §9.4）
}
```

**`supportsTools` 为何默认 true**：T10 拍板口径为"不支持时降级"，而非"未声明即禁用"。默认 false 会让所有用户的首次体验直接落到降级路径，与"保住检索价值"的决策相悖。误判由 §9.4 的探测兜底。

### 9.2 超时预算重估（**覆盖** §3.1 与 §4 表中的 180s）

| 项 | v1 | v2 | 理由 |
|---|---|---|---|
| `requestTimeoutMs` | 180000 | **300000** | D13 后整体时长 ≈ N 轮检索 + N 轮生成（N ≤ 3，reasoning 单轮首答最坏 12s 量级） |
| `firstByteTimeoutMs` | 30000 | **30000（不变）** | 仅约束"建立连接并收到首个 chunk"，**不约束工具轮次** |

> **工具循环自身的预算（轮次上限 / 单次条数 / 片段截断）定义在 `S07 §3.4`（SSOT），本文件不重复定义**，避免双源漂移。

### 9.3 `llm-client` 职责扩展

签名扩展为 `streamChat(messages, opts & { tools?: ToolDef[] })`：

| 能力 | 要求 |
|---|---|
| 传 `tools` | 透传上游请求体；**无 `tools` 时行为与 v1 完全一致**（回归点） |
| 解析 `tool_calls` | 流式增量 `delta.tool_calls` 必须**按 `index` 累积拼接**（首块给 `id`/`name`，后续块给 `arguments` 片段）—— 这是流式 function calling 的标准陷阱，不可用"最后一块覆盖"的写法 |
| 产出事件 | 回合结束时发 `{type:'tool_calls', calls:[...]}`（完整调用列表，供 S07 的 tool-loop 消费） |
| reasoning 隔离 | **不变量，v2 继续有效**（工具轮次中同样适用：reasoning 永不进 `messages`） |
| 工具不支持类错误的识别 | 上游返回"tools not supported"类 400 → 归一化为可识别信号，供 S07 §3.7 触发降级（而非当作普通 502） |

### 9.4 文件改动增量（接 §3 与 §6）

`src/lib/llm-client.ts` 从"上游调用 / SSE 解析 / 事件归一化"扩展为**同时支持 tools 参数与 tool_calls 累积**；新增 `src/lib/retrieval/*`（4 个文件，见 S07 §3.1）。
`src/lib/config.ts` / `config-schema.ts` 新增 §9.1 两字段校验（均为可选，旧配置无此字段须正常加载 —— 回归点）。
