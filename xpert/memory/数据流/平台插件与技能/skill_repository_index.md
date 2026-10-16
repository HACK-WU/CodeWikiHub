---
groupPath: 数据流/平台插件与技能
relation: skill_repository_index
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜skill_repository_index】
- 实体类型：表（TenantOrganizationBaseEntity，带 deletedAt 软删；技能元数据行）
- 结构：repositoryId（@ManyToOne(SkillRepository)，**onDelete CASCADE**）、skillPath(300)、skillId(200)、name、link(500)、publisher（**物理列名 `author`**，json）、description(text)、license、tags(json)、version(50)、stats(json)、resources(json)、deletedAt；**无 (repositoryId, skillId) 唯一约束**，唯一性由应用层 Map 去重 + 重复行软删维护
- 生产方：SkillRepositoryIndexService.sync（create/update/softDelete 三态；**full 模式软删本轮未出现项**）；workspace-public 的索引行来自 skill_package 中 sharedSkillId + sharedPackagePath + publishAt 齐备的行
- 主要消费方：skill-repository（findMarketplace 市场读路径与来源策略写入）、skill-package（installSkillPackage 以索引行为安装来源）、xpert-template（模板技能引用解析与 bundle 同步）、skills-middleware 运行时解析 [基于引用扫描，未深入验证]
- 业务用途：可搜索、可安装的技能清单；搜索命中 name/skillId/skillPath/description/tags 与 author::jsonb ->> 'handle'|'displayName'|'name'
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md