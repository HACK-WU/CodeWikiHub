---
groupPath: 数据流/平台插件与技能
relation: plugin_marketplace_source
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜plugin_marketplace_source】
- 实体类型：表（TenantOrganizationBaseEntity；用户登记的市场目录来源）
- 结构：name、type（url|github|git）、url、ref、sparsePath、enabled（默认 true）、priority（默认 100）、lastIndexStatus（默认 idle）、lastIndexedAt、lastIndexError、lastCatalog（整份目录 jsonb 快照）；索引 (tenantId,organizationId,name)
- 生产方：PluginMarketplaceService.createSource/updateSource/deleteSource（含 assertSuperAdmin）；刷新链写回 lastIndexStatus/At/Error/lastCatalog
- 主要消费方：市场聚合读路径（列表/详情/图标）与目录刷新（PluginMarketplaceCatalogs + Redis 共享缓存 + PG xmin 栅栏）；引用面集中在 plugin/marketplace/ [基于引用扫描，未深入验证]
- 业务用途：把「从哪抓插件目录」变成可配置、可观测的租户/组织数据（含 git sparsePath 稀疏检出）
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md