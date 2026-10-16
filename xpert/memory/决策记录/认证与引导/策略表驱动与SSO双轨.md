---
groupPath: 决策记录/认证与引导
relation: 策略表驱动与SSO双轨
exportedAt: "2026-10-16T03:52:14.870Z"
---
**决策：策略表驱动认证内核 + SSO 双轨（现状）**

- 分类：架构选型
- 决策 1：认证动作全部经 XpAuthService 按 strategyName 分发到 XpAuthStrategy 子类；策略在 XpAuthOptions.strategies 表注册（nbStrategiesFactory 实例化）。避坑：只写策略类不注册表 → 调用静默失败无编译提示
- 决策 2（[推测]）：SSO 不进策略表（当前仅 email），走独立路由 sso-bind/sso-confirm 与后端 identity 模块——双轨现状；触发条件：SSO 方式增多需统一抽象时
- 决策 3（代码注释明写语义）：令牌强校验前置（createToken failWhenInvalidToken，非法抛 NbAuthIllegalTokenError 由策略拦截）
- 背景约束：源自 Nebular auth 体系改造；坏令牌入存储会导致全站 401 循环
- 证据来源：auth.options.ts、auth.module.ts:46-52、auth-strategy.ts 注释、@core/auth/auth.module.ts:49