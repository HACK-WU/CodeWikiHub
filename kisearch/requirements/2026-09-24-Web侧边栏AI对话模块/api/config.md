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

# 配置 API

> 所属需求：REQ-20260924-001｜基础路径：`/api/chat`｜错误码见 [INDEX.md §3](INDEX.md#3-错误码定义)

## API-01：查询模型配置状态

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 | GET |
| 路径 | `/api/chat/config` |
| 认证 | Bearer Token（启用鉴权且非回环时） |
| 权限 | 任意已授权 token |
| 限流 | 无 |
| 幂等 | 是 |
| 越权白名单 | **不登记**（不带 scope 参数） |

### 请求参数

无（不接受 `scope` 参数；模型配置为全局配置，不按 scope 区分）。

### 响应

#### 成功响应（200）

```ts
interface ChatConfigOk {
  ok: true;
  enabled: boolean;         // llm 配置是否就绪；false 时前端禁用发送
  model: string | null;     // 当前生效模型名（只读展示）
  baseURLHost: string | null; // 仅主机名，绝不回传 apiKey 或完整 URL 路径
  configPath: string;       // 配置文件路径（供 fail-loud 文案引用）
  requestTimeoutMs: number | null; // 生效的整体超时（供前端提示预期等待）
  reason: string | null;    // enabled=false 时的原因（人话）
  code: string | null;      // enabled=false 时的错误码（如 CHAT_DISABLED）

  // ── v2 新增（D13 检索与工具调用）─────────────────────────
  supportsTools: boolean;   // 模型是否支持 function calling（T10）；false → 走预检索降级
  retrievalEnabled: boolean; // 检索问答是否可用 = enabled && supportsTools 走任一降级分支均可答 && kbDisclosureAck
  ackRequired: boolean;     // 是否需要先做隐私确认（T12）；true → 面板阻塞发送并弹确认
  maxToolRounds: number;    // 工具调用轮次上限（T11，默认 3）；供前端展示预期与提示
}
```

> **`retrievalEnabled` 与 `supportsTools` 正交**（前端最容易写错处）：`retrievalEnabled = !ackRequired`（确认后即可检索）；`supportsTools` 只决定走**工具路径**还是**预检索降级路径**，不决定能否检索。完整对照表见本文档「关键代码设计」小节。

#### 错误响应

| HTTP Status | 错误码 | 说明 | 触发条件 |
|:---:|---|---|---|
| 401 | `UNAUTHORIZED` | 未认证 | 启用鉴权且 Bearer 无效 |
| 404 | `NOT_FOUND` | 路由不存在 | 方法不匹配（如 POST 到该路径） |

### Demo 请求示例

```bash
curl -s http://127.0.0.1:7423/api/chat/config
```

### Demo 响应示例

已配置：

```json
{
  "ok": true,
  "enabled": true,
  "model": "qwen3.8-flash",
  "baseURLHost": "token-plan.maas.qianwenaiapi.com",
  "configPath": "~/.ki/config.yaml",
  "requestTimeoutMs": 300000,
  "reason": null,
  "code": null,
  "supportsTools": true,
  "retrievalEnabled": true,
  "ackRequired": false,
  "maxToolRounds": 3
}
```

已配置但**未做隐私确认**（T12 首次使用）：

```json
{
  "ok": true, "enabled": true, "model": "qwen3.8-flash",
  "baseURLHost": "token-plan.maas.qianwenaiapi.com", "configPath": "~/.ki/config.yaml",
  "requestTimeoutMs": 300000, "reason": null, "code": null,
  "supportsTools": true, "retrievalEnabled": false, "ackRequired": true, "maxToolRounds": 3
}
```

未配置（缺 `llm` 段）：

```json
{
  "ok": true,
  "enabled": false,
  "model": null,
  "baseURLHost": null,
  "configPath": "~/.ki/config.yaml",
  "requestTimeoutMs": null,
  "reason": "未配置模型：请在配置文件的 llm 段填写 baseURL / model / apiKey",
  "code": "CHAT_DISABLED",
  "supportsTools": false,
  "retrievalEnabled": false,
  "ackRequired": false,
  "maxToolRounds": 3
}
```

> **v2 字段在 `enabled:false` 时仍需返回**（`supportsTools:false` / `retrievalEnabled:false`），前端可据此统一渲染禁用态，不必分两种分支判断。

> 注意：未配置时仍返回 **200 + `ok:true`**（配置缺失是可预期的产品状态，不是请求错误），由 `enabled:false` 表达；面板据此展示配置指引而非错误提示。

### 关键代码设计

#### 配置就绪判定

```ts
// src/lib/llm-client.ts
/** 工具轮次上限：SSOT = design/S07 §3.4 的 ToolLoopBudget.maxRounds（T11 拍板取 3） */
export const MAX_TOOL_ROUNDS = 3;

export interface LlmStatus {
  enabled: boolean; model: string | null; baseURLHost: string | null;
  requestTimeoutMs: number | null; reason: string | null; code: string | null;
  // ── v2（D13）
  supportsTools: boolean;      // 决定走【工具路径】还是【预检索降级路径】
  retrievalEnabled: boolean;   // 检索问答是否可用（= 已确认隐私）；与 supportsTools 正交
  ackRequired: boolean;        // 未确认 → 面板阻塞发送
  maxToolRounds: number;
}

export function resolveLlmStatus(cfg: KiConfig, configPath: string): LlmStatus {
  const llm = cfg.llm;

  const notReady = (reason: string): LlmStatus => ({
    enabled: false, model: null, baseURLHost: null, requestTimeoutMs: null,
    reason, code: 'CHAT_DISABLED',
    supportsTools: false, retrievalEnabled: false, ackRequired: false,
    maxToolRounds: MAX_TOOL_ROUNDS,
  });

  if (!llm?.baseURL || !llm?.model || !llm?.apiKey) {
    return notReady('未配置模型：请在配置文件的 llm 段填写 baseURL / model / apiKey');
  }
  const apiKey = resolveApiKey(llm.apiKey);   // 复用 src/lib/config.ts:428-438 的 ${ENV} 解析
  if (!apiKey) return notReady(`apiKey 引用的环境变量未设置：${llm.apiKey}`);

  let host: string;
  try {
    host = new URL(llm.baseURL).host;         // 解析失败视为配置错误
  } catch {
    return notReady(`baseURL 不是合法 URL：${llm.baseURL}`);
  }

  const supportsTools = llm.supportsTools ?? true;    // T10：默认开（不支持时降级，不是禁用）
  const ackRequired = llm.kbDisclosureAck !== true;   // T12：未确认 → 阻塞发送

  return {
    enabled: true, model: llm.model, baseURLHost: host,
    requestTimeoutMs: llm.requestTimeoutMs ?? 300_000, // v2：180s → 300s（D13 后重估，见 S01 §9.2）
    reason: null, code: null,
    supportsTools,
    retrievalEnabled: !ackRequired,   // ★ 确认后即可检索（工具路径或预检索降级路径）
    ackRequired,
    maxToolRounds: MAX_TOOL_ROUNDS,
  };
}
```

> **`retrievalEnabled` 与 `supportsTools` 是两个正交维度**（前端最容易写错的地方）：
> | `supportsTools` | `ackRequired` | 实际行为 |
> |:---:|:---:|---|
> | true | false | 正常检索问答（工具路径） |
> | false | false | **仍能检索**，走预检索降级 + `degraded` 标记（T10） |
> | true / false | true | **阻塞发送**，先做一次性确认（T12） |
>
> 即 `retrievalEnabled = !ackRequired`；`supportsTools` 只决定走哪条路径，**不决定能否检索**。

#### 为什么这样写

- **不缓存判定结果**：`llm` 段的读取走既有的 `runWithConfigSnapshot`（`src/lib/mcp-http.ts:595-599`），配置热更新后下次请求即生效；自行缓存会在改配置后长期返回旧状态
- **只暴露 host**：`apiKey` 与完整 baseURL 路径（可能含租户 id）不得出网到浏览器
- **`${ENV}` 解析复用既有实现**，不在 chat 模块另写一套，避免两处解析规则漂移
