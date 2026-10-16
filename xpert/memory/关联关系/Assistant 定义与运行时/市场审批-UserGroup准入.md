---
groupPath: 关联关系/Assistant 定义与运行时
relation: 市场审批-UserGroup准入
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 市场审批落地 与 运行时准入（UserGroup 成员关系）
强度：必改——改审批落地方式（ensureAccessGroup 的托管三元组、命名、回写 accessGroupId）或 UserGroup 的 managed* 语义 → 准入查询的 userGroups join 与 hasRuntimeAccess 必改；改准入判定内部实现 → 审批侧不用管
原因：市场授权**没有独立 ACL 表**，审批结果直接写成 `xpert_to_user_group` 关系；而 accessGroupId 外键是 SET NULL、无反向同步 → 删组/改名后「记录 approved 但已无权限」

市场端：
- XpertMarketplaceService.approveRequest / ensureAccessGroup / hasRuntimeAccess @ packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts
- XpertAccessRequest.accessGroupId @ packages/server-ai/src/xpert-marketplace/xpert-access-request.entity.ts

准入与用户组端：
- Xpert.userGroups（@JoinTable xpert_to_user_group）@ packages/server-ai/src/xpert/xpert.entity.ts
- PublishedXpertAccessService.buildAccessibleQuery（userGroups join）@ packages/server-ai/src/xpert/published-xpert-access.service.ts
- UserGroupService（托管元数据 stripManagedMetadata）@ packages/server/src/user-group/user-group.service.ts