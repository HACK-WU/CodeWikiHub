---
groupPath: 数据流/身份与权限
relation: organization
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜organization】
- 实体类型：表（Organization extends TenantBaseEntity，**无 organizationId 列**）
- 结构：name、isDefault、isActive、inviteExpiryPeriod、invitesAllowed、currency/defaultValueDateType（非空）、profile_link（无唯一索引，公开链接按它查）、一组 show_*
- 生产方：OrganizationService.create（组织创建用例、外部联系人邀请接受用例）、组织 seed
- 主要消费方（11 个模块）：organization、auth、invite、model-access、email、user-group、user-organization、membership、xpert-project、factory-reset、xpert-project-access
- 业务用途：用户的工作上下文与数据范围边界，也是默认组织与邀请过期策略的载体
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md