---
groupPath: 数据流/模型访问与计费
relation: membership_point_ledger
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜membership_point_ledger】
- 实体类型：表（账本：事实行 + 扣减行共表，靠 source 区分）
- 结构：source、pointsDelta numeric(28,10)、tokenUsed、sourceReference（UNIQUE 索引）、requestId+revision+metricKey（UNIQUE 索引）、gatewayRequestId、chargedPoints/excessPoints、pricingStatus、settlementAmount/Currency、executionContext、usageChannel、actorId
- 生产方：ModelUsageLedgerService.recordTokenUsage / MembershipService.recordUsage / recordGatewayUsage / createLedger / adjustUserPoints / adjustPersonalPoints；purgeModelGatewayCallBatch 归档插入；deliver 回填 usageChannel/executionContext/actorId
- 主要消费方：membership（11 次）、copilot-usage（7 次，读模型）、model-execution（3 次）、model-gateway（2 次）[基于引用扫描，未深入验证]
- 业务用途：**全平台唯一的消费扣减与调整账本**；两个 UNIQUE 索引是「一次调用只计一次」的底线
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md