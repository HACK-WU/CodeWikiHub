---
groupPath: 数据流/Assistant 定义与运行时
relation: assistant_binding
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜assistant_binding】
- 实体类型：表（AssistantBinding extends TenantOrganizationBaseEntity）+ 用户偏好表 `assistant_binding_user_preference`
- 结构：`code`（AssistantCode 系统槽位）+ `scope`（tenant/organization/user）+ `assistantId` + `enabled` + `userId`；`desktopBootstrap`/`desktopOnboarding`（`@Exclude({toPlainOnly:true})` 服务端恢复态）；**3 个 partial unique**（tenant / organization / user 维度）
- 生产方：AssistantBindingService.upsertBinding/saveBinding/deleteBinding/upsertBindingPreference；`onModuleInit` 的 `backfillLegacySystemBindings`/`backfillLegacyUserBindings`（旧 assistant_config 回填）
- 主要消费方：assistant-binding（有效绑定解析、Bosi 桌面引导）、本域其它模块（系统槽位取 Assistant）[基于引用扫描，未深入验证]
- 业务用途：把系统槽位（如 `chat_common`）绑到某个 Xpert，并承载用户偏好（soul/profile/toolPreferences/conversationPreferences）；`getEffectiveBinding` 为 **organization 优先回落 tenant**
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md