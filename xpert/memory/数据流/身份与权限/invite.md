---
groupPath: 数据流/身份与权限
relation: invite
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜invite】
- 实体类型：表（Invite extends TenantOrganizationBaseEntity）+ 关联表 invite_organization_contact（M2M）
- 结构：token（唯一索引）、**email（全局唯一索引）**、status（INVITED/ACCEPTED，无 EXPIRED）、expireDate（可空）、invitedById、roleId
- 生产方：InviteService.createBulk / createOrganizationContactInvite / resendEmail / update
- 主要消费方（3 个模块）：invite、organization（删除组织前查待处理邀请）、role（删除角色前查被邀请引用的角色）
- 业务用途：邮箱受邀状态的一次性凭据载体，同时在组织与角色删除时充当阻断条件
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md；状态机见其 implementation/03-数据流转