# UserModule（`user`）

- **位置**：`packages/server/src/user/` · 归属文件 **32** 个 · 约 **2817** 行
- **定义**：`packages/server/src/user/user.module.ts:17`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `me`、`email`、`preferred-language` 等 5 个 · 视图/接口入口 **16** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/user/user.controller.ts`（UserController） | `-` | 16 | `:55` |

## 依赖关系

- **依赖**（改它要连带看）：`FactoryResetModule`、`RoleModule`、`TenantModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`ApiKeyModule`、`ArtifactsModule`、`AuthModule`、`CopilotKnowledgeModule`、`CopilotModelModule`、`CopilotModule`、`CopilotProviderModule`、`CopilotUserModule`、`DataSourceModule`、`EmployeeModule`、`FileUnderstandingModule`、`GraphragModule`、`InitializationModule`、`IntegrationModule`、`InviteModule`、`KnowledgeDocumentModule`、`KnowledgeWikiModule`、`KnowledgebaseModule`、`LanguageModule`、`ManagedQueueModule`、`MobileModule`、`OrganizationContactModule`、`OrganizationModule`、`RoleModule`、`RolePermissionModule`、`SecretTokenModule`、`ServerAIModule`、`ServerAppModule`、`StorageFileModule`、`TagModule`、`TenantModule`、`UserGroupModule`、`UserOrganizationModule`、`XpertModule`、`XpertProjectModule`、`XpertTemplateModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 1 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `UserOrganizationModule`（CQRS：`UserOrganizationCreateCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `TenantModule`（`UserCreateCommand`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user` | User | 4 | @Module imports forFeature | `packages/server/src/user/user.service.ts:157` |
| `email_verification` | EmailVerification | 3 | @Module imports forFeature | `packages/server/src/user/user.service.ts:159` |
| `feature_organization` | FeatureOrganization | 3 | @Module imports forFeature | `packages/server/src/user/user.service.ts:165` |
| `external_identity_binding` | ExternalIdentityBinding | 1 | getRepository | `packages/server/src/user/user.service.ts:720` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`UserBulkCreateCommand`、`UserCreateCommand`、`UserDeleteCommand`、`TrialUserCreatedEvent`

## 守卫/权限

`ApiKeyOrClientSecretAuthGuard`、`TenantPermissionGuard`、`PermissionGuard`、`RoleGuard`

## 归属文件（32）

- `packages/server/src/user/user.module.ts`
- `packages/server/src/user/user.entity.ts`
- `packages/server/src/user/user.controller.ts`
- `packages/server/src/user/user.subscriber.ts`
- `packages/server/src/user/index.ts`
- `packages/server/src/user/default-users.ts`
- `packages/server/src/user/user.seed.ts`
- `packages/server/src/user/current-user-feature-cache.ts`
- `packages/server/src/user/user.service.ts`
- `packages/server/src/user/commands/user.delete.command.ts`
- `packages/server/src/user/commands/user.bulk.create.command.ts`
- `packages/server/src/user/commands/index.ts`
- `packages/server/src/user/commands/user.create.command.ts`
- `packages/server/src/user/commands/handlers/user.bulk.create.handler.ts`
- `packages/server/src/user/commands/handlers/index.ts`
- `packages/server/src/user/commands/handlers/user.create.handler.ts`
- `packages/server/src/user/commands/handlers/user.delete.handler.ts`
- `packages/server/src/user/dto/register-user.dto.ts`
- `packages/server/src/user/dto/login-user.dto.ts`
- `packages/server/src/user/dto/user-public.dto.ts`
- `packages/server/src/user/dto/reset-password.dto.ts`
- `packages/server/src/user/dto/update-user.dto.ts`
- `packages/server/src/user/dto/index.ts`
- `packages/server/src/user/dto/update-preferred-language.dto.ts`
- `packages/server/src/user/dto/create-user.dto.ts`
- `packages/server/src/user/email-verification/email-verification.entity.ts`
- `packages/server/src/user/events/trial.created.event.ts`
- `packages/server/src/user/events/user.organization.created.event.ts`
- `packages/server/src/user/events/index.ts`
- `packages/server/src/user/events/user.organization.deleted.event.ts`
- `packages/server/src/user/events/handlers/index.ts`
- `packages/server/src/user/events/handlers/trial.created.handler.ts`
