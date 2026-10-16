---
groupPath: 数据流/租户与平台设置
relation: referral_code
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜referral_code】
- 实体类型：表
- 结构：referral_code 表（实体 ReferralCode extends TenantBaseEntity）；关键列 code（varchar(10)，两条唯一索引 tenant+code / tenant+user，两条 CHECK：全大写与字母表正则）、userId（User SET NULL）
- 生产方：ReferralCodeSubscriber（User.afterInsert 自动发码，经 ensureReferralCode）、POST /api/referral/me/regenerate（事务内行锁换码）
- 主要消费方：referral（码校验、我的码、关系查询）
- 业务用途：用户邀请码的发放与归属（人工抄写场景，字符表已剔除 0/1/I/O）
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md