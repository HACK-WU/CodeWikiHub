---
groupPath: 数据流/平台插件与技能
relation: plugin_resource_installation
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜plugin_resource_installation】
- 实体类型：表（WorkspaceBaseEntity，带 workspaceId/publishAt/deletedAt；组件安装态）
- 结构：pluginName、componentType（skill|mcp_server|toolset|app|hook|asset）、componentKey、xpertId、agentKey、runtimeType（skill_package|toolset|hook_profile|app_connector）、runtimeId、runtimeNodeKey、definitionHash（非空）、status（ready|pending_auth|blocked|failed）、config(jsonb)、enabled（默认 true）；**无唯一约束**，只有非唯一组合索引 (workspaceId,xpertId,agentKey,pluginName,componentType,componentKey)
- 生产方：PluginResourceInstallerService 的组件安装路径（installComponentsForXpert/installToWorkspace/installToOrganization → installRuntimeComponent upsert）；PluginMcpServerService 改 enabled
- 主要消费方：plugin-resource（组件状态查询、MCP 生命周期收敛、草稿绑定回写）、xpert-toolset（MCP 运行态审计读取安装行）[基于引用扫描，未深入验证]
- 业务用途：记录「哪个插件组件装到了哪个 workspace/xpert/agent，运行体 id 与定义哈希是什么」
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md