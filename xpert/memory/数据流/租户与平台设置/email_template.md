---
groupPath: 数据流/租户与平台设置
relation: email_template
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜email_template】
- 实体类型：表
- 结构：email_template 表（实体 EmailTemplate extends TenantOrganizationBaseEntity）；关键列 name、languageCode、mjml、hbs（必填）；organizationId 与 tenantId 均为空表示全局默认模板
- 生产方：EVENT_TENANT_CREATED 事件播种（EmailTemplateService.handleTenantCreatedEvent → createDefaultEmailTemplates，目录约定驱动）、POST /api/email-template/template/save
- 主要消费方：email（发信渲染，四级回退取模板）、auth、invite、tenant
- 业务用途：邮件正文模板（多语言、可按组织/租户/全局三级继承）
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md