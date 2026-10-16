---
groupPath: 数据流/身份与权限
relation: user_organization
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user_organization】
- 实体类型：表（UserOrganization extends TenantOrganizationBaseEntity）
- 结构：isDefault、isActive、preferences(jsonb)、userId、organizationId；**无 (user,organization) 唯一索引**，唯一性由服务层保证
- 生产方：UserOrganizationService.ensureMembership / ensureMembershipInTransaction / create / update；注册链事务内的成员创建；组织创建时的 onboarding 成员
- 主要消费方（13 个模块）：user-organization、auth、membership、xpert-project、agent-invocation、xpert-project-access、user-group、xpert-workspace、validator、factory-reset、chat-group、organization、handoff-queue
- 业务用途：用户归属的组织集合，承载「至多一个默认组织、至少一个活跃成员」两条不变量与用户偏好（默认工作区/引导标记）
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md