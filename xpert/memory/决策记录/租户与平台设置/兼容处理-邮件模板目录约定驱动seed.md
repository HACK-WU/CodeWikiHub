---
groupPath: 决策记录/租户与平台设置
relation: 兼容处理-邮件模板目录约定驱动seed
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜邮件模板由目录约定驱动 seed】
- 分类：兼容处理
- 动机：可维护性
- 决策：默认邮件模板按目录结构 [模板名]/[语言码]/[类型].mjml|hbs 播种，落库 name 为「模板名/类型」、languageCode 为语言码、mjml 经 mjml2html 转为 hbs；模板根目录用多候选路径探测以兼容源码运行与打包 dist 两种布局
- 背景约束：email_sent 按 name + languageCode 关联模板（改写模板名会断链）；部署形态不同导致相对路径不同
- 被否决方案：无
- 重新评估触发条件：模板数量或语言数增长到需要独立管理后台（出现模板版本化需求）
- 关联代码：createDefaultEmailTemplates @ packages/server/src/email-template/email-template.seed.ts；resolveDefaultEmailTemplateFolder @ packages/server/src/email-template/default-email-template-path.ts
- 证据来源：email-template.seed.ts 目录约定注释（明写）