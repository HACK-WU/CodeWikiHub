---
groupPath: 接口信息/平台插件与技能
relation: 插件资源与App
exportedAt: "2026-10-16T03:52:14.870Z"
---
【接口信息｜插件资源与 App】
- 子功能：插件导出的组件安装到 workspace/xpert/organization、受管 App 编排与初始化、MCP 组件启用
- 所属模块：平台插件与技能
- 接口列表：
  - GET /api/plugin/:name/resources/state（target 必须 organization/workspace/xpert；workspace 缺 workspaceId、xpert 缺 xpertId 均 400）
  - POST .../install-workspace（body {workspaceId, components[]}，只接受 SKILL/MCP_SERVER/APP）、.../install-organization（SUPER_ADMIN，仅 TOOLSET）、.../install-xpert（body {xpertId, agentKey?, components[]}，仅 HOOK）
  - POST .../mcp/:componentKey/{enable,disable}、GET .../mcp/:componentKey/connection-info、POST .../mcp/:componentKey/credential（均 SUPER_ADMIN）
  - GET /api/plugin-applications（getStatuses、getCatalog、getDetail）；POST initialize / prepare / bindToolset / discardConfiguration（需 SUPER_ADMIN|ADMIN|TRIAL + Zod 校验）
  - 服务入口：PluginResourceInstallerService.installToWorkspace / installToOrganization / installToXpert / installComponentsForXpert / resolveRuntimeComponents / resolveRuntimeType / findInstallation；PluginApplicationService.claimInstallation（唯一 scopeKey 冲突即回读）
- 关键约束：**组件 → 目标合法性固定**（organization 仅 TOOLSET；workspace 为 SKILL/MCP_SERVER/APP；xpert 为 HOOK；**ASSET 永不安装**）；非法选择器被静默过滤，选择集无匹配组件 → 404 PLUGIN_RESOURCE_NO_MATCHING_COMPONENTS；**无登录用户时必须显式解析 scope**（tenant 缺失绝不发无 scope 查询）