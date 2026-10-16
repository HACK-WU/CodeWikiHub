# 认证与凭据子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（身份与权限专家）
- **资产路径**：`.module-experts/后端专题/身份与权限专家/sub-experts/认证与凭据子专家/`
- **职责**：本子专家只回答**「你是谁」**：校验凭据、产出主体（交互用户或 `IApiPrincipal`），以及账号身份的生命周期（注册、邮箱验证、密码重置、外部身份绑定、SSO 绑定）。它不回答「你能做什么」。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/auth`
  - `server/src/api-key`
  - `server/src/secret-token`
  - `server/src/account-binding`
  - `server/src/actor-token`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 登录失败返回 `200 + null`
  - `validUntil` 语义在两处相反
  - `x-principal-user-id` 可覆盖同租户业务用户且缺白名单
  - `password_reset` 无租户列且过期硬编码 10 分钟
  - 部分 provider 策略被注释但代码仍在仓库
  - 库内 digest 不可当 bearer 使用
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
