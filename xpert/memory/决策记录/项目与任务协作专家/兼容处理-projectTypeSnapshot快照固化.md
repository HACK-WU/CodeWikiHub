---
groupPath: 决策记录/项目与任务协作专家
relation: 兼容处理-projectTypeSnapshot快照固化
exportedAt: "2026-10-16T06:44:03.370Z"
---
【决策记录｜兼容处理-projectTypeSnapshot快照固化】
- 分类：兼容处理
- 动机（避坑）：**现象** 项目只存类型 key，类型/插件下线后历史项目无法解释「当初是什么类型」，或反过来用快照去「复活」一个已不可用的类型；**后果** 历史项目不可读，或对已下线应用放行执行
- 决策：创建瞬间由 `XpertProjectTypeService.classification(ref)` 固化 `applicationKey` / `projectTypeKey` / `applicationInstallationId` / `projectTypeSnapshot`（含 `applicationTitle`、`title`、`binding`）；快照**只用于展示与兼容判定**，可用性一律以 `resolve()` 对「当前已加载插件」重解析为准
- 背景约束：`binding` 为 `entity` 的类型不允许普通创建（抛 `ProjectApplicationWorkflowRequired`）；迁移 `20260920-project-types.sql` 的 `CK_project_type_identity` 要求两个类型键同为 NULL 或同非空且非空串；创建时 `toolsetIds`/`knowledgebaseIds` 被有意忽略
- 背景约束（幂等路径）：插件侧 `ensureManagedProject` 只做「不重新分类」的校验，查项目时把 `tenantId`/`organizationId` 一起放进 where（注释逐字「retries cannot adopt a same-id Project from a different security boundary」）
- 相邻口径：`GET /api/xpert-project/types`、`/type-entry` 只列**当前已加载插件里的活体类型**（`catalog()`/`list(xpertId?)`），改类型定义不影响存量项目
- 被否决方案：用 `projectTypeSnapshot` 复原一个已下线的类型（实现层明写 `resolve()` 只接受「当前已加载插件目录里的活体类型，快照不能复原一个已下线的类型」）
- 重新评估触发条件：插件目录/类型下线策略变化，或需要按历史快照回放执行语义时——届时须先在 `resolve()` 侧定义「快照可授权」的边界，**不能只在读侧放开**
- 索引支撑：`IDX_project_application_type(tenantId,organizationId,applicationKey,projectTypeKey,status)` 支撑类型目录与按类型查询
- 关联代码：file://packages/server-ai/src/xpert-project/services/project-type.service.ts、file://packages/server-ai/src/xpert-project/services/project-creation.ts、file://packages/server-ai/src/xpert-project/entities/project.entity.ts
- 证据来源：源码 `project-type.service.ts` 文件头不变量逐字「Invariants: classification is immutable during reconciliation. Plugin providers verify persisted business links; **display snapshots never authorize app execution.**」；实现层 02-实现.md「项目创建链」；C5-关键决策.md §D5