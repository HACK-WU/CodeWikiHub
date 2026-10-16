# 任务计划与调度子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（项目与任务协作专家）
- **资产路径**：`.module-experts/后端专题/项目与任务协作专家/sub-experts/任务计划与调度子专家/`
- **职责**：本子专家负责 **「任务怎么被拆、依赖怎么表达、谁来执行、什么算完成、周期任务怎么排」**：项目内任务图（`XpertProjectTaskService`、`ProjectTaskGraphService`、`projectTaskIdentity`）、步骤与进度（`updateTaskSteps`、`assertProjectTaskProgress`）、执行派发运行时（`runtime/**`：派发意图固化、Invocation 提交、回执投影、验收决策、读模型、补偿扫描、资源卡）、计划族（`XpertProjectPlanService`，plan → milestone / sprint → swimlane）、独立任务体系（`XpertTaskService` + `xpert_task*` 六表 + 三套调度机制），以及 Agent 工具与视图面。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-project 的任务图面（project-task-graph.controller · services/project-task-* · runtime/** · plugins/project-tasks/**）与计划族（project-planning.controller · services/project-plan.service）`
  - `server-ai/src/xpert-task（全部：任务/模板/自动任务/调度/日程便签/run-as）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 两套任务体系别改错表：`xpert_project_task*` 是项目内任务（provider 快照 + `revision` CAS + Invocation 投影），`xpert_task*` 是独立周期调度（cron + 租约台账）；两者状态机、可见性与权限口径完全不同。
  - 任务图幂等键 `unique(projectId, providerKey, sourceKey)`：provider 投影任务的 id 由 `projectTaskIdentity(projectId, provider, key)` 的 sha256 派生为稳定 UUID；手工改这三列会破坏重放稳定性与依赖边指向。
  - `@VersionColumn revision` 乐观锁只此一处：`PUT /:id/task-graph`、派发与决策都要 `expectedRevision`，不匹配即 409 `Conflict`；`XpertTask` 无版本列，run-as 只能用配置 hash 条件更新（语义更弱）。
  - 执行派发三唯一索引：`IDX_project_task_execution_invocation(invocationId)`、`IDX_project_task_execution_dispatch(projectId,createdById,dispatchRequestId)`、`(taskId,sourceKey)`——同 `dispatchRequestId` 但意图/scope/target 不一致即 409 `Conflict`（防护生效而非故障）。
  - `dispatchIntent(select:false)` 是服务端恢复意图：含 prompt/target/replyTo；恢复链与备份、数据修复脚本必须显式 `addSelect('attempt.dispatchIntent')`，否则补偿不可用；它绝不可序列化到任务视图。
  - `dispatchState` 状态机只有一位持久迁移：`pending`（意图与尝试已提交，扫描器重放）→ `submitted`（已拿到启动回执，由 `submit` CAS 推进）；`invocationStatus` 等是读投影，别指望在库里查到。
- **测试状态**：1. 本子域 spec 清单与覆盖点（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
