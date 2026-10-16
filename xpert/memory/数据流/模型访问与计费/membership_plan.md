---
groupPath: 数据流/模型访问与计费
relation: membership_plan
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜membership_plan】
- 实体类型：表（套餐定义）
- 结构：code、level、period、includedPoints、isDefault、allowedModels、modelMultipliers、rateLimits、catalogSourcePlanId
- 生产方：/api/membership/plans 写接口（MembershipService 套餐 CRUD / archivePlan）
- 主要消费方：membership（19 次引用）[基于引用扫描，未深入验证]
- 业务用途：额度、模型白名单、倍率与限流策略的来源
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md