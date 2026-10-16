---
groupPath: 关联关系/平台插件与技能
relation: skill_package-运行时与模板消费方
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] skill_package 表 与 运行时/模板/插件资源消费方
强度：必改——改 skill_package 的列语义（packagePath / sharedSkillId / sharedPackagePath / skillIndexId / visibility / instructions）→ 运行时技能装配、模板同步、插件技能同步与仓库公开同步必改；改消费方内部实现 → 技能包服务不用管
原因：技能包既是「工作区已有一份」的事实源，又是公开仓库与运行时的内容来源，前后缀约定（`plugin:<pluginName>:skill:<componentKey>`）是跨域拼接契约

技能包端：
- SkillPackage @ packages/server-ai/src/skill-package/skill-package.entity.ts
- SkillPackageService（install* / shareSkillPackage / syncTemplateSkillBundle / syncPluginSkillBundle）@ packages/server-ai/src/skill-package/skill-package.service.ts

消费方：
- 运行时技能装配：skills-middleware / skill-creator-middleware / runtime-capabilities / list-workspace-skills @ packages/server-ai/src/
- 模板：XpertTemplateModule 的模板技能同步 @ packages/server-ai/src/xpert-template/
- 插件资源：plugin-resource（插件 SKILL 组件安装与同步）@ packages/server-ai/src/plugin-resource/
- 公开仓库：workspace-public 来源策略 @ packages/server-ai/src/skill-repository/plugins/workspace-public/