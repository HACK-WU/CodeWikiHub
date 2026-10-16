---
groupPath: 数据流/模型访问与计费
relation: user_membership_period
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user_membership_period】
- 实体类型：表（期次）
- 结构：membershipId、userId、planId、status（scheduled/active/completed/refund_pending/cancelled）、periodStart/End、pointsGranted、sourceReference+sourceSequence（UNIQUE）、planSnapshot
- 生产方：appendMembershipPeriods / activateScheduledPeriod / reserveFutureMembershipPeriodsForRefund / finalizeFutureMembershipPeriodsRefund / cancelScheduledMembershipPeriod
- 主要消费方：membership（17 次引用）[基于引用扫描，未深入验证]
- 业务用途：周期结算与退款预留的排期载体
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md