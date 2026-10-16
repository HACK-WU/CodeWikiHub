---
groupPath: 关联关系/Assistant 定义与运行时
relation: Assistant定义-插件资源与技能包
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] Assistant 定义与运行时 与 平台插件与技能（跨专家）
强度：必改——改工作区能力判定（assertCanAuthor / forAuthoring）或助手 draft middleware 绑定结构 → 插件资源安装（组件→目标合法性、scope 断言）与技能包同步（syncPluginSkillBundle 会改写 draft middleware 绑定）必改；反向改 `plugin_resource_installation` 的 runtimeType/definitionHash 语义 → 本域工作区与文件能力断言必改
原因：插件组件安装与技能 bundle 同步都落在工作区/助手 draft 上，安装与写权限共享同一能力面

本域端：
- XpertWorkspaceAccessService.assertCanAuthor / getCapabilities @ packages/server-ai/src/xpert-workspace/workspace-access.service.ts
- Xpert.draft / graph（middleware 绑定落在 draft）@ packages/server-ai/src/xpert/xpert.entity.ts
- XpertTemplateWorkspaceInitializer @ packages/server-ai/src/xpert/template-workspace-initializer.service.ts

插件技能域端：
- PluginResourceInstallerService.installToWorkspace / installComponentsForXpert @ packages/server-ai/src/plugin-resource/
- plugin-resource-installation-scope.ts（无登录用户时必须显式 scope）@ packages/server-ai/src/plugin-resource/
- SkillPackageService.syncPluginSkillBundle / syncTemplateSkillBundle @ packages/server-ai/src/skill-package/skill-package.service.ts