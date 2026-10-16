---
groupPath: 数据流/模型访问与计费
relation: user_model_grant
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user_model_grant】
- 实体类型：表（授权台账）
- 结构：userId、requestId、copilotId、copilotModelId、status、validUntil、approvedAt、revokedAt/Reason、modelSnapshot；两个部分唯一索引（active 且 org NULL / 非 NULL）
- 生产方：ModelAccessService.approveRequest 写入；extendGrant / revokeGrant / processDueGrants / reconcileGrantAvailability 更新
- 主要消费方：model-access（19 次引用）[基于引用扫描，未深入验证]
- 业务用途：「谁能用哪个模型」的可审计授权凭证；读路径 resolveModelAccess/getCatalog 以 grant 与 membership 求交
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md