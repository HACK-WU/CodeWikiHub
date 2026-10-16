---
groupPath: 决策记录/租户与平台设置
relation: 安全合规-公开返利校验fail-closed限流
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜公开返利校验 fail-closed 限流】
- 分类：安全合规
- 动机：避坑：公开接口被用于枚举有效邀请码 → 返利被刷
- 决策：[推测] GET /api/referral/validate 先经 Redis Lua 限流（60 秒 30 次/IP+租户，键含 sha256(ip) 前 32 位不落原始 IP），Redis 不可用或返回非法时抛 500，不放行
- 背景约束：该接口为 Public；限流键不含明文 IP
- 被否决方案：无
- 重新评估触发条件：Redis 成为高频故障点导致注册页不可用（该接口 5xx 率上升且与 Redis 可用性相关）
- 关联代码：ReferralValidationRateLimitService.assertAllowed @ packages/server/src/referral/referral-validation-rate-limit.service.ts
- 证据来源：无直接证据，基于 assertAllowed 的 fail-closed 行为与 Lua INCR/PEXPIRE 脚本结构推断