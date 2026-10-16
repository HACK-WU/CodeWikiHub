---
groupPath: 关联关系/模型访问与计费
relation: membership_point_ledger-四方消费口径
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 积分账本 与 四个消费方（membership / copilot-usage / model-execution / model-gateway）
强度：必改——改账本列语义（source / pointsDelta / requestId+revision / gatewayRequestId / pricingStatus / usageChannel）或两个唯一索引 → 四个消费方必改（读模型会双计、投递会重复扣费）；改某一方内部实现 → 其它三方不用管
原因：单一账本被四方共用：facts 行与扣减行同表靠 source 区分、读侧用反连接避免双计，口径变更会同时影响计费、统计与对账

账本端：
- MembershipPointLedger @ packages/server-ai/src/membership/membership-point-ledger.entity.ts
- IDX_membership_ledger_source_reference / UQ_membership_ledger_model_usage_request_metric_revision

消费方：
- MembershipService.recordUsage / recordGatewayUsage（唯一写入口）@ packages/server-ai/src/membership/membership.service.ts
- ModelUsageLedgerService.recordTokenUsage / CopilotUsageService（读模型）@ packages/server-ai/src/copilot-usage/
- ModelExecutionMeteringService.finish（经 CopilotTokenRecordCommand 投递）@ packages/server-ai/src/model-execution/execution-metering.service.ts
- ModelGatewayService.finishCall + model-gateway-call-retention（归档插入）@ packages/server-ai/src/model-gateway/