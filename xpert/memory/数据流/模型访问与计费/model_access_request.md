---
groupPath: 数据流/模型访问与计费
relation: model_access_request
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_access_request】
- 实体类型：表（业务事务表）
- 结构：channel、requesterId、copilotId、copilotModelId、modelType、status、reason、decidedById/At、modelSnapshot
- 生产方：ModelAccessService.createRequest / withdrawRequest / rejectRequest / approveRequest / closeRequestForSystem
- 主要消费方：model-access（16 次引用）[基于引用扫描，未深入验证]
- 业务用途：个人模型访问申请的单一真源
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md