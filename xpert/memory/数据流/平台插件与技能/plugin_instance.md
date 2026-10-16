---
groupPath: 数据流/平台插件与技能
relation: plugin_instance
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜plugin_instance】
- 实体类型：表（TenantOrganizationBaseEntity；宿主机插件安装态，无 workspace 维度）
- 结构：scopeKey（可空）、pluginName/packageName、version、source、level（默认 organization）、pendingRestart（默认 false）、config/configurationStatus/configurationError、sourceConfig（jsonb，packageDir 等瞬态字段已剔除）、meta（含 sdkCompatibilityWarnings）；**三重叠唯一索引**：(scopeKey,pluginName)、(tenantId,organizationId,pluginName)、partial unique (pluginName) WHERE level='tenant'
- 生产方：PluginInstanceService.upsert/deactivate/uninstall；由 PluginManagementService.installPlugin/refreshCodePlugin/归档安装、UpdatePluginCommand、PluginUninstallService、PUT /api/plugin/configuration、setup 向导驱动
- 主要消费方：启动与运行期装配链（plugin-instance.loader 读回期望配置并 restage）、setup 向导、API 列表/详情（loadStatus/canConfigure/canUninstall）；引用面集中在 packages/server/src/plugin/ [基于引用扫描，未深入验证]
- 业务用途：持久化「这台机器期望安装哪些插件、属于哪个 level、配置是什么」的**唯一事实源**
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md