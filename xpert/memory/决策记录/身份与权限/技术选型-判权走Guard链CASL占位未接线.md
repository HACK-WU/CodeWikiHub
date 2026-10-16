---
groupPath: 决策记录/身份与权限
relation: 技术选型-判权走Guard链CASL占位未接线
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜判权走 Guard 链，CASL 保留为未接线占位】
- 分类：技术选型
- 动机：无
- 决策：实际授权由注解式 Guard 链完成——@Permissions + PermissionGuard、@Roles + RoleGuard、租户一致性守卫，以及少量组织属性权限场景；资源级 ABAC 工厂保留在代码库中但**无调用方**，不参与判定
- 背景约束：数据级规则（只读自己创建的资源、已发布资源可见性）分散在各业务服务中，没有统一策略层；后端被明确定位为「最终裁决」方
- 被否决方案：无（未见「引入 CASL 做统一判定」的决策记录，也未见其被否决的记载）
- 重新评估触发条件：出现跨资源的统一数据级规则需求，或 ABAC 工厂被某模块 imports / 出现 createForUser 调用点（调用点数从 0 变为非 0）
- 关联代码：PermissionGuard.canActivate @ packages/server/src/shared/guards/permission.guard.ts；RoleGuard.canActivate @ packages/server/src/shared/guards/role.guard.ts；CaslAbilityFactory.createForUser @ packages/server/src/core/casl/casl-ability.factory.ts
- 证据来源：docs/zh-Hans/guides/permission.mdx（明写后端裁决机制清单）；CaslAbilityFactory 零调用者（代码扫描）