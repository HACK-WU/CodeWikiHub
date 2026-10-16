---
groupPath: 关联关系/模型访问与计费
relation: model_gateway_call-执行与网关共用表
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] model_gateway_call 与 两个写入方（model-execution / model-gateway）
强度：必改——改该表的列语义（source / reservedTokens / usageFact / settlementContext / bodyExpiresAt）或 CHECK 约束（source='external_api' ⇔ apiKeyId+publicationId 非空且 grantId 为空；source='execution_grant' 反之）→ 两个写入方与清理任务必改；改某一方内部实现 → 另一方不用管
原因：一张表承载两条来源不同的调用链（授权执行 / 网关外部调用），靠 source + CHECK 区分，字段与约束由双方共同消费

表与约束：
- ModelGatewayCall @ packages/server-ai/src/model-gateway/model-gateway-call.entity.ts
- purgeModelGatewayCallBatch（归档后删除，写账本）@ packages/server-ai/src/model-gateway/model-gateway-call-retention.ts

写入方：
- ModelExecutionAdmissionService.begin / MeteringService.finish / recoverAbandonedExecutionCalls @ packages/server-ai/src/model-execution/
- ModelGatewayService.startCall / finishCall / recordSettlementFailure / retryPendingSettlements @ packages/server-ai/src/model-gateway/model-gateway.service.ts