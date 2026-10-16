---
groupPath: 数据流/租户与平台设置
relation: email_sent
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜email_sent】
- 实体类型：表（实体类名为 Email，表名为 email_sent，命名不一致需注意）
- 结构：email_sent 表（实体 Email extends TenantOrganizationBaseEntity）；关键列 name、content、email、isArchived、userId、emailTemplateId（非空，CASCADE）
- 生产方：EmailService 的所有 send* 方法（含收件人为 example.com 的仅落库分支；发送失败也会落一条，message 可能为空）
- 主要消费方：email 模块自身（GET /api/email 查询与归档）
- 业务用途：发信审计与排障记录（有记录不等于已送达）
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md