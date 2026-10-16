# 项目与任务协作专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/项目与任务协作专家/`
- **职责**：本专家负责 **「项目与任务怎么被定义、组织、排期、派发与验收」**——即项目与任务的**业务决策面**：项目聚合根与项目类型（`XpertProjectService`、`XpertProjectTypeService`）、成员与四层准入（`guards/**`、`XpertProjectAccessService`）、项目资源与内容（助手 M2M、工具集/知识库/附件、`project.md` 与 `skills/`、资产索引）、项目内任务图与执行派发（`XpertProjectTaskService`、`ProjectTaskGraphService`、`runtime/**`）、计划族（plan/milestone/sprint/swimlane）、活动流、独立于项目的定时与自动化任务（`XpertTaskService`、`ScheduledTaskExecutionCoordinator`），以及平台级业务领域字典（`BusinessAreaService`）。
- **子专家**：子专家①[项目本体与资源子专家](file://.module-experts/后端专题/项目与任务协作专家/sub-experts/项目本体与资源子专家/C0-使用总览.md) · 子专家②[任务计划与调度子专家](file://.module-experts/后端专题/项目与任务协作专家/sub-experts/任务计划与调度子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/xpert-project（122 非 spec / 18 表 / 102 路由）`
  - `server-ai/src/xpert-task（35 / 6 表 / 35 端点）`
  - `server/src/business-area（5 / 1 表）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 四层准入不可绕过：`@Public()` 只跳过全局 JWT 守卫（≠放行）；真正准入是类级 `XpertProjectAuthGuard → XpertProjectFeatureGuard → XpertProjectPermissionGuard` + `@ProjectPermission`，方法级再叠加 `XpertProjectGuard`/`XpertProjectOwnerGuard`，最后的业务断言在 `XpertProjectAccessService`。
  - 两套任务体系别改错表：`xpert_project_task*` 是项目内任务（provider 快照 + `revision` CAS + Invocation 投影），`xpert_task*` 是独立周期调度（cron + 租约台账）；两者状态机、可见性与权限口径完全不同。
  - 执行表三个唯一索引：`IDX_project_task_execution_invocation(invocationId)`、`IDX_project_task_execution_dispatch(projectId,createdById,dispatchRequestId)`、`(taskId,sourceKey)`——`dispatchRequestId` 是派发重放保护，同 id 但意图不一致即 409 `Conflict`（防护生效而非故障）。
  - `@VersionColumn revision` 乐观锁：全批只有 `xpert_project_task.revision` 一处版本列；`PUT /:id/task-graph` 与派发都要求 `expectedRevision`，不匹配即 409 `Conflict`（`XpertTask` 无版本列，run-as 只能用配置 hash 条件更新）。
  - 任务幂等键 `unique(projectId, providerKey, sourceKey)`：provider 投影任务的 id 由 `projectTaskIdentity(projectId, provider, key)` 的 sha256 派生为稳定 UUID，snapshot 按 `providerKey` 比差写入；手工改这三列会破坏重放稳定性。
  - `projectTypeSnapshot` 是创建/发布时固化的展示快照：改类型定义不影响存量项目；快照绝不授权（源码注释「display snapshots never authorize app execution」），可用性一律以 `resolve()` 对当前已加载插件重解析为准。
- **测试状态**：spec 分布（61）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
