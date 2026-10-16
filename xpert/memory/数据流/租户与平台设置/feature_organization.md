---
groupPath: 数据流/租户与平台设置
relation: feature_organization
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜feature_organization】
- 实体类型：表
- 结构：feature_organization 表（实体 FeatureOrganization extends TenantOrganizationBaseEntity）；关键列 isEnabled（默认 true）、featureId（索引）；organizationId 为空表示租户级开关；无业务唯一约束
- 生产方：onboarding（updateTenantFeatureOrganizations，仅叶子 feature）、FeatureOrganizationService.updateFeatureOrganization（POST /api/feature/toggle）
- 主要消费方：feature、referral、membership、model-access、user（组装用户级 feature context）、xpert-project、xpert-project-access、auth、tenant-admin-cli（共 9 个模块）
- 业务用途：控制某租户或某组织能否使用某能力（含付费能力），并作为配额与计费判定的输入
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md