---
groupPath: 决策记录/项目与任务协作专家
relation: 安全合规-四层准入与ProjectPermission
exportedAt: "2026-10-16T06:44:03.369Z"
---
【决策记录｜安全合规-四层准入与ProjectPermission】
- 分类：安全合规
- 动机（避坑）：**现象** 控制器类级挂 `@Public()` 后误以为「已放行」，或只在类级布防而忽略方法级与缺 `:id` 的场景；**后果** 越权读写项目数据，或反过来把合法调用全部 403
- 决策：`@Public()` 只跳过全局 JWT 守卫；真正准入由类级 `@UseGuards(XpertProjectAuthGuard, XpertProjectFeatureGuard, XpertProjectPermissionGuard)` + `@ProjectPermission(XPERT_PROJECT_VIEW|CREATE|EDIT|MANAGE)` 提供，方法级再叠加 `XpertProjectGuard`/`XpertProjectOwnerGuard`；授权唯一业务入口是 `XpertProjectAccessService.resolveAccess/assertCanRead/assertCanUse/assertCanEdit/assertCanManage/assertCanPurge`，插件/运行时侧走 `ProjectAccessRuntimeService`（无 HTTP）
- 角色口径：角色由 `ownerId` + `xpert_project_membership` 派生；`canEdit=['owner','manager','editor']`、`canManage=['owner','manager']`；`assertProjectWritable` 拒 archived 编辑、`assertCanUse` 在 archived 时拒绝、`assertCanPurge` 要求 `role==='owner' && status==='archived'`
- 背景约束（退化与放行面）：`XpertProjectPermissionGuard` 无 `:id` 参数时退化为 `RequestContext.hasPermissions`；`XpertProjectFeatureGuard` 在 feature 未 seed 时**放行**；`XpertProjectAuthGuard` 拒绝 `client_secret` 且非 `USER_XPERT` 绑定的主体
- 背景约束（无守卫面）：邀请 2 条 + `/api/xpert-task/*` 全部 35 条**无项目守卫**，靠服务层断言（`findHttpAccessible`/`findHttpAccessibleById`/`*HttpTask`/`assertHttpMutationAccess`）——**绕过 service 直查仓库即越权**
- 被否决方案：无
- 重新评估触发条件：新增非 HTTP 调用面（插件、运行时、后台）时，必须经 `ProjectAccessRuntimeService` 而非自建判定；若要收紧「feature 未 seed 即放行」，需同步复核全部类级端点
- 失败面：403 为主（`assertCanRead/Edit/Manage`、`XpertProjectOwnerGuard` 判 `role !== 'owner'`），业务断言层另产出 400/409
- 关联代码：file://packages/server-ai/src/xpert-project/project.controller.ts、file://packages/server-ai/src/xpert-project/guards/project-permission.guard.ts、file://packages/server-ai/src/xpert-project/services/project-access.service.ts、file://packages/server-ai/src/xpert-project/services/project-access-runtime.service.ts
- 证据来源：源码 `project.controller.ts` 类级装饰器逐字：`@Public()` + `@UseGuards(XpertProjectAuthGuard, XpertProjectFeatureGuard, XpertProjectPermissionGuard)` + `@ProjectPermission(AIPermissionsEnum.XPERT_PROJECT_VIEW)`；实现层 01-架构.md「关键不变量」1（「控制器类级 `@Public()` 是『跳过全局 JWT 守卫』而非放行」）；C5-关键决策.md §D2
- 详细资产：.module-experts/后端专题/项目与任务协作专家/C1-能力契约.md §3「准入与守卫契约」（五层判定表）