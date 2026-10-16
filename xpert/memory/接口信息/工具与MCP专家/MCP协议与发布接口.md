---
groupPath: 接口信息/工具与MCP专家
relation: MCP协议与发布接口
exportedAt: "2026-10-16T07:28:46.846Z"
---
【接口信息｜MCP协议与发布接口】
- 子功能：通用 MCP 服务端会话（SDK 封装）、发布单管理与启停、能力发现与绑定、API Key 签发 / 轮换 / 吊销、OAuth 策略、调用审计与自检、对外运行面（streamable-http + 文件 + 长任务协议）、OAuth 元数据
- 所属模块：工具与 MCP 专家（子专家：MCP协议与发布）
- 接口列表（前缀：`/api/mcp/sse` + `/api/mcp/messages`；`/api/mcp-publications` 与 `/api/mcp-api-keys` 等；`/api/mcp/p/:slug`；`.well-known` 路径**不带 `/api`**）：
  - 服务端会话（`mcp` 模块 · `BaseMCPController`，类级 `@Public()`）：GET `/api/mcp/sse`、POST `/api/mcp/messages`（鉴权是协议层会话而非 `@Permissions`；`MCPModule` 全仓无装配点 ⇒ 当前未挂载）
  - 发布管理（类级 `RoleGuard` + `@Roles(SUPER_ADMIN)`，`ValidationPipe{forbidNonWhitelisted}`，共 22 条）：
    - POST/GET `mcp-publications`、GET/PATCH/DELETE `mcp-publications/:id`、POST `:id/{enable,disable}`（`assertCanEnable` 三重前置：`reviewStatus` 非 required + 有 enabled 能力 + 含 oauth 则有 enabled 策略）
    - GET `:id/available-capabilities`、`:id/available-capability-sources`、POST `mcp-capability-catalog/toolsets/:toolsetId/discover`、PUT `:id/capabilities`、PATCH `:id/capabilities/:capabilityId`
    - POST/GET `:id/api-keys`、POST `mcp-api-keys/:keyId/{revoke,rotate}`（`secret` 只回一次）；GET/PUT `:id/oauth-policy`、POST `:id/oauth-policy/test`（另加 `assertMcpOAuthEnabled()` ⇒ 非 Pro 一律 403 `Error.McpOAuthProOnly`）
    - GET `:id/audit`、POST `:id/test`、GET `:id/connection-info`
  - 运行面：ALL `/api/mcp/p/:slug`（类级 `@Public()`，Bearer 由运行时段校验 API Key / OAuth；streamable-http，含 `tasks/get|update|cancel` 长任务协议）；POST/GET `/api/mcp/p/:slug/files`（`@Public()` + `McpFilesGuard`，单文件上限 256MB）；GET `/.well-known/oauth-protected-resource/api/mcp/p/:slug`（`@Public()` + `assertMcpOAuthEnabled()`）
- 关键约束：认证统一由 `McpAuthenticationService.authenticate` 分流（`xpert_mcp_` 前缀走 Key：`keyPrefix` 命中 + `timingSafeEqual(sha256)`，否则 `assertMcpOAuthEnabled()` 后走 OAuth）；任务语义只挂协议、**没有 REST 轮询端点**；体积上限 2 MiB / 100 blocks / instructions 16000；请求头 `mcp-protocol-version` 与 `_meta` 必须同时等于 `MCP_PROTOCOL_VERSION='2026-07-28'`
- 主要错误码：401 `Error.McpApiKeyUnauthorized` · 403 `Error.McpPublicationAccessDenied`/`Error.McpOAuthProOnly` · 400 `Error.McpPublicationReviewRequired`/`RequiresCapability`/`RequiresOAuthPolicy` · `-32602` 幂等指纹不符、`-32603 McpTaskQueueUnavailable`
- 逐端点明细：见 .module-experts/后端专题/工具与 MCP 专家/implementation/05-接口.md 与 sub-experts/MCP协议与发布子专家/{C0,C1}.md