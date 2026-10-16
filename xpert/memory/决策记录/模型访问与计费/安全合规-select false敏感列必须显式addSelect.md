---
groupPath: 决策记录/模型访问与计费
relation: 安全合规-select false敏感列必须显式addSelect
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜select:false 敏感列必须显式 addSelect】
- 分类：安全合规
- 动机：避坑：敏感列随默认查询进入日志/序列化体/宽表返回 → 凭据哈希与密文泄漏面扩大（@Exclude 只保护序列化，不保护查询层）；反向代价是漏写 addSelect 不报错、只静默拿 undefined 并跳过投递
- 决策：model_execution_grant.credentialHash、model_gateway_api_key.tokenHash/encryptedSecret、model_gateway_call.usageFact/settlementContext/encryptedRequest/encryptedResponse 一律 select:false；鉴权加 tokenHash、个人 Key 列表加 encryptedSecret、结算重试加 settlementContext、执行用量投递加 usageFact、管理取证加 encryptedRequest+encryptedResponse；明文只在签发/创建响应出现一次
- 背景约束：encryptedSecret 与调用体密文受 SECRETS_ENCRYPTION_KEY 保护（轮换前必须确认既有密文可解密）；tokenHash/credentialHash 为 sha256，不受该密钥影响
- 被否决方案：无
- 重新评估触发条件：出现「事实已落库但未投递」的静默跳过案例（优先怀疑 addSelect 漏写）；SECRETS_ENCRYPTION_KEY 轮换或密钥派生方式变更
- 关联代码：execution.entity.ts、model-gateway-api-key.entity.ts、model-gateway-call.entity.ts、execution-metering.service.ts（deliver）
- 证据来源：模型访问与计费专家 implementation/07-运维.md（安全运维）与 04-模型.md（已知风险）