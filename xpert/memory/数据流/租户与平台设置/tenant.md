---
groupPath: 数据流/租户与平台设置
relation: tenant
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜tenant】
- 实体类型：表
- 结构：tenant 表（实体 Tenant extends BaseEntity）；关键列 name（索引，必填）、subdomain（唯一索引，可空）；级联 organizations / rolePermissions / featureOrganizations / settings / importRecords
- 生产方：TenantService.onboardTenant（POST /api/tenant、POST /api/tenant/onboard）、PUT /api/tenant/id
- 主要消费方：tenant-admin-cli（运维 CLI）、seeder、auth；另有约 21 个 packages/server 模块 import TenantModule 消费租户上下文（不直接读表）
- 业务用途：多租户根实体——子域解析、请求级租户隔离与级联删除的锚点
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md