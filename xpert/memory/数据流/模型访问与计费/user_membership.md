---
groupPath: 数据流/模型访问与计费
relation: user_membership
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user_membership】
- 实体类型：表（会员主表）
- 结构：userId、planId、status、source、renewalMode、currentPeriodStart/End、pointsGranted、pointsUsed、pointsTotalUsed、planSnapshot
- 生产方：assignUser / ensureTenantDefaultMembership / renewMembership / pauseUser / resumeUser / revokeUser / activateScheduledPeriod / processDueMembershipPeriods
- 主要消费方：membership（30 次引用）[基于引用扫描，未深入验证]
- 业务用途：用户当前会员额度与周期的权威投影（写路径集中在 membership 服务 + 每分钟周期结算）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md