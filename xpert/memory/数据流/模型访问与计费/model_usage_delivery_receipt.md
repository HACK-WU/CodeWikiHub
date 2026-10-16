---
groupPath: 数据流/模型访问与计费
relation: model_usage_delivery_receipt
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_usage_delivery_receipt】
- 实体类型：表（投递回执）
- 结构：providerScopeId、requestId、payloadFingerprint、status、userRollupDeliveredAt、organizationRollupDeliveredAt、completedAt；UNIQUE (tenantId, providerScopeId, requestId)
- 生产方：CopilotTokenUsageDeliveryService.deliver（orIgnore 插入 + 悲观锁读回 + 回写）
- 主要消费方：copilot-user（2 次）、copilot-usage（1 次）[基于引用扫描，未深入验证]
- 业务用途：用量投递幂等与「事实 vs 已入账」分界的唯一凭据（捕获 ExceedingLimit 时必须查到 status='completed' 才算已投递）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md