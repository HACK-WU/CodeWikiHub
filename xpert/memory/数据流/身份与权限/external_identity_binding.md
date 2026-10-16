---
groupPath: 数据流/身份与权限
relation: external_identity_binding
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜external_identity_binding】
- 实体类型：表（ExternalIdentityBinding extends TenantBaseEntity）
- 结构：provider、subjectId、userId、profile(jsonb)；双唯一索引 (tenantId,provider,subjectId) 与 (tenantId,provider,userId)；userId onDelete CASCADE
- 生产方：AccountBindingService.bindUser / unbindUser；SSO 链的严格绑定创建；用户删除事务内的绑定清理
- 主要消费方（4 个模块）：account-binding、auth、tenant-admin-cli、user
- 业务用途：第三/外部身份与系统用户的一一映射，SSO 与社交登录的身份解析依据
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md