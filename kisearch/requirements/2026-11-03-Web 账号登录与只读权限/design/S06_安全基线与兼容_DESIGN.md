---
id: REQ-20261103-001
feature: Web 账号登录与只读权限
status: 设计中
created: 2026-11-03
updated: 2026-11-03
version: 1
tags: [auth, web, security, ux]
depends_on: []
author: AI
document_type: design
---

# S-06 安全基线与兼容

> 父设计：[DESIGN.md](./DESIGN.md)
> 依赖：S-02（Principal）、S-03（能力门禁）
> 关联需求：[requirement.md](../requirement.md)

## 1. 术语

| 术语 | 含义 |
|---|---|
| local-admin | 源地址 + Host 双回环的本机管理员 |
| CSRF | 跨站请求伪造；本设计重点防「恶意网页以本机管理员身份调 `/api`」 |
| Origin 白名单 | 浏览器写请求的 `Origin` 必须与请求 Host 同源 |
| XFF | `X-Forwarded-For` / `X-Real-IP` / `Forwarded`；出现即不判 local-admin |
| 最终防线 | 服务端能力门禁；UI 隐藏/禁用只是体验 |

## 2. 现状（AS-IS）

- `/api/*` 只校验来源与 Bearer，不校验 `Origin`、`Host`、`Content-Type`（`src/lib/mcp-http-api.ts:524-543`）。
- `readJsonBody` 不看 Content-Type，`text/plain` 的 JSON 也会被解析（`src/lib/mcp-http-api.ts:362-383`）。
- 回环来源免鉴权；反向代理 / SSH 隧道会让远程请求看起来来自回环（`docs/mcp-http.md:243`）。
- `--allowed-hosts` 只传给 `/mcp` 传输层（`src/lib/mcp-http.ts:893`），不保护 `/api/*`，且默认关闭。
- 非回环启动当前强制要求 Token（`src/mcp-server.ts:174-186`），没有「有账号即可」的路径。

## 3. 方案（TO-BE）

### 3.1 local-admin 判定（收紧）

```ts
function isLocalAdminRequest(req: IncomingMessage, clientAddr: string | undefined, cfg: KiConfig): boolean {
  if (cfg.mcp?.http?.localAdmin === false) return false;
  if (!isLoopbackAddr(clientAddr)) return false;
  if (hasForwardedHeaders(req)) return false;
  return isLoopbackHostHeader(req.headers.host);
}
```

- `clientAddr` 由 `ApiRequestCtx.clientAddr` / `resolveClientAddr(req)` 传入；默认取 `req.socket.remoteAddress`，**不信任 XFF**。
- `isLoopbackHostHeader` 解析 Host（去端口）：允许 `127.0.0.1`、`localhost`、`[::1]`、`::1`；其余一律不判本机。
- 出现 `X-Forwarded-For` / `X-Real-IP` / `Forwarded` 任一 → 不判本机（防止 nginx/frp 把远程伪装成本机）。
- 配置 `mcp.http.localAdmin: false` 或启动参数 `--no-local-admin` 可关闭本机免登录（CLI 参数优先）。

### 3.2 CSRF 防护

对 `POST/PUT/PATCH/DELETE`：

1. `SameSite=Strict` 会话 Cookie（S-02）。
2. 若请求带 `Origin`：Origin 的 **host + port** 必须与请求 Host 一致；scheme 允许 `http` / `https`（TLS 由代理终止，服务端无法可靠区分，不信任 `X-Forwarded-Proto`）；否则 403 `CSRF_ORIGIN_REJECTED`。
3. 若请求带 `Origin` **且有请求体**：Content-Type 必须是 `application/json` / `application/*+json`；否则 415 `UNSUPPORTED_CONTENT_TYPE`。无 body 的 POST（如 `logout`）跳过此检查。
4. 若请求无 `Origin` 但带 `Sec-Fetch-Site: cross-site`：403。
5. 无 `Origin`、无 `Sec-Fetch-Site`：按非浏览器客户端处理（Bearer Token / 本机脚本），放行到能力门禁。
6. 只对 `POST/PUT/PATCH/DELETE` 生效；GET/HEAD 不校验 Origin。

> 恶意网页发起的跨站请求一定会带 `Origin`（含 `text/plain` 简单请求），因此 Origin 校验能覆盖 CSRF；本机脚本与 MCP 客户端不受影响。

### 3.3 认证端点加固

- 登录/登出/改密响应加 `Cache-Control: no-store`。
- 所有 `/api` 响应加 `X-Content-Type-Options: nosniff`。
- 登录失败日志脱敏：只记 `clientAddr`、`usernameLower`、结果；不记密码。
- 登录限速见 S-02（5 次 / 5 分钟 / IP+用户名）。

### 3.4 启动守卫

`src/mcp-server.ts:174-186` 改为：

```
非回环绑定，按凭据状态分支：
  users.json 损坏
    → 拒绝启动 USER_STORE_CORRUPT（提示 ki user list）
  无 Token + 无账号
    → 拒绝启动 MCP_HTTP_TOKEN_REQUIRED
      提示：ki mcp token generate --scope <...> 或 ki user create <name> --role admin
  无 Token + 账号全部禁用
    → 拒绝启动 MCP_HTTP_ALL_ACCOUNTS_DISABLED
      提示：ki user enable <name> 或 ki user create <name> --role admin
  仅 Token
    → 允许启动；警告「无可用 Web 账号，Web 登录不可用」
  仅启用账号
    → 允许启动；警告「MCP 远程客户端仍需 Token」
  Token + 启用账号
    → 允许启动，正常提示
```

