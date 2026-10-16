---
groupPath: 数据流/身份与权限
relation: api_key
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜api_key】
- 实体类型：表（ApiKey extends TenantOrganizationBaseEntity）
- 结构：token（索引）、type（ApiKeyBindingType）、entityId、validUntil（可空）、lastUsedAt、userId（显式技术主体，优先于 type/entityId）；expired 由 @AfterLoad 计算
- 生产方：ApiKeyService.create（缺 token 时生成 sk-x- + nanoid(100)）；API key 控制器 CRUD
- 主要消费方（1 个模块）：api-key（策略校验、principal 解析、用量刷新）
- 业务用途：第三方/集成/助手类调用的长期凭据；**validUntil 为空表示永不过期**（运维需巡检）；type/entityId 已 deprecated，改用 resourceScope
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md