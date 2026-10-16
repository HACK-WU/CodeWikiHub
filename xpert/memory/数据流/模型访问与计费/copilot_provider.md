---
groupPath: 数据流/模型访问与计费
relation: copilot_provider
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜copilot_provider】
- 实体类型：表（Provider 连接）
- 结构：providerName、providerType、credentials（json 列）、isValid、options、copilotId、models（OneToMany）；组织级覆盖租户级
- 生产方：CopilotProviderUpsertHandler（POST/PUT /api/copilot-provider，凭据先过插件 schema 校验）
- 主要消费方：copilot-provider（3 次引用）[基于引用扫描，未深入验证]
- 业务用途：Provider 连接与凭据（模型调用的凭据来源；credentials 为敏感列）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md