---
groupPath: 决策记录/模型访问与计费
relation: 安全合规-self-audit阻断
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜self-audit 阻断：申请人不得同时是该范围的管理者】
- 分类：安全合规
- 动机：避坑：同一用户既能提交申请、又持有该范围审批权 → 可自批自用，事件留痕失去互证价值
- 决策：createRequest 在写库前调用 assertRequesterIsNotManager：canManageTargetScope 命中（作用域匹配且持有 COPILOT_EDIT / MEMBERSHIP_EDIT / MODEL_ACCESS_REQUEST_EDIT 之一）即抛 403，错误文案固定为「Users who manage this scope cannot request personal model access」（i18n key Error.ModelAccessManagerCannotRequest）
- 背景约束：管理员对特权用户存在自动批准的旁路（内部调 approveRequest），因此个人申请入口必须单独阻断；审批侧仍需人工理由与有效期
- 被否决方案：无
- 重新评估触发条件：出现「管理员也必须走个人申请流程」的需求；权限点集合调整时需同步更新 canManageTargetScope
- 关联代码：ModelAccessService.createRequest / assertRequesterIsNotManager / canManageTargetScope @ packages/server-ai/src/model-access/model-access.service.ts
- 证据来源：源码方法体与 i18n key（明写）+ 模型访问与执行子专家 implementation/02-实现.md