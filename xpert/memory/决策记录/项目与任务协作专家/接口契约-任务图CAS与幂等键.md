---
groupPath: 决策记录/项目与任务协作专家
relation: 接口契约-任务图CAS与幂等键
exportedAt: "2026-10-16T06:44:03.370Z"
---
【决策记录｜接口契约-任务图CAS与幂等键】
- 分类：接口契约
- 动机（避坑）：**现象 A** 图变更不带版本、并发覆盖；**现象 B** provider 快照每次同步都新建任务行，或允许通用写路径提供 provider 身份列；**后果** 任务图不可重放、依赖边（child/predecessor）指向两张行、旧快照覆盖新事实
- 决策（CAS）：并发控制分两层——项目行悲观锁 `lockProject`（`pessimistic_write`）做全域串行化，任务 `@VersionColumn revision` CAS 做行级兜底；`PUT /:id/task-graph`、派发与决策都要求 `expectedRevision`，`task.revision !== expectedRevision` → 409 `Conflict`（`ProjectTaskRevisionConflict`）
- 决策（幂等键）：`xpert_project_task` 上 `@Index(['projectId','providerKey','sourceKey'], { unique: true })` 硬约束「同一 provider 同一来源键只允许一行」；provider 投影任务 id 由 `projectTaskIdentity(projectId, provider, key)` 的 **sha256 派生稳定 UUID**，跨快照 id 稳定、图可重放；执行行另有 `(taskId,sourceKey)` 唯一索引作为「任务一次来源一行尝试」的第二重约束
- 背景约束（版本列边界）：全批**只有 `xpert_project_task.revision` 一处版本列**；`XpertTask` 无版本列，run-as 接受改用「配置 hash 条件更新」，语义更弱；项目行锁是全域最粗串行点（任务写/步骤写/批量/派发/决策/观察投影全部排队），热点项目成单点
- 背景约束（写保护）：`assertOrdinaryTaskInput` 从通用写路径拦下 13 个 provider/投影列（违者抛 `Owned`）；`assertNativeExecutionInput` 拦 host-owned 列；`projectTaskPlanSchema` 为 `.strict()`（多余字段 400）
- 被否决方案：允许通用写路径（`PUT /:id/tasks/:taskId`）提供 `providerKey`/`sourceKey`/`sourceRevision`/`revision` 等 13 个列——被 `assertOrdinaryTaskInput` 明确拒绝
- 重新评估触发条件：provider 契约变化（同一 provider 需多来源键、或同一来源键需并行多行）时，须同步 `projectTaskIdentity` 与两个唯一索引；`XpertTask` 也需要版本语义时再评估加列
- 已知绕锁面：`project-runtime-observation.handler.ts` 明写「Some legacy task writers do not take the Project lock. CAS also fences their concurrent decisions.」——存在绕过项目锁的历史写者，投影侧 CAS 是其唯一护栏
- 关联代码：file://packages/server-ai/src/xpert-project/entities/project-task.entity.ts、file://packages/server-ai/src/xpert-project/services/project-task-graph.service.ts、file://packages/server-ai/src/xpert-project/services/project-task-ownership.ts
- 证据来源：实现层 04-模型.md「校验规则」（`xpert_project_task(projectId,providerKey,sourceKey)`）；03-数据流转.md「链路四」（sha256 派生稳定 UUID）；源码逐字「Serialize snapshot acquisition too: an older snapshot cannot overwrite a newer one.」与「Some legacy task writers do not take the Project lock. CAS also fences their concurrent decisions.」；C5-关键决策.md §D4/§D6