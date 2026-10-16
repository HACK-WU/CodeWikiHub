---
groupPath: 数据流/Agent演进专家
relation: job与队列
exportedAt: "2026-10-16T07:28:46.848Z"
---
【数据流｜job 与队列】
- 实体类型：表（`agent_evolution_job` 作业账本）＋ 宿主逻辑队列 `agent-evolution`（BullMQ `plugin-jobs`，owner `@xpert-ai/platform`）
- 结构 `agent_evolution_job`：`jobId`(`EVOJOB-<uuid>`)、`jobType`、`resourceId`、`status`、`value`(json 含 `queueJobId`/`errorCode`/`errorMessage`/`startedAt`/`completedAt` —— **这些不是列**）；**UQ `(…, jobId)`**；非唯一 idx `(…, resourceId, jobType)`
- 结构口径：`status` 列与 `value.status` **双写**；契约 `EvolutionJobStatus = queued|running|completed|failed|cancelled`（**无 `pending`**）；`cancelled` 无 HTTP 入口，只能直接改账本
- 生产方：`AgentEvolutionQueueService.enqueue`（**先落 job 账本再投递**：`attempts:3`/`backoffMs:1000`，成功回写 `queueJobId`；投递失败置 `failed` ＋ `errorCode:'queue_enqueue_failed'` 并抛出）、`EvolutionChangeService.prepare`（`change_preparation`）、`updateJobStatus`（processor 与 `change.process` 补偿分支）
- 六类 job 与并发：`change_preparation` 2 / `evaluation` 2 / `install` 1 / `shadow` 2 / `canary` 1 / `rollback` 1；由 `@PluginJobProcessor` 消费（`agent-evolution-queue.processor.ts`）
- 主要消费方：GET `/jobs/:jobId`（只回 `value` 投影，**未命中返回 `null` 且 HTTP 200**）、`change.process` 的补偿分支（非可推进状态时把残留活跃 job 收尾为 `completed`）、前端 `waitForJob`（60×1s 等待窗口 ≠ 作业超时）
- 用途：把耗时与外部调用（golden replay、install/rollback 调 provider）搬出请求线程，并给调用方一个可查询的中间态 —— **入队型端点因此返回 `EvolutionJob` 而非结果**
- 边界：入队与同步动作必须区分——`install|shadow|canary|rollback` 入队，`pause|activate` 同步返回；无「取消 job」端点、无按 `resourceId` 反查 job 的端点（尽管索引存在）；宿主 BullMQ 的 `removeOnComplete/removeOnFail` **只清队列 job，不清本表账本**
- 关键约束：未注入 Managed Queue 时 `@Optional()` 走 503 `Managed Queue is unavailable`
- 详细流向：见 .module-experts/后端专题/Agent 演进专家/implementation/{03-数据流转.md,07-运维.md}；决策见 C5-关键决策.md §D6