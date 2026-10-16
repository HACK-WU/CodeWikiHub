---
groupPath: 决策记录/Agent演进专家
relation: 可靠性-入队型端点返回job不是结果
exportedAt: "2026-10-16T07:28:46.848Z"
---
【决策记录｜可靠性：入队型端点返回 job，不是结果】
- 分类：技术选型（队列 ＋ job 账本承载异步，可靠性口径）
- 动机（避坑）：**现象** 评估与发布在 HTTP 请求内同步执行（golden replay 逐 case 串行、install/rollback 调外部 provider）；**后果** 请求超时后调用方无法判断动作是否已发生，重试可能重复放量，且没有任何可查询的中间状态
- 决策：把耗时与外部调用全部队列化，并**先落账本再投递**——`enqueue` 写 `EvolutionJob{status:'queued'}`（`EVOJOB-<uuid>`）→ `queue.enqueue({attempts:3, backoffMs:1000})` → 回写 `queueJobId`；投递失败直接置 `failed` ＋ `errorCode:'queue_enqueue_failed'` 并抛出；worker 侧推 `running`（记 `startedAt`）→ 成功 `completed`、异常写 `evolution_job_failed` 后**重抛**交队列重试；状态由 `GET /jobs/:jobId` 可查
- 背景约束：队列恒定 `agent-evolution`；六个 job 类型并发 `change_preparation` 2 / `evaluation` 2 / `install` 1 / `shadow` 2 / `canary` 1 / `rollback` 1；`install|shadow|canary|rollback` 入队、`pause|activate` 同步——**前端必须按返回类型区分**；`GET /jobs/:jobId` 未命中返回 `null`（HTTP 200）而不是 404
- 被否决方案：无（未找到显式否决记录）；两处缺口属**未实现而非否决**——「取消 job」无 HTTP 入口（`cancelled` 只能改库）、`job.status` 判断里存在契约不存在的 `'pending'` 死分支
- 重新评估触发条件：需要「取消入队任务」或「按 resourceId 反查 job」时须新增端点并同时清理 `pending` 死分支；引入调度类动作应复用同一账本而不是另建状态表
- 失败面：投递失败不静默——账本 `failed` ＋ `queue_enqueue_failed` 且抛出；未注入队列走 503 `Managed Queue is unavailable`；HTTP 200 只代表「已入队」
- 关联代码：file://packages/server-ai/src/agent-evolution/application/agent-evolution-queue.service.ts、file://packages/server-ai/src/agent-evolution/application/agent-evolution-queue.processor.ts、file://packages/server-ai/src/agent-evolution/changes/change.service.ts
- 证据来源：C5-关键决策.md §D6；C0-使用总览.md 坑 7/10；implementation/02-实现.md「队列与作业」（「入队顺序是先落 job 账本再投递」）
- 详细资产：.module-experts/后端专题/Agent 演进专家/ C1-能力契约.md §2（`AgentEvolutionQueueService` 行）