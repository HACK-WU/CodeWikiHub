---
groupPath: 数据流/模型访问与计费
relation: model_gateway_publication
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_gateway_publication】
- 实体类型：表（映射）
- 结构：copilotId、copilotModelId、provider、modelType、model、externalModelId、capabilities；UQ (tenantId, externalModelId) 与 (tenantId, copilotId, modelType, copilotModelId)
- 生产方：ModelAccessService.ensureAutomaticPublications（审批 ExternalApi 渠道时自动建）
- 主要消费方：model-access（4 次）、model-gateway（3 次）[基于引用扫描，未深入验证]
- 业务用途：把内部模型 ID 映射为对外可调用的 external model id
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md