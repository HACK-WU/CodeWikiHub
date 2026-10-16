---
groupPath: 关联关系/身份与权限
relation: role_permission-权限注解与默认矩阵
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] role_permission 表 与 全仓 @Permissions 注解 + 默认权限矩阵
强度：必改——新增/退役/重命名权限点字符串 → 所有 controller 的 @Permissions 注解、default-role-permissions 矩阵、syncDefaultRolePermissions 与前端权限常量必改；改 checkRolePermission 内部实现 → 注解侧不用管
原因：权限点是**裸字符串枚举**（非编译期强约束），注解与仓库矩阵是两份独立维护的真源，任一侧漏改会出现「注了永不生效」或「误放行」

权限端：
- RolePermissionService.checkRolePermission / syncDefaultRolePermissions / migratePermissions / purgeRetiredAnalyticsPermissions @ packages/server/src/role-permission/role-permission.service.ts
- default-role-permissions.ts（默认矩阵）@ packages/server/src/role-permission/
- PermissionsEnum（枚举来源）@ packages/common / @xpert-ai/contracts

注解与守卫端：
- @Permissions 装饰器 @ packages/common（server-common）
- PermissionGuard（缓存 key userPermissions:<tenantId>_<roleId>_<permissions>，TTL 5 分钟）@ packages/server/src/shared/guards/permission.guard.ts
- 各业务 controller 的 @Permissions('...') 注解（逐处排查）