---
groupPath: 数据流/模型访问与计费
relation: model_gateway_call
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_gateway_call】
- 实体类型：表（尝试/用量事实）
- 结构：source（external_api / execution_grant，**CHECK 互斥**）、requestId（UNIQUE）、grantId/apiKeyId/publicationId、status、reservedTokens、dispatchedAt、usageFact（select:false）、usageDeliveredAt、chargedPoints/excessPoints、settlementContext（select:false）、encryptedRequest/Response（select:false）、bodyExpiresAt
- 生产方：AdmissionService.begin（execution_grant）、ModelGatewayService.startCall（external_api）；dispatch/finish/finishCall/recordSettlementFailure/recoverAbandonedExecutionCalls 更新；purgeModelGatewayCallBatch 归档后删除
- 主要消费方：model-execution（10 次）、model-gateway（5 次）[基于引用扫描，未深入验证]
- 业务用途：一次上游尝试的准入预占、不可变用量事实与结算快照
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md