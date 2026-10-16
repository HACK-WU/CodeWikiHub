# SocialAuthModule（`social-auth`）

- **位置**：`packages/auth/src/` · 归属文件 **38** 个 · 约 **1222** 行
- **定义**：`packages/auth/src/social-auth.module.ts:6`（nestjs）
- **挂载前缀**：`/api/auth0`、`/api/dingtalk`、`/api/facebook` 等 8 个 · 视图/接口入口 **18** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/auth/src/auth0/auth0.controller.ts`（Auth0Controller） | `auth0` | 2 | `:6` |
| `packages/auth/src/facebook/facebook.controller.ts`（FacebookController） | `facebook` | 2 | `:6` |
| `packages/auth/src/github/github.controller.ts`（GithubController） | `github` | 2 | `:7` |
| `packages/auth/src/google/google.controller.ts`（GoogleController） | `google` | 2 | `:6` |
| `packages/auth/src/linkedin/linkedin.controller.ts`（LinkedinController） | `linkedin` | 2 | `:6` |
| `packages/auth/src/twitter/twitter.controller.ts`（TwitterController） | `twitter` | 2 | `:6` |
| `packages/auth/src/feishu/feishu.controller.ts`（FeishuController） | `feishu` | 2 | `:8` |
| `packages/auth/src/dingtalk/dingtalk.controller.ts` | `dingtalk` | 2 | `:7` |
| `packages/auth/src/microsoft/microsoft.controller.ts` | `-` | 2 | `:6` |

## 依赖关系

- **依赖**（改它要连带看）：`ConfigModule`
- **被依赖**（动它会影响）：`AuthModule`

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 守卫/权限

`AuthGuard`

## 归属文件（38）

- `packages/auth/src/social-auth.module.ts`
- `packages/auth/src/public.decorator.ts`
- `packages/auth/src/social-auth.service.ts`
- `packages/auth/src/index.ts`
- `packages/auth/src/internal.ts`
- `packages/auth/src/request-context.decorator.ts`
- `packages/auth/src/auth0/auth0.controller.ts`
- `packages/auth/src/auth0/index.ts`
- `packages/auth/src/auth0/auth0.strategy.ts`
- `packages/auth/src/dingtalk/index.ts`
- `packages/auth/src/dingtalk/dingtalk.controller.ts`
- `packages/auth/src/dingtalk/dingtalk.strategy.ts`
- `packages/auth/src/facebook/facebook.strategy.ts`
- `packages/auth/src/facebook/index.ts`
- `packages/auth/src/facebook/facebook.controller.ts`
- `packages/auth/src/feishu/feishu.strategy.ts`
- `packages/auth/src/feishu/strategy.ts`
- `packages/auth/src/feishu/index.ts`
- `packages/auth/src/feishu/feishu.controller.ts`
- `packages/auth/src/github/github.controller.ts`
- `packages/auth/src/github/index.ts`
- `packages/auth/src/github/github.strategy.ts`
- `packages/auth/src/google/index.ts`
- `packages/auth/src/google/google.strategy.ts`
- `packages/auth/src/google/google.controller.ts`
- `packages/auth/src/keycloak/index.ts`
- `packages/auth/src/keycloak/keycloak.strategy.ts`
- `packages/auth/src/keycloak/keycloak-auth-guard.ts`
- `packages/auth/src/linkedin/linkedin.strategy.ts`
- `packages/auth/src/linkedin/index.ts`
- `packages/auth/src/linkedin/linkedin.controller.ts`
- `packages/auth/src/microsoft/microsoft.controller.ts`
- `packages/auth/src/microsoft/index.ts`
- `packages/auth/src/microsoft/microsoft-auth-guard.ts`
- `packages/auth/src/microsoft/microsoft.strategy.ts`
- `packages/auth/src/twitter/twitter.controller.ts`
- `packages/auth/src/twitter/index.ts`
- `packages/auth/src/twitter/twitter.strategy.ts`
