---
groupPath: 关联关系/身份与权限
relation: external_identity_binding-SSO与社交登录
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] external_identity_binding 表 与 SSO / 社交登录策略
强度：必改——改 provider 命名空间、subjectId 语义或两条唯一索引（(tenantId,provider,subjectId) 与 (tenantId,provider,userId)）→ auth/sso 编排与 packages/auth 各策略必改；策略内部实现改动 → 绑定表不用管
原因：绑定表是「外部身份 ⇄ 系统用户」的一一映射契约，SSO 登录/注册/绑定三个入口都靠它判定是否可复用身份

绑定端：
- ExternalIdentityBinding @ packages/server/src/account-binding/external-identity-binding.entity.ts
- AccountBindingService（bindUser / resolveUser / isGhostUser / canReclaimLarkIdentity）@ packages/server/src/account-binding/

SSO / 社交端：
- auth/sso 三服务（discovery / binding / pending-challenge）@ packages/server/src/auth/sso/
- packages/auth 各策略（Auth0/Github/Google/Linkedin/Twitter/Facebook/Feishu 启用；Keycloak/Microsoft/Dingtalk 代码在但已注释禁用）@ packages/auth/src/