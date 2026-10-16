---
groupPath: 数据流/认证与引导
relation: token与用户上下文
exportedAt: "2026-10-16T05:00:01.788Z"
---
【数据流｜token与用户上下文】

- 实体类型：令牌与用户/组织上下文（前端模型为主；服务端侧只投影 user/token 与角色权限快照，无会话表）
- 结构（持久块）：`Store` 的 Akita `PersistState`（`persistState({key:'_xpertStore'})`）——`token`/`refreshToken`/`userId`/`organizationId`/`activeScopeLevel`/`lastOrganizationId`/`rememberedScopes:Record<userId,RememberedUserScope>`
- 结构（内存块与令牌抽象）：`AppState` 的 `user`/`userRolePermissions`（setter → loadPermissions → ngx-permissions）/`selectedOrganization`/`tenantSettings`；`XpAuthToken`（`NbAuthSimpleToken`/`NbAuthJWTToken`）+ `NbTokenPack{name,ownerStrategyName,createdAt,value}`（key `auth_app_token`）
- 结构（契约投影，packages/contracts）：`IAuthResponse{user,token,refreshToken}`、`IUserLoginInput`、`IUserRegistrationInput`、`IUser`
- 生产方：`AuthStrategy.login`（写 userId/token/refreshToken/user + `restoreRememberedScope`）、`AuthStrategy.refreshToken`（GET /api/auth/refresh，`Authorization: Bearer <refreshToken>`）、`SignInSuccessComponent`（/sign-in/success?jwt=&refreshToken=&userId= → `AppInitService.init()`）、`Store.setOrganizationScope`（onboarding `afterOnboard`）
- 主要消费方：`TokenInterceptor.addAuthenticationToken`（全站 `Authorization: Bearer store.token`，401 单飞刷新 + 重放原请求）、`authGuard`/`NoAuthGuard`（只读 `store.token`）、socket 重连（`ChatWebsocketServer` 401 → `refreshToken()` → 用新 token `connect()`）
- 业务用途：全站身份与组织作用域的唯一真源——一次登录同时供给页面准入、接口鉴权与多组织作用域记忆回放
- 关键约束：`XpTokenLocalStorage`（`auth_app_token`）在生产链路无写入方，故 `XpAuthService.isAuthenticated()` 恒假 [推测]，登录态一律以 `Store` 为准；改令牌结构/刷新语义 = 全站级影响
- 详细流向：见 .module-experts/前端专题/认证与引导专家/implementation/03-数据流转.md（链①/链⑥、§9 前端态 vs 服务端态对照表）与 04-模型.md（§5 令牌模型、§6 用户/租户上下文模型）