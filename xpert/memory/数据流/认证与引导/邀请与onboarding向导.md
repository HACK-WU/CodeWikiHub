---
groupPath: 数据流/认证与引导
relation: 邀请与onboarding向导
exportedAt: "2026-10-16T05:00:01.788Z"
---
【数据流｜邀请与onboarding向导】

- 实体类型：邀请接受态与租户引导向导（前端模型 + 服务端投影；无服务端步骤字段，步骤模型 = 路由表 + 组件内 stepper signal）
- 结构（邀请）：`IInvite{token,email,roleId,role,invitedById,status,expireDate,...}`、`IInviteAcceptInput`（= `IUserRegistrationInput` + inviteId/organization/originalUrl）、`IPublicInviteFindInput{email,token}`、`InviteStatusEnum.INVITED|ACCEPTED`
- 结构（向导）：`/onboarding` 四子路由（`''` welcome → `tenant` 信息/AI 模型两屏 → `plugins` → `unknown` 兜底）；组件态 `userFormGroup`/`loading`/`tenantCompleted`/`aiModelSetupRequested`/`primaryCopilotCreatedInOnboarding` 与 plugins 的 `response`/`selected`/`progressPercent`/`disconnected`/`waitingTooLong`
- 生产方：GET /api/invite/validate?data=（`InviteService.validateInvite`）、POST /api/invite/user（`acceptUserInvite`）、POST /api/tenant/onboard（`TenantDetailsComponent.onboard`，密码以 `hash` 字段名提交）、`afterOnboard` 用新建超管凭据 `authStrategy.login` 产 token、GET|POST /api/system/setup/plugins（`SetupPluginsComponent.monitor` 每 2s 轮询）
- 主要消费方：`AcceptInvitePageComponent`/`AcceptInviteFormComponent`（只呈现有效/失效二态，接受成功回 `/auth/login` 不直接登录；无 token 按钮禁用）、`onboardGuard`（GET /api/tenant/onboard，`shareReplay(1)`）、`TenantDetailsComponent` 的 `<z-stepper [linear]="true">`、plugins 页 `completed` 后 `location.assign('/')` 刷新进程级插件
- 业务用途：把「被邀请用户」与「首启租户」两条路径收敛到同一条登录链——邀请建号后回登录；首启先建租户+组织+超管再自动登录，插件步才有凭据
- 关键约束：步骤态不持久化（刷新即回守卫判定）；步骤 2 挂 `authGuard` 而 token 只由步骤 1a 产生 ⇒ 三步不可跳步；邀请失效文案 `Invitiation no longer valid`（原文 `'Invitation no longer valid'`）
- 详细流向：见 .module-experts/前端专题/认证与引导专家/implementation/03-数据流转.md（链④/链⑦、§10 状态流转）与 04-模型.md（§8 向导步骤模型、§9 邀请/SSO 会话模型）