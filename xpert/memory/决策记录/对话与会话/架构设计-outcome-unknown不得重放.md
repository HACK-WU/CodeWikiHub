---
groupPath: 决策记录/对话与会话
relation: 架构设计-outcome-unknown不得重放
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜consumer_outcome_unknown 不得重放；本域不是 exactly-once】
- 分类：架构设计（可靠性语义）
- 动机：避坑——现象：消费进程在「结果已提交、收尾未完成」之间被杀，或 Bull ack 窗口未确认；后果：无法判定模型/CLI 是否真跑过，自动重试会重复执行（重复扣费、重复副作用）
- 决策：只提供**可重试投递 + 幂等消费**（at-least-once），**不是 exactly-once**；recover 只按 claim 记录的 executionId 查执行：终态则 processed，否则 consumer_ended_without_success；非终态一律 blocked + consumer_outcome_unknown，**不自动重放、不重启 CLI、不分配替代消费者**
- 背景约束：reserved 消费者可恢复同一 execution ID，started 之后只检查该执行；enqueue 成功只推后 nextAttemptAt（+30s），lost ack 会重发同一 messageId，重复由 inbox 唯一键 + orIgnore 兜底
- 被否决方案：自动重放模糊结果；重启 CLI；分配替代消费者（README 明写均不做）
- 重新评估触发条件：上游执行器提供幂等执行契约（可携带稳定 execution ID 去重）
- 关联代码：runtime-messaging/runtime-message-continuation.service.ts、runtime-message-inbox.service.ts、runtime-message.errors.ts
- 证据来源：runtime-messaging/README.md（第 6 条 + not exactly-once network or model execution，明写）