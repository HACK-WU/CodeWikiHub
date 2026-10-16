---
groupPath: 数据流/身份与权限
relation: role_permission
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜role_permission】
- 实体类型：表（RolePermission extends TenantBaseEntity）
- 结构：permission（PermissionsEnum 字符串，索引）、enabled（默认 false）、roleId（onDelete CASCADE）、tenantId
- 生产方：RolePermissionService.updateRolesAndPermissions（新租户批量落默认矩阵）、syncDefaultRolePermissions（增量对齐）、updatePermission/deletePermission、权限 seed
- 主要消费方（1 个模块）：role-permission（含判权回源查询 checkRolePermission）
- 业务用途：**实际授权结果的唯一数据源**——判权即「该行存在且 enabled = true」；多权限点为或语义
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md；缓存行为见其 C2-使用流程