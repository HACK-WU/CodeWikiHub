# AuthModule（`auth`）

- **位置**：`packages/server/src/auth/` · 归属文件 **27** 个 · 约 **4769** 行
- **定义**：`packages/server/src/auth/auth.module.ts:30`（nestjs）
- **挂载前缀**：`/api/sso` · 视图/接口入口 **17** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/auth/auth.controller.ts`（AuthController） | `-` | 11 | `:42` |
| `packages/server/src/auth/sso/auth-sso.controller.ts`（AuthSsoController） | `sso` | 6 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：`AccountBindingModule`、`EmailModule`、`OrganizationModule`、`PasswordResetModule`、`RedisModule`、`ReferralModule`、`RoleModule`、`SocialAuthModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`EmployeeModule`、`InviteModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`AuthService`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `OrganizationModule`（CQRS：`OrganizationCreateCommand`）
- → `PasswordResetModule`（CQRS：`PasswordResetCreateCommand`、`PasswordResetGetCommand`）

## 数据表（9）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user` | User | 8 | @InjectRepository | `packages/server/src/auth/auth.service.ts:74` |
| `user_organization` | UserOrganization | 6 | @Module imports forFeature | `packages/server/src/user-organization/user-organization.services.ts:37` |
| `organization` | Organization | 5 | @Module imports forFeature | `packages/server/src/auth/auth.service.ts:154` |
| `external_identity_binding` | ExternalIdentityBinding | 3 | getRepository | `packages/server/src/auth/auth.service.ts:252` |
| `email_verification` | EmailVerification | 2 | @InjectRepository | `packages/server/src/user/user.service.ts:159` |
| `feature_organization` | FeatureOrganization | 2 | @InjectRepository | `packages/server/src/user/user.service.ts:165` |
| `email_template` | EmailTemplate | 2 | @InjectRepository | `packages/server/src/email/email.service.ts:41` |
| `role` | Role | 1 | getRepository | `packages/server/src/auth/auth.service.ts:142` |
| `tenant` | Tenant | 1 | getRepository | `packages/server/src/auth/auth.service.ts:442` |

## 非 HTTP 入口

- **CQRS Handler**（3）：`AuthLoginCommand`、`AuthRegisterCommand`、`AuthTrialCommand`

## 守卫/权限

`AuthGuard`

## 归属文件（27）

- `packages/server/src/auth/auth.module.ts`
- `packages/server/src/auth/index.ts`
- `packages/server/src/auth/auth.service.ts`
- `packages/server/src/auth/auth.controller.ts`
- `packages/server/src/auth/commands/auth.trial.command.ts`
- `packages/server/src/auth/commands/auth.login.command.ts`
- `packages/server/src/auth/commands/auth.register.command.ts`
- `packages/server/src/auth/commands/index.ts`
- `packages/server/src/auth/commands/handlers/index.ts`
- `packages/server/src/auth/commands/handlers/auth.login.handler.ts`
- `packages/server/src/auth/commands/handlers/auth.register.handler.ts`
- `packages/server/src/auth/commands/handlers/auth.trial.handler.ts`
- `packages/server/src/auth/sso/pending-sso-binding-challenge.service.ts`
- `packages/server/src/auth/sso/auth-sso-binding.service.ts`
- `packages/server/src/auth/sso/auth-sso-discovery.service.ts`
- `packages/server/src/auth/sso/auth-sso.controller.ts`
- `packages/server/src/auth/sso/request-base-url.ts`
- `packages/server/src/auth/strategies/refresh-token.strategy.ts`
- `packages/server/src/auth/strategies/ws-jwt.strategy.ts`
- `packages/server/src/auth/strategies/local.strategy.ts`
- `packages/server/src/auth/strategies/basic.strategy.ts`
- `packages/server/src/auth/strategies/index.ts`
- `packages/server/src/auth/strategies/jwt.strategy.ts`
- `packages/plugin-sdk/src/lib/sso/strategy.registry.ts`
- `packages/server/src/user/user.service.ts`
- `packages/server/src/user-organization/user-organization.services.ts`
- `packages/server/src/email/email.service.ts`
