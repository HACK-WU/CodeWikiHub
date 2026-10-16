---
groupPath: 数据流/模型访问与计费
relation: model_access_event
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_access_event】
- 实体类型：表（事件留痕）
- 结构：channel、requestId/grantId、eventType、actorType/Scope、fromStatus/toStatus、idempotencyKey（IDX_model_access_event_idempotency 唯一）、modelSnapshot
- 生产方：ModelAccessService.writeEvent（贯穿申请/审批/到期/撤销）
- 主要消费方：model-access（8 次引用）[基于引用扫描，未深入验证]
- 业务用途：每次状态迁移的幂等审计流水（自审阻断的前提是这条留痕有互证价值）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md