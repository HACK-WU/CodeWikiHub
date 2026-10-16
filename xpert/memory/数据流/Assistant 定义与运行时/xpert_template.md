---
groupPath: 数据流/Assistant 定义与运行时
relation: xpert_template
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜xpert_template】
- 实体类型：表（XpertTemplate extends TenantBaseEntity）
- 结构：`key`、`name`、`visitCount`、`lastVisitedAt`
- 生产方：XpertTemplateService 的访问统计路径（浏览计数）；导出模板的目录登记（upsertExportedXpertTemplateCatalog）
- 主要消费方：xpert-template（目录/详情/推荐）、plugin-resource（模板安装入口 PluginTemplateInstallCommand）、xpert（sync-template）[基于引用扫描，未深入验证]
- 业务用途：模板的访问统计与导出模板的登记；**模板本体以文件/目录形式存在，本表只记 key 与统计**
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md