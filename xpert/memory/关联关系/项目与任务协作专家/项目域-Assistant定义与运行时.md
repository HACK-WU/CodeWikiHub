---
groupPath: 关联关系/项目与任务协作专家
relation: 项目域-Assistant定义与运行时
exportedAt: "2026-10-16T06:44:03.371Z"
---
[强关联] 项目与任务协作专家 与 Assistant 定义与运行时（项目域挂载 Assistant 家族）
强度：必改——改 B 端助手的「家族 / 版本 / 可用性」语义 → 本域绑定归一与可执行目标解析必改；改 A 端 M2M 挂载结构或解绑语义 → B 端「助手被哪些项目挂载」的反查与准入判定必改
原因：本域只持有 `xpert_project_xpert` M2M 与「当前版本」解析结果，**不持有助手定义**；可用性一律回落 `PublishedXpertAccessService`，且按「家族」而非版本快照比较（`isSameXpertFamily`），加同家族新版本不重复挂载
A 端（本域）：`XpertProject.xperts` M2M（`@JoinTable` → `xpert_project_xpert`）@ file://packages/server-ai/src/xpert-project/entities/project.entity.ts
A 端（本域）：`XpertProjectService.addXpert`（要求助手与项目同组织）/ `createProject` 的 `xpertIds` 逐个 `resolveAccessibleCurrentXpert` / `GET /:id/available-xperts` / `PUT /:id/assistant` @ file://packages/server-ai/src/xpert-project/project.service.ts
A 端（本域）：`XpertProjectXpertBindingService.normalize`（历史版本快照 → 当前版本，家族级去重）@ file://packages/server-ai/src/xpert-project/services/project-xpert-binding.service.ts
A 端（本域）：解绑会清 `XpertTask.xpertId` 并广播 `xpert-project.xpert-removed`；`XpertTaskService.pauseProjectTasksForRemovedXpert` @ file://packages/server-ai/src/xpert-task/xpert-task.service.ts
A 端（本域）：运行时/插件侧准入 `ProjectAccessRuntimeService`（`listReadable`/`assertEdit`/`assertManage`）与 `AssertProjectAssistantAccessCommand` @ file://packages/server-ai/src/xpert-project/services/project-access-runtime.service.ts
B 端（被关联专家 - Assistant 定义与运行时）：`Xpert` 定义与版本行（`slug/type/version/latest`，唯一 `(tenantId,organizationId,type,slug,version,latest)`；关系 `agent`/`agents`/`toolsets`/`knowledgebase` 等）@ file://packages/server-ai/src/xpert/xpert.entity.ts
B 端：`PublishedXpertAccessService`（可用性与发布校验的唯一回落点）@ file://packages/server-ai/src/xpert/published-xpert-access.service.ts
B 端：助手定义/草稿/发布（`saveDraft`/`XpertPublishHandler`）与模板安装（同时建助手 + 绑项目）@ file://packages/server-ai/src/xpert/xpert.service.ts
改哪一侧会连带改另一侧：① 改 B 端 `Xpert` 家族键或发布语义 → 本域 `normalize` 家族判定、`available-xperts` 清单、任务派发的目标解析全部要复核（否则绑定漏挂/误挂）；② 改 A 端 M2M 结构或解绑清理动作 → B 端助手挂载反查与模板安装路径必须同步
边界面：助手侧的工具集/知识库/附件/会话只由本域做**挂载**（`/:id/toolsets`、`/:id/knowledges`、`/:id/attachments`、`/:id/conversations`），实体与可用性归各自专家，别在本域改助手定义
资产与证据：本域 C0-使用总览.md「边界（不含 Assistant 定义与发布版本）」与能力清单「助手按家族而非版本快照比较」；B 端 .module-experts/后端专题/Assistant 定义与运行时专家/ 与 memory/数据流/Assistant 定义与运行时/xpert.md