---
groupPath: 数据流/平台插件与技能
relation: plugin_application_installation
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜plugin_application_installation】
- 实体类型：表（TenantOrganizationBaseEntity；App 级认领记录与控制面状态机）
- 结构：pluginName、appName、declaredScope、scopeKey、status（默认 initializing；configuring|initializing|ready|degraded|failed）、pluginVersion、templateId/templateVersion、operationId、workspaceId、xpertId、knowledgebaseIds(jsonb)、resourceRefs(jsonb)、errorCode/errorMessage；**关键唯一索引 (tenantId, pluginName, appName, scopeKey) 即并发锁**；另有 (tenantId, organizationId, status)
- 生产方：PluginApplicationService.claimInstallation（insert 冲突即回读）与 initialize 成功/补偿路径的状态推进；PluginApplicationSetupService.prepare/bindToolset/discard（insert().orIgnore() 占位 + pessimistic_write 行锁）
- 主要消费方：plugin-resource（App 状态汇总/详情/健康检查/工具集 preflight，引用最多）、xpert-project 与 xpert-project-access（项目类型与托管供给路径）[基于引用扫描，未深入验证]
- 业务用途：App 安装的幂等认领与「配置到什么程度」的事实记录；initializing 行 **5 分钟后可被接管**（启发式）
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md