---
groupPath: 数据流/身份与权限
relation: secret_token
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜secret_token】
- 实体类型：表（SecretToken extends TenantBaseEntity）
- 结构：type（默认 API_KEY）、token（**可为 sha256:<digest> 形态**）、entityId、enterpriseH5Scope(jsonb)、validUntil；expired 由 @AfterLoad 计算
- 生产方：SecretTokenService（签发时唯一返回原文，库内只存摘要）；SSO/委派会话链
- 主要消费方（1 个模块）：secret-token（策略 authenticate/validateToken/resolve*Principal）
- 业务用途：短期窄受众的委派会话凭据（USER_XPERT / USER_CONVERSATION / ENTERPRISE_XPERT / PUBLIC_XPERT）；**绝不把库内摘要当 bearer 提交**；明文与摘要同列共存（兼容期）
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md