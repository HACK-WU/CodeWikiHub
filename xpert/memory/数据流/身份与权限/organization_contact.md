---
groupPath: 数据流/身份与权限
relation: organization_contact
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜organization_contact】
- 实体类型：表（OrganizationContact extends TenantOrganizationBaseEntity）
- 结构：name（索引）、primaryEmail、primaryPhone、inviteStatus（ContactOrganizationInviteStatus）、contactType、budgetType；emailAddresses/phones 只有 API 声明、无列
- 生产方：organization-contact 模块；邀请链在联系人路径把 inviteStatus 置 INVITED / ACCEPTED
- 主要消费方（2 个模块）：organization-contact、invite
- 业务用途：外部联系人档案，兼作联系人邀请的状态位
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md