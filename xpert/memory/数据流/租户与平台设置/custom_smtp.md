---
groupPath: 数据流/租户与平台设置
relation: custom_smtp
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜custom_smtp】
- 实体类型：表
- 结构：custom_smtp 表（实体 CustomSmtp extends TenantOrganizationBaseEntity）；关键列 fromAddress、host、port、secure、username、password（出参排除）、isValidate；organizationId 为空表示租户级；无业务唯一约束（取 createdAt 最新）
- 生产方：POST /api/smtp、PUT /api/smtp/id（CustomSmtpCreateCommand / CustomSmtpUpdateCommand）
- 主要消费方：custom-smtp 自身（配置读写与校验）；email 经 CustomSmtpService.getSmtpSetting 间接读取
- 业务用途：租户或组织自带发信通道配置（凭据在出参中打码）
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md