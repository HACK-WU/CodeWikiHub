---
groupPath: 数据流/模型访问与计费
relation: copilot_organization
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜copilot_organization】
- 实体类型：表（用量聚合）
- 结构：聚合键 (tenantId, organizationId, provider, model)；tokenLimit、priceLimit、tokenUsed/tokenTotalUsed、priceUsed/priceTotalUsed、currency
- 生产方：CopilotOrganizationService.upsert；repair-organization-usage 可重建
- 主要消费方：copilot-organization（6 次）、copilot-usage（3 次）[基于引用扫描，未深入验证]
- 业务用途：组织级 token/金额限额与汇总（注意：聚合表读-改-写**无行锁与唯一索引兜底**）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md