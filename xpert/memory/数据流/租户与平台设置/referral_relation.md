---
groupPath: 数据流/租户与平台设置
relation: referral_relation
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜referral_relation】
- 实体类型：表
- 结构：referral_relation 表（实体 ReferralRelation extends TenantBaseEntity）；关键列 referrerUserId / referredUserId（均 SET NULL）、usedCode、boundAt；唯一索引 tenant+referredUserId
- 生产方：ReferralService.bindRegistration（在 auth 注册事务内调用）
- 主要消费方：referral（管理端关系列表，含软删用户占位视图）
- 业务用途：返利关系账（谁邀请了谁），同一被邀请人在租户内只允许一条关系
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md