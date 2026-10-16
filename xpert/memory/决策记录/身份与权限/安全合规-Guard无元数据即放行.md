---
groupPath: 决策记录/身份与权限
relation: 安全合规-Guard无元数据即放行
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜Guard 无元数据即放行（fail-open）】
- 分类：安全合规
- 动机：无
- 决策：判权守卫在未读到权限/角色元数据时直接放行；判权正确性外包给「注解覆盖率」——漏注解的控制器等价于不做授权判定
- 背景约束：所有路由默认经全局认证守卫，但认证与判权分离；@Public() 只跳过认证、不跳过判权（因此「公开端点 + 有权限注解」仍可能被拒绝）
- 被否决方案：无（仓库内没有 lint 规则或 CI 检查拦「忘注解」，也未见切换为 fail-closed 的决策记载）
- 重新评估触发条件：出现一次「新增控制器漏注解导致未授权访问」的事件，或团队引入元数据断言/静态检查
- 关联代码：PermissionGuard.canActivate @ packages/server/src/shared/guards/permission.guard.ts；RoleGuard.canActivate @ packages/server/src/shared/guards/role.guard.ts；OrganizationPermissionGuard.canActivate @ packages/server/src/shared/guards/organization-permission.guard.ts
- 证据来源：代码事实（三处元数据为空即返回 true）；专家资产 implementation/02-实现.md 技术债清单