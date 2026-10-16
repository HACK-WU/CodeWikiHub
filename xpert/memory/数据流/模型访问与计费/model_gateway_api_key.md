---
groupPath: 数据流/模型访问与计费
relation: model_gateway_api_key
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜model_gateway_api_key】
- 实体类型：表（凭据）
- 结构：userId、name、prefix、tokenHash（select:false + UNIQUE）、encryptedSecret（select:false）、status、validUntil、lastUsedAt、revokedAt/Reason
- 生产方：ModelGatewayService.createKey 写入；revokeKey / expireDueApiKeys / authenticate 更新
- 主要消费方：model-gateway（3 次引用）[基于引用扫描，未深入验证]
- 业务用途：外部集成的凭据主体，**明文字面仅签发时出现一次**；encryptedSecret 受 SECRETS_ENCRYPTION_KEY 保护
- 详细流向：见 .module-experts/后端专题/模型访问与计费专家/C4-数据流向与消费.md