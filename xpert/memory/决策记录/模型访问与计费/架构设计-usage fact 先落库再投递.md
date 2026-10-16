---
groupPath: 决策记录/模型访问与计费
relation: 架构设计-usage fact 先落库再投递
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜usage fact 先落库再投递（outbox 式）】
- 分类：架构设计
- 动机：避坑：把账本写入放在上游调用返回的同一路径上 → 投递失败即丢费、重试又可能重复扣费，且无法区分「调用失败」与「已产生用量」
- 决策：model_gateway_call.usageFact 作为不可变事实先落库（deep-equal 拒绝同一 attempt 的第二份不同事实），再经既有 CopilotTokenRecordCommand 投递，model_usage_delivery_receipt 记回执；@Interval(30_000) 补投递 + recoverAbandonedExecutionCalls（未派发 → failed 释放预占；已派发 → settlement_pending 保留预占）
- 背景约束：投递通道可能部分失败；父 Assistant 与子 Invocation 分别展示，但一次模型调用只能扣一次费；事实与估算必须物理隔离
- 被否决方案：以估算（estimatedUsage）补记消费——估算被隔离在 estimate schema，永不进入事实 schema；对账 no_usage 也不允许伪造实际用量行
- 重新评估触发条件：出现「投递成功但事实缺失」的可复现案例；30 秒轮询延迟成为业务瓶颈
- 关联代码：execution-metering.service.ts、execution-recovery.ts、model-usage-delivery-receipt.entity.ts
- 证据来源：docs/model-execution.md（Usage facts are persisted before delivery to the ledger）+ docs/operations/model-execution-runbook.md