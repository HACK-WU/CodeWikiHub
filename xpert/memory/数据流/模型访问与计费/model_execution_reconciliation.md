---
groupPath: 数据流/模型访问与计费
relation: model_execution_reconciliation
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_execution_reconciliation】
- 实体类型：表（审计）
- 结构：callId、reviewerId、evidence、appliedAt、id=调用方 operationId；UNIQUE (tenantId, callId)
- 生产方：ModelExecutionReconciliationService.reconcile 追加；apply 回写 appliedAt
- 主要消费方：model-execution（5 次引用）[基于引用扫描，未深入验证]
- 业务用途：未知消费的人工核对证据与**不可覆盖的审计**（runbook 禁止估算补单）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md