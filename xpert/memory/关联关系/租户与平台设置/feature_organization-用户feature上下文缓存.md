---
groupPath: 关联关系/租户与平台设置
relation: feature_organization-用户feature上下文缓存
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] feature 开关写入 与 用户 feature 上下文缓存
强度：必改——改开关写入时 bump 的缓存版本号键名或版本语义 → user 域的 feature context 组装/缓存必改（否则用户看到过期开关）；改 feature 实体内部实现 → 缓存侧不用管
原因：开关是高频读 + 低频写，读侧靠「版本号段内嵌缓存键」失效，两端共享同一个键名约定

开关端：
- FeatureOrganizationService.updateFeatureOrganization / updateTenantFeatureOrganizations @ packages/server/src/feature/feature-organization.service.ts
- FEATURE_ORGANIZATION_UPDATED_EVENT @ packages/server/src/feature/

缓存端：
- touchCurrentUserFeatureTenantCacheVersion / user:me:feature-context:tenant-version:<tenantId> @ packages/server/src/user/current-user-feature-cache.ts
- UserService.findCurrentUserFeatureContext @ packages/server/src/user/user.service.ts