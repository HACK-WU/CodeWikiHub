---
groupPath: 数据流/身份与权限
relation: user
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user】
- 实体类型：表（User extends TenantBaseEntity）
- 结构：关键列 type（UserType，默认 USER）、thirdPartyId、email/username（普通索引，非唯一）、hash(@Exclude)、refreshToken(@Exclude)、emailVerified、roleId、deletedAt（软删）；1:1 employee；M2M tag_user
- 生产方：AuthService.register / signup / createRegisteredUser / registerVerifiedExternalIdentity；UserService.create / updateProfile / changePassword；用户 seed
- 主要消费方（25 个模块）：auth、account-binding、user、role、user-group、user-organization、email、health、tenant-admin-cli、factory-reset、chat-group、tenant、chat-conversation、handoff-queue + AI 侧 xpert-project、xpert-project-access、mcp-publication、agent-invocation、model-access、copilot-usage、membership、model-gateway、xpert-marketplace、xpert-task、xpert-workspace
- 业务用途：真人用户与 COMMUNICATION 技术用户的统一身份行，所有凭据与角色的挂载点
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md