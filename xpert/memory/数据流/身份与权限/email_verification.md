---
groupPath: 数据流/身份与权限
relation: email_verification
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜email_verification】
- 实体类型：表（EmailVerification extends TenantBaseEntity，1:1 用户）
- 结构：token（唯一索引）、validUntil（2 天）、userId（onDelete CASCADE）
- 生产方：AuthService.signup（写 token）、AuthService.resendVerificationMail（覆盖 token）
- 主要消费方（3 个模块）：user、auth、tenant-admin-cli
- 业务用途：一次性邮箱验证凭据，重发即令旧链接失效
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md