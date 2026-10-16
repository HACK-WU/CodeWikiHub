---
groupPath: 接口信息/租户与平台设置
relation: 自定义SMTP
exportedAt: "2026-10-16T03:52:14.870Z"
---
【接口信息｜自定义SMTP】
- 子功能：租户或组织自定义发信通道
- 所属模块：租户与平台设置
- 接口列表：
  - GET /api/smtp/setting → CustomSmtpController.getSetting @ packages/server/src/custom-smtp/custom-smtp.controller.ts：读当前作用域 SMTP 配置（单次查询；查不到或异常返回环境默认，不含认证）
  - POST /api/smtp/validate → 同上：连通性校验
  - POST /api/smtp → 同上：新建配置（body 为 CreateCustomSmtpDTO，username/password 必填，organizationId 缺省=租户级）
  - PUT /api/smtp/:id → 同上：更新配置（凭据出参打码为 secretKey/secretPassword）