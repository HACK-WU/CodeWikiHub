---
groupPath: 数据流/租户与平台设置
relation: tenant_setting
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜tenant_setting】
- 实体类型：表
- 结构：tenant_setting 表（实体 TenantSetting extends TenantBaseEntity）；关键列 name、value；注意无 (tenantId,name) 唯一约束
- 生产方：TenantSettingService.saveSettngs（POST /api/tenant-setting）；onboarding 期间写入默认 fileStorageProvider=LOCAL
- 主要消费方：model-execution、membership、model-gateway、plugin（读取配置值）；file-storage 经请求级 request.tenantSettings 读取
- 业务用途：租户级运行配置（如文件存储 provider、模型与计费相关配置），避免把租户差异写死在代码里
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md