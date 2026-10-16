---
groupPath: 决策记录/租户与平台设置
relation: 接口契约-返利码字符表与数据库CHECK
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜返利码字符表与数据库 CHECK】
- 分类：接口契约
- 动机：避坑：邀请码含易混字符被人工抄错 → 校验失败与用户投诉
- 决策：返利码为 10 位，字符表 23456789ABCDEFGHJKLMNPQRSTUVWXYZ（剔除 0/1/I/O）；数据库侧加两条 CHECK：全大写与格式正则；生成端用随机字节取模 + orIgnore 重试（最多 10 次）
- 背景约束：邀请码常被人工抄写与口述传播；CHECK 使用 Postgres 正则，非 PG 环境不兼容
- 被否决方案：无
- 重新评估触发条件：需要支持非 Postgres 数据库（该表 DDL 需在 sqlite/mysql 执行）
- 关联代码：ReferralCode 实体 CHECK @ packages/server/src/referral/referral-code.entity.ts；generateReferralCode / ensureReferralCode @ packages/server/src/referral/referral-code.ts
- 证据来源：referral-code.entity.ts 的 CHK_referral_code_format / CHK_referral_code_uppercase 与生成端字符表常量（明写）