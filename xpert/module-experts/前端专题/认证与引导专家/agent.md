# 认证与引导专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/认证与引导专家/`
- **入口路由**：`/auth/**`（12 页节点）· `/onboarding/**`（welcome → tenant-details → plugins）
- **职责**：本域是三段式的「**门面 + 策略表 + 守卫矩阵**」：页面只传 `strategyName` 表达意图（不直接发认证 HTTP），`XpAuthService` 在 `XP_AUTH_STRATEGIES` 表内定址后转交 `XpAuthStrategy` 子类，成功结果统一落 `Store`（Akita persist `_xpertStore`）的 `token` / `refreshToken` / `userId`；令牌再由 `TokenInterceptor` 注入全站请求，由 `authGuard` 一句话 `!!store.token` 供给 `features/**` 十余
- **覆盖目录**：
  - `apps/cloud/src/app/auth（43 非 spec / 9 spec）`
  - `apps/cloud/src/app/onboarding（7 / 2）`
  - `引用面：@core/auth（AuthStrategy/authGuard/token interceptor）与 @core/guards`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改登录流程**（表单字段、`rememberMe` 回填、`returnUrl` 跳转、SSO 回调错误码文案）→ `UserLoginComponent.submit` / `resolveSsoErrors` 与 `AuthStrategy.login`。
  - 改注册与开户字段/门控**（`enablePublicSignup`、返利码、带 `ticket` 的 SSO 注册分支）→ `UserRegisterComponent.register` / `validateReferralCode`。
  - 改密码流程**（忘记密码不跳转、重置密码从 `?token=` 取令、密码长度与强度口径）→ `ForgotPasswordComponent` / `ResetPasswordComponent`。
  - 改邮箱验证链**（邮件链接落点、失败文案来源）→ `VarifyEmailComponent` 与 `GET /api/auth/verify?token=`。
  - 新增登录方式（策略）**→ 只加策略类 + `XpAuthOptions.strategies` 一行，**不动页面**（唯一扩展点）。
  - 改 OIDC consent / SSO 绑定确认**（整页 form POST、票据两跳、`mcpOAuthEnabled` 门控）→ `OidcConsentComponent` / `SsoBindComponent` / `CurrentUserSsoConfirmComponent`。
- **测试状态**：14 spec = 13 PASS / 1 FAIL（环境级 @xpert-ai/store 缺依赖；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
