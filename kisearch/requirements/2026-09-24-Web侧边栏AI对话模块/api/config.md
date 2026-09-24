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
}
```

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
  "configPath": "/root/.ki/config.yaml",
  "requestTimeoutMs": 180000,
  "reason": null,
  "code": null
}
```

未配置（缺 `llm` 段）：

```json
{
  "ok": true,
  "enabled": false,
  "model": null,
  "baseURLHost": null,
  "configPath": "/root/.ki/config.yaml",
  "requestTimeoutMs": null,
  "reason": "未配置模型：请在配置文件的 llm 段填写 baseURL / model / apiKey",
  "code": "CHAT_DISABLED"
}
```

> 注意：未配置时仍返回 **200 + `ok:true`**（配置缺失是可预期的产品状态，不是请求错误），由 `enabled:false` 表达；面板据此展示配置指引而非错误提示。

### 关键代码设计

#### 配置就绪判定

```ts
// src/lib/llm-client.ts
export function resolveLlmStatus(cfg: KiConfig, configPath: string): {
  enabled: boolean; model: string | null; baseURLHost: string | null;
  requestTimeoutMs: number | null; reason: string | null; code: string | null;
} {
  const llm = cfg.llm;
  if (!llm?.baseURL || !llm?.model || !llm?.apiKey) {
    return { enabled: false, model: null, baseURLHost: null, requestTimeoutMs: null,
      reason: '未配置模型：请在配置文件的 llm 段填写 baseURL / model / apiKey',
      code: 'CHAT_DISABLED' };
  }
  const apiKey = resolveApiKey(llm.apiKey);   // 复用 src/lib/config.ts:428-438 的 ${ENV} 解析
  if (!apiKey) {
    return { enabled: false, model: null, baseURLHost: null, requestTimeoutMs: null,
      reason: `apiKey 引用的环境变量未设置：${llm.apiKey}`,
      code: 'CHAT_DISABLED' };
  }
  let host: string;
  try {
    host = new URL(llm.baseURL).host;         // 解析失败视为配置错误
  } catch {
    return { enabled: false, model: null, baseURLHost: null, requestTimeoutMs: null,
      reason: `baseURL 不是合法 URL：${llm.baseURL}`, code: 'CHAT_DISABLED' };
  }
  return { enabled: true, model: llm.model, baseURLHost: host,
    requestTimeoutMs: llm.requestTimeoutMs ?? 180_000, reason: null, code: null };
}
```

#### 为什么这样写

- **不缓存判定结果**：`llm` 段的读取走既有的 `runWithConfigSnapshot`（`src/lib/mcp-http.ts:595-599`），配置热更新后下次请求即生效；自行缓存会在改配置后长期返回旧状态
- **只暴露 host**：`apiKey` 与完整 baseURL 路径（可能含租户 id）不得出网到浏览器
- **`${ENV}` 解析复用既有实现**，不在 chat 模块另写一套，避免两处解析规则漂移
