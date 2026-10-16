---
groupPath: 数据流/身份与权限
relation: password_reset
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜password_reset】
- 实体类型：表（PasswordReset extends **BaseEntity**，注意无 tenantId/organizationId）
- 结构：email、token；expired 由 @AfterLoad 计算（createdAt 距今 > 10 分钟）
- 生产方：AuthService.requestPassword / generateResetLink
- 主要消费方（1 个模块）：auth（resetPassword 校验）
- 业务用途：密码重置的一次性凭据；**过期硬编码 10 分钟**且按 email 全局查找（跨租户需留意）
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md