- 回环绑定行为不变：免鉴权、不校验存储。
- 启动 stderr 明示：`鉴权：开启，需 Bearer Token`；若只有账号没有 Token，追加「MCP 客户端仍需 Token；Web 登录使用账号」。

### 3.5 反向代理 / 隧道

- 文档明确：代理必须保留 `Host` 或设置 `XFF`；否则远程可能被误判为 local-admin。
- 对外暴露时建议 `--no-local-admin` 或 `mcp.http.localAdmin: false`，并在代理层做鉴权。
- `/mcp` 的 `--allowed-hosts`（DNS rebinding 保护）保持现状；本设计新增的 Host 校验只作用于 local-admin 判定，不替代 `--allowed-hosts`。

### 3.6 兼容性

| 对象 | 行为 |
|---|---|
| Bearer Token 客户端 | 不变；无 Origin 时按非浏览器放行；scope/readOnly 逻辑保持 |
| 本机 CLI / 脚本 | 无 Origin；源地址回环 + Host 回环 → local-admin；可用 `--no-local-admin` 关闭 |
| `/healthz` / 静态页面 | 公开，不加鉴权 |
| 非回环启动 | 由「必须有 Token」改为「Token 或账号至少一个」 |
| 旧 Token 只读边界 | 仍只约束 `/mcp`；`/api` 行为不变（见 S-03 决策） |
| 已有任务/日志 | 无 operator 显示 `—`；不改旧文件 |

### 3.7 关键决策

| 决策 | 采用 | 被否决方案 | 否决理由 |
|---|---|---|---|
| CSRF 防护 | SameSite + Origin + JSON Content-Type | 引入 CSRF Token | 多一套 token 生命周期；SameSite+Origin 已覆盖浏览器场景 |
| local-admin 判定 | 源地址 + Host + 无 XFF | 仅源地址 | 代理/隧道会把远程当本机 |
| 代理场景 | 文档 + `--no-local-admin` | 自动信任 `X-Forwarded-*` | 头可伪造，自动信任会扩大攻击面 |
| 登录限速 | 内存计数 | 持久化/分布式限速 | v1 单机单进程，重启清零可接受 |
| TLS | 交代理/部署层 | 内置 HTTPS | 不在本期范围；文档说明 Secure Cookie 限制 |

### 3.8 异常处理

| 场景 | 状态码 | 文案 |
|---|---|---|
| Origin 不同源 | 403 `CSRF_ORIGIN_REJECTED` | 请求来源不受信任 |
| Content-Type 非 JSON | 415 `UNSUPPORTED_CONTENT_TYPE` | 请求格式不支持 |
| Host 非回环但源地址回环 | 不判 local-admin → 401 | 请先登录 |
| 代理未保留 Host / 未设 XFF | 可能误判；启动/文档提示 | 建议 `--no-local-admin` |
| 非回环且无 Token/账号 | 启动失败 `MCP_HTTP_TOKEN_REQUIRED` | 给出两条创建凭据的命令 |
| 非回环、无 Token、账号全部禁用 | 启动失败 `MCP_HTTP_ALL_ACCOUNTS_DISABLED` | 给出 `ki user enable` / `ki user create` |
| 登录限速 | 429 `AUTH_RATE_LIMITED` | 请稍后再试 |

### 3.9 测试矩阵

- **local-admin**：`127.0.0.1`/`localhost`/`[::1]` × 回环源 → 管理员；`evil.com` + 回环源 → 非管理员；带 XFF → 非管理员；`--no-local-admin` → 非管理员。
- **CSRF**：同源 `Origin` + JSON → 放行；`evil.com` + `text/plain` → 403/415；无 Origin + Bearer → 放行；无 Origin + Cookie 写请求 → 非浏览器路径，按能力门禁。
- **限速**：5 次失败后 429；成功登录清零；不同用户名/来源互不影响。
- **启动守卫**：仅 Token / 仅账号 / 两者都无 三种组合。
- **Token 回归**：scope 越权 403、`/mcp` readOnly 只读、Bearer 优先于 Cookie。
- **代理仿真**：`Host: evil.com` + `X-Forwarded-For` + 回环源 → 不判 local-admin。

### 3.10 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/auth/request-security.ts` | 新增 Host/Origin/Content-Type/XFF 校验 |
| `src/lib/web-auth.ts` | local-admin 判定接入 |
| `src/lib/mcp-http-api.ts` | 认证响应 no-store、nosniff；CSRF 拒绝 |
| `src/mcp-server.ts` | 启动守卫；`--no-local-admin` |
| `src/lib/config-schema.ts` / `src/lib/config.ts` | `mcp.http.localAdmin` |
| `docs/mcp-http.md` / `docs/cli.md` / `README.md` / `AGENTS.md` | 安全边界、代理部署、账号与 Token 的关系 |
| `test/auth-security.test.ts` / `test/startup-guard.test.ts` | 新增 |

### 3.11 验收标准

- 恶意网页跨站 `text/plain` 写请求 → 403/415；同源 JSON 请求正常。
- `Host: evil.com` + 回环源 → 不自动管理员；`--no-local-admin` 下本机也需登录。
- 非回环绑定：只有账号可启动；只有 Token 可启动；都没有则失败并给出两条命令。
- 现有 Bearer 客户端全部回归通过；`/healthz` 与静态页仍公开。
- 文档明确：反向代理必须保留 Host 或设置 XFF；对外暴露建议关闭本机免登录。
