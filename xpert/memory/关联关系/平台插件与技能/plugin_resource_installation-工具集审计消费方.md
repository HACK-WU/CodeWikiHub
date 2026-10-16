---
groupPath: 关联关系/平台插件与技能
relation: plugin_resource_installation-工具集审计消费方
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] plugin_resource_installation 与 工具集/运行态消费方
强度：必改——改 runtimeType / runtimeId / runtimeNodeKey / definitionHash 的语义或写入时机 → MCP 运行态审计与工具集读取必改（会读到不一致的运行体）；改工具集内部实现 → 安装侧不用管
原因：安装行记录「哪个插件组件装到了哪个 workspace/xpert/agent、运行体 id 与定义哈希是什么」，运行态据此判定组件是否可用

安装端：
- PluginResourceInstallation @ packages/server-ai/src/plugin-resource/plugin-resource-installation.entity.ts
- PluginResourceInstallerService.installComponentsForXpert / installRuntimeComponent / resolveRuntimeType @ packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts
- plugin-resource-installation-scope.ts（无登录用户时必须显式 scope，绝不发无 scope 查询）@ packages/server-ai/src/plugin-resource/

消费方：
- PluginMcpServerService（MCP 启用/停用与凭据）@ packages/server-ai/src/plugin-resource/plugin-mcp-server.service.ts
- xpert-toolset（MCP 运行态审计读取安装行）@ packages/server-ai/src/xpert-toolset/
- AgentPluginModule（@Global 导出）与 ServerAIModule（模块引用面）@ packages/server-ai/src/