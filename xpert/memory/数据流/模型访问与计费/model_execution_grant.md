---
groupPath: 数据流/模型访问与计费
relation: model_execution_grant
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_execution_grant】
- 实体类型：表（一次性凭据）
- 结构：ownerId、credentialHash（select:false + UNIQUE）、status（pending/active/revoked）、context、models、defaultModelId、limits、expiresAt/absoluteExpiresAt
- 生产方：ModelExecutionGrantService.issue 写入；activate / renew / revoke 更新
- 主要消费方：model-execution（11 次引用）[基于引用扫描，未深入验证]
- 业务用途：绑定「一次执行」的短时模型访问凭据与授权快照（**快照只会变严不会变松**；明文只在 issue 响应出现一次）
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md