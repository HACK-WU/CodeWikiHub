---
groupPath: 数据流/身份与权限
relation: role
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜role】
- 实体类型：表（Role extends TenantBaseEntity）
- 结构：name（RolesEnum，索引）、isSystem（默认 false）、tenantId；1:N rolePermissions（cascade）；1:N users
- 生产方：RoleService.create（强制 isSystem=false）/ createBulk / update；角色 seed；租户 onboarding 的角色批量创建
- 主要消费方（9 个模块）：invite、tenant-admin-cli、role、validator、tenant、auth、seeder、role-permission、shared
- 业务用途：租户内可授予的能力模板，一个用户当前只挂一个角色（不随组织切换）
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md