---
groupPath: 数据流/模型访问与计费
relation: model_gateway_settings
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_gateway_settings】
- 实体类型：表（配置，tenantId 唯一）
- 结构：storeBodies（默认 false）、bodyRetentionDays（默认 7）；限流相关键存 TenantSetting
- 生产方：getOrCreateSettings（读路径惰性建行 —— **GET 有副作用**）、updateSettings
- 主要消费方：model-gateway（3 次引用）[基于引用扫描，未深入验证]
- 业务用途：调用体留存开关与留存天数（配合 bodyExpiresAt 清理任务）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md