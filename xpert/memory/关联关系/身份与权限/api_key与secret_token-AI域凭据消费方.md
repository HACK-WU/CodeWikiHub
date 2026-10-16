---
groupPath: 关联关系/身份与权限
relation: api_key与secret_token-AI域凭据消费方
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] api_key / secret_token 与 AI 域凭据消费方
强度：必改——改 `IApiPrincipal` 形状、`resourceScope` 语义或 `SecretTokenBindingType` / `ApiKeyBindingType` 取值 → 全部凭据消费入口必改（鉴权与资源范围判定会错位）；改消费方内部处理 → 凭据模块不用管
原因：`IApiPrincipal` 是跨包契约（contracts），多种凭据归一为同一 principal；绑定类型枚举的取值直接决定「以谁的身份、能访问什么范围」

凭据端：
- IApiPrincipal / API_PRINCIPAL_USER_ID_HEADER @ packages/contracts/src/api-key.model.ts
- SecretTokenBindingType / SecretTokenStrategy.resolve*Principal @ packages/contracts/src/secret-token.model.ts 与 packages/server/src/secret-token/secret-token.strategy.ts
- ApiKeyService.resolvePrincipal @ packages/server/src/api-key/api-key.service.ts

消费方：
- 入口守卫 ApiKeyOrClientSecretAuthGuard @ packages/server/src/shared/guards/api-key-or-client-secret.guard.ts
- AI 对外面：enterprise-chatkit（AccountBinding/Integration/SecretToken）@ packages/server-ai/src/xpert/enterprise-chatkit.module.ts
- 执行与模型：agent-invocation / xpert-agent-execution / model-execution / model-gateway @ packages/server-ai/src/
- 会话与发布：chat-conversation / mcp-publication @ packages/server-ai/src/