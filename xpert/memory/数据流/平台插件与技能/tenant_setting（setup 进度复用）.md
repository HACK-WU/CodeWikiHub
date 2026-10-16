---
groupPath: 数据流/平台插件与技能
relation: tenant_setting（setup 进度复用）
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜tenant_setting（setup 进度复用）】
- 实体类型：表（复用租户专家域的表，不新增表）
- 结构：进度以确定性主键写入：id = uuidv5('xpert:setup-plugins:<tenantId>')，name='setupPluginInstallation'；**只存状态不存凭据**
- 生产方：PluginSetupStore（setup-plugins.store.ts）在每项安装前后落盘；单项失败只标 failed 并继续，可在同一把锁下续跑
- 主要消费方：setup 向导状态读取（setup-plugins.service.ts）、GET /api/system/setup/plugins
- 业务用途：让系统初始化向导跨副本、跨浏览器重试可恢复（锁由 PG advisory lock `xpert:setup-plugins:<tenantId>` 提供）
- 详细流向：见 .module-experts/后端专题/平台插件与技能专家/C4-数据流向与消费.md；该表的通用语义见 租户与平台设置专家的 C4