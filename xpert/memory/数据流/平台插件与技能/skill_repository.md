---
groupPath: 数据流/平台插件与技能
relation: skill_repository
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜skill_repository】
- 实体类型：表（TenantOrganizationBaseEntity，带 deletedAt 软删；技能仓库登记）
- 结构：name(100)、provider(100)、credentials(jsonb)、options(jsonb)、lastSyncAt、deletedAt；**关键 partial unique** `IDX_skill_repository_workspace_public_tenant_unique on (tenantId) WHERE provider='workspace-public' AND organizationId IS NULL AND deletedAt IS NULL`
- 生产方：SkillRepositoryService.register/updateRepository/deleteRepository（**拒绝手工注册或修改系统托管 provider**）、ensureWorkspacePublicRepository（惰性创建 + pg_advisory_xact_lock 序列化）、updateLastSyncAt
- 主要消费方：skill-repository（索引 sync 与 findMarketplace 读路径、四个来源策略）、xpert-template（模板技能同步解析目标仓库）、initialization（bootstrap 安装默认技能时保障仓库存在）[基于引用扫描，未深入验证]
- 业务用途：定义「技能从哪里来」，并保证每租户唯一一个系统托管公开仓库
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md