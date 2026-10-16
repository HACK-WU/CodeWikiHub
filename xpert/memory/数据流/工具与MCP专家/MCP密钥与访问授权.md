---
groupPath: 数据流/工具与MCP专家
relation: MCP密钥与访问授权
exportedAt: "2026-10-16T07:28:46.847Z"
---
【数据流｜MCP密钥与访问授权】
- 实体类型：表（凭据 + 组织准入 + 相邻的调用审计与长任务台账，同属 mcp-publication 八表）
- 结构 `mcp_api_key`：`publicationId`(`CASCADE`)、`name`(100)、**`keyPrefix`(32，明文可检索)**、**`keyHash`(char 64，`select:false` + `@Exclude`)**、**`encryptedSecret`(text，`select:false` + `@Exclude`)**、`subjectType`(24)/`subjectId`、`scopes`(json)、`expiresAt`/`lastUsedAt`/`revokedAt`/`revokedById`；**唯一 `keyHash`** + **唯一 `keyPrefix`**
- 结构 `mcp_oauth_policy`：`publicationId`(**OneToOne nullable:false CASCADE**)、`issuer`/`audience`(text)、`requiredScopes`(json)、`subjectMapping`(json)、`introspectionEnabled`/`introspectionEndpoint`/`introspectionClientId`、`introspectionClientSecretEncrypted`(text，`select:false` 但**无 `@Exclude`**)、`introspectionClientSecretConfigured`(布尔位)、`enabled`；**唯一 `(publicationId)`**
- 结构 `mcp_publication_access`：`publicationId`(`CASCADE`, not null)、`enabled`、`enabledById`、`disabledAt`/`disabledById`；**唯一 `(publicationId,organizationId)`**；无 HTTP 端点
- 相邻台账：`mcp_invocation_audit`（`publicationId` 是**全表唯一 RESTRICT**；`requestId` 唯一 ⇒ 一次调用恰一条；`status ∈ started|succeeded|failed|denied`；`argumentSummary` json `select:false` 只存 key 列表与字节数）；`mcp_task`（唯一 `taskId` + 唯一 `(publicationId,idempotencyKey)`，`inputHash` char 64，`status ∈ working|input_required|completed|failed|cancelled`，`revision` 普通 int **非乐观锁**）
- 生产方：`McpApiKeyService.create/rotate`（`xpert_mcp_` 前缀 + base64url(32B)；rotate = 旧键撤销 + 新键只回显一次）、`McpOAuthService`（`clientSecret` 省略=保留、`null`=清除、新值=轮换）、`McpPublicationAccessService.enable/disable`、`McpInvocationAuditService.start/succeeded/failed`、`McpTaskService.create/get/update/cancel`
- 主要消费方：`McpAuthenticationService.authenticate`（Key 分流：`keyPrefix` 命中 + `timingSafeEqual(sha256)`，过期即拒；要求 `authMethods` 含 `api_key`）、`McpOAuthService.authenticate/challenge`、`McpPublicationAuthorizationService.assertCanRun`（tenant/publication/organization 三者与共享发布准入）、GET `:id/api-keys`、GET `:id/audit`、`McpTaskProcessor`（queue `mcp-publication` job `execute-tool`）
- 撤销语义：`access`/`api_key` 用时间戳列（`disabledAt`/`revokedAt`）表达撤销而非删行；Key 明文 `secret` 只在创建 / 轮换响应回显一次
- 边界：OAuth 属 Pro 门禁（仓库两套 `environment` 均硬编码 `mcpOAuthEnabled=false` ⇒ 一律 403 `Error.McpOAuthProOnly`）；`introspectionClientSecretEncrypted` 只有 `select:false`、没有 `@Exclude`，是唯一「可被序列化带出」的密文列
- 详细流向：见 .module-experts/后端专题/工具与 MCP 专家/implementation/{03-数据流转.md,04-模型.md,07-运维.md}；决策见 C5-关键决策.md §D7/§D8