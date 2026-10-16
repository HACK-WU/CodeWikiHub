---
groupPath: 关联关系/平台插件与技能
relation: skill_repository-索引与技能包
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] skill_repository 与 skill_repository_index / skill_package
强度：必改——改建库时按 provider 分派的语义或 `(tenantId) WHERE provider='workspace-public'` 唯一约定 → 索引同步与技能包安装必改（会出现重复公开仓库或索引指向错误源）；改索引内部实现 → 仓库登记侧不用管
原因：三者构成「仓库定义能从哪拿 → 索引定义有哪些 → 技能包定义这里有一份」的链式契约，且索引行被 CASCADE 删除（删索引会连带删技能包）

仓库端：
- SkillRepository / SkillRepositoryService.ensureWorkspacePublicRepository / withWorkspacePublicRepositoryLock @ packages/server-ai/src/skill-repository/
- 来源策略注册表（clawhub / github / workspace-public / zip）@ packages/server-ai/src/skill-repository/plugins/ 与 @xpert-ai/plugin-sdk 的 SkillSourceProviderRegistry

索引与技能包端：
- SkillRepositoryIndex（repositoryId onDelete CASCADE；列名 publisher 实际是 author）/ SkillRepositoryIndexService.sync（mode full|incremental）@ packages/server-ai/src/skill-repository/repository-index/
- SkillPackage.skillIndexId（可空 + CASCADE = 工作区自建 vs 市场安装的判据）@ packages/server-ai/src/skill-package/skill-package.entity.ts