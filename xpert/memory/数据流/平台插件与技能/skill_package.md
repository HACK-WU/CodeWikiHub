---
groupPath: 数据流/平台插件与技能
relation: skill_package
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜skill_package】
- 实体类型：表（WorkspaceBaseEntity；工作区技能包安装态）
- 结构：runtimeResourceOnly（默认 false）、skillIndexId（可空，@ManyToOne(SkillRepositoryIndex, onDelete CASCADE, nullable)）、name(json i18n)、visibility（默认 private）、packagePath、sharedSkillId、sharedPackagePath、metadata、instructions；**skillIndexId 可空性即「工作区自建 vs 市场安装」的判据**（无独立唯一索引）
- 生产方：SkillPackageService 的安装入口（installSkillPackage/ensureInstalledSkillPackage/installRepositorySkillPackages/installGithubSkillPackages/uploadSkillPackagesFromFile）、创作入口（createWorkspaceSkillPackage/saveWorkspaceSkillMarkdown）、分发与同步（shareSkillPackage 写 sharedSkillId/sharedPackagePath、syncPluginSkillBundle、syncTemplateSkillBundle）
- 主要消费方（48 个源文件引用）：skill-package 自身、skill-repository（workspace-public 来源策略）、plugin-resource（插件技能包同步）、Agent 运行时（list-workspace-skills、runtime-capabilities、skills 提示组装、skills-middleware）、xpert authoring、agent-plugin、initialization、xpert-project [基于引用扫描，未深入验证]
- 业务用途：技能资产「工作区里已经有一份」的事实源 + 组织共享快照的指针
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md