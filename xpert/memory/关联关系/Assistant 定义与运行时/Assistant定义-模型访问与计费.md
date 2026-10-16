---
groupPath: 关联关系/Assistant 定义与运行时
relation: Assistant定义-模型访问与计费
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] Assistant 定义与运行时 与 模型访问与计费（跨专家）
强度：必改——改 Assistant 的启停（enable/disable）、模型偏好（model-preference）、成员/用户组可见范围或 copilot 角色配置 → `CopilotService.findAllAvailablesCopilots` 的可见性合成与 model-access 判定必改；反向改模型可见性/授权语义 → 本域 `assistants`/`models` 面必改
原因：运行时「有哪些模型可选」由两边共同决定——本域给 Member/Grant 可见范围，计费域给 Membership 与 Grant 合成口径

本域端：
- AssistantsController.getModels / setModelPreference @ packages/server-ai/src/ai/assistant.controller.ts
- Xpert.userGroups / Xpert.copilotModel @ packages/server-ai/src/xpert/xpert.entity.ts

计费域端：
- CopilotService.findAllAvailablesCopilots @ packages/server-ai/src/copilot/copilot.service.ts
- ModelAccessService.getCatalog / resolveModelAccess / canUse* @ packages/server-ai/src/model-access/model-access.service.ts
- MembershipService.findModelAccess / isMembershipPlanEnabled @ packages/server-ai/src/membership/membership.service.ts