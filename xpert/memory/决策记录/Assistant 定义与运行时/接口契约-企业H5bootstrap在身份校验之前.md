---
groupPath: 决策记录/Assistant 定义与运行时
relation: 接口契约-企业H5bootstrap在身份校验之前
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜企业 H5 bootstrap 在身份校验之前，且只暴露白名单字段】
- 分类：接口契约
- 动机：让未登录的 H5 侧也能先渲染应用壳（名称/头像/starters/features），避免首屏必须两次往返且失败态难表达
- 决策：GET /api/xpert/:identifier/enterprise-h5/:platform/bootstrap 为 @Public()，返回 EnterpriseH5Xpert（12 个白名单字段）+ platform + clientConfig；身份认证推迟到 POST .../session（authorization_code 换身份 → assertIdentity 五项全等 → AccountBindingService.resolveUser → 签发 ENTERPRISE_XPERT client secret，TTL 固定 600s）
- 背景约束：匿名面靠三条过滤收窄（publishAt 非空・organizationId 非空・channels[platform].enabled）；风险面：任何拿到 slug 的人都能读到助手名/描述/头像/starters/features
- 被否决方案：无（只讨论了代价，未记为已否决）
- 重新评估触发条件：企业合规要求「匿名阶段不得泄露助手元数据」时触发重评
- 关联代码：enterprise-chatkit-session.service.ts（getBootstrap/createSession/assertIdentity）、enterprise-chatkit.controller.ts
- 证据来源：源码类型注释（Bootstrap response returned before enterprise identity verification）+ 子专家② implementation/02-实现.md（明写）