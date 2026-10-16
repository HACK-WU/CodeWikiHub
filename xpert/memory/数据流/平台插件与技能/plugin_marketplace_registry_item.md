---
groupPath: 数据流/平台插件与技能
relation: plugin_marketplace_registry_item
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜plugin_marketplace_registry_item】
- 实体类型：表（TenantBaseEntity；**无 organization 维度**，与 plugin_resource_installation 的 scope 显式要求混用易写出跨租户可见查询）
- 结构：packageName、version、artifactNamespace、displayName(+I18n)、description(+I18n)、category、enabled（默认 true）、priority（默认 100）、section（默认 marketplace）、downloads/downloadsStatus/downloadsUpdatedAt/downloadsError；索引 (tenantId, packageName)
- 生产方：PluginMarketplaceRegistry.createRegistryItem/updateRegistryItem/deleteRegistryItem（含唯一性校验）；下载量富化写 downloads* 字段
- 主要消费方：平台源目录合成（refreshPlatformRegistrySource → 以 xpert-platform://plugins 作为市场来源出现）与市场列表/详情展示 [基于引用扫描，未深入验证]
- 业务用途：平台侧人工审阅过的上架清单，不依赖外部 JSON 站点
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md