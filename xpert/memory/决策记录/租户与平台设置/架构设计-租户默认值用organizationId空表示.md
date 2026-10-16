---
groupPath: 决策记录/租户与平台设置
relation: 架构设计-租户默认值用organizationId空表示
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜租户默认值用 organizationId 空表示】
- 分类：架构设计
- 动机：优化
- 决策：feature_organization / custom_smtp / email_template 的租户默认值统一以 organizationId 为空落库，读侧统一「组织级优先 → 租户级兜底」回退链；PLAN 把邮件模板与 SMTP 点名为可继承配置页样板（Tenant Default + Organization Override + Effective Result）
- 背景约束：三张表共用 TenantOrganizationBaseEntity（organizationId 可空）；写入侧 scope 校验强度不一
- 被否决方案：无
- 重新评估触发条件：PLAN 提出的 findWithInheritance / writeToCurrentScope 落地时（出现统一的继承读写 service 基类）
- 关联代码：FeatureOrganizationService.updateFeatureOrganization @ packages/server/src/feature/feature-organization.service.ts；CustomSmtpService.getSmtpSetting @ packages/server/src/custom-smtp/custom-smtp.service.ts；EmailService.render @ packages/server/src/email/email.service.ts
- 证据来源：docs/plans/PLAN_isolate_tenant_org.md（明写点名）+ 上述三处回退链代码结构