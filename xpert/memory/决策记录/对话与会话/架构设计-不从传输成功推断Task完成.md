---
groupPath: 决策记录/对话与会话
relation: 架构设计-不从传输成功推断Task完成
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜不从传输成功推断 Task 完成；Invocation 是运行时账本】
- 分类：架构设计
- 动机：避坑——现象：队列 ack、enqueue 成功、SSE 收流被误当成「任务已完成」；后果：业务任务被提前判成功，验收决策失去依据（文档：Final acceptance and done decisions belong to stage 4）
- 决策：Invocation remains the runtime ledger / Project Tasks retain business decisions；本域只提供持久 outbox/inbox 与消费认领，**不注册第二个执行器**，也不从传输成功推断 Task 完成；Task 投影只把「实际开始」映 in_progress、成功映 review、失败映 blocked；Cancelling an Invocation does not cancel the Task
- 背景约束：自动投影要求「最新实施尝试 + 未变规范 + 捕获到的 task revision」，最终写用 revision CAS（部分 legacy writer 不取 Project 锁）
- 被否决方案：把传输成功当 Task 完成；另注册一个执行器（README 明写不这么做）
- 重新评估触发条件：Task 与 Invocation 的归属被重新划分，或需本域直接决定 done
- 关联代码：runtime-messaging/runtime-message-transport.service.ts、runtime-observation-monitor.service.ts、runtime-message.entity.ts
- 证据来源：runtime-messaging/README.md（首段 + Observation and Project projection 一节，明写）