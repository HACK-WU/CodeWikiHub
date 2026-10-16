---
groupPath: 关联关系/身份与权限
relation: user-下游消费域
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] user 实体 与 下游 36 个消费模块
强度：必改——改 user 的对外列语义（type / email / deletedAt 软删 / roleId / refreshToken 语义）→ 所有消费方必改；改 user 服务内部查询实现 → 消费方不用管
原因：user 是全仓被依赖最多的身份实体（36 个模块），凭据解析、判权、项目成员、计费与投递都从它取主体

user 端：
- User @ packages/server/src/user/user.entity.ts
- UserService（findCurrentUser / getUserByEmail / deleteWithGuards / ensureCommunicationUser）@ packages/server/src/user/user.service.ts

主要消费方：
- auth / account-binding / api-key / secret-token（主体解析）@ packages/server/src/{auth,account-binding,api-key,secret-token}/
- role / role-permission / user-organization / user-group（归属与判权）@ packages/server/src/{role,role-permission,user-organization,user-group}/
- 计费与投递：membership / model-access / model-gateway / copilot-usage @ packages/server-ai/src/
- 业务域：xpert-project / xpert-project-access / xpert-workspace / xpert-task / agent-invocation / mcp-publication / handoff-queue / chat-group / chat-conversation @ packages/server-ai/src/