# TenantModule（`tenant`）

- **位置**：`packages/server/src/tenant/` · 归属文件 **21** 个 · 约 **904** 行
- **定义**：`packages/server/src/tenant/tenant.module.ts:17`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `count`、`pagination`、`onboard` 等 4 个 · 视图/接口入口 **9** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/tenant/tenant.controller.ts`（TenantController） | `-` | 9 | `:38` |

## 依赖关系

- **依赖**（改它要连带看）：`FeatureModule`、`RoleModule`、`RolePermissionModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`ApiKeyModule`、`AssistantBindingModule`、`AuthModule`、`ConnectorModule`、`ContactModule`、`CopilotCheckpointModule`、`CopilotKnowledgeModule`、`CopilotModelModule`、`CopilotModule`、`CopilotOrganizationModule`、`CopilotProviderModule`、`CopilotStoreModule`、`CopilotUsageModule`、`CopilotUserModule`、`CoreModule`、`CustomSmtpModule`、`DataSourceModule`、`DataSourceTypeModule`、`DesktopShellModule`、`EmailModule`、`EmailTemplateModule`、`EmployeeModule`、`FeatureModule`、`FileUnderstandingModule`、`IntegrationModule`、`InviteModule`、`KnowledgeDocumentModule`、`KnowledgebaseModule`、`MembershipModule`、`OrganizationContactModule`、`OrganizationLanguageModule`、`OrganizationModule`、`PluginResourceModule`、`PromptWorkflowModule`、`RagVStoreModule`、`RagWebModule`、`RoleModule`、`RolePermissionModule`、`SandboxModule`、`ServerAppModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`StorageFileModule`、`TagModule`、`UserModule`、`UserOrganizationModule`、`XpertAgentExecutionModule`、`XpertAgentModule`、`XpertModule`、`XpertProjectModule`、`XpertTableModule`、`XpertTaskModule`、`XpertTemplateModule`、`XpertToolModule`、`XpertToolsetModule`、`XpertWorkspaceModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，6 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `FeatureModule`（CQRS：`FeatureBulkCreateCommand`）
- → `LanguageModule`（CQRS：`LanguageInitCommand`）
- → `OrganizationModule`（CQRS：`OrganizationCreateCommand`）
- → `RoleModule`（CQRS：`TenantRoleBulkCreateCommand`）
- → `TenantSettingModule`（CQRS：`TenantSettingSaveCommand`）
- → `UserModule`（CQRS：`UserCreateCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `InviteModule`（`TenantFeatureOrganizationCreateCommand`）
- ← `SandboxModule`（`GetDefaultTenantQuery`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tenant` | Tenant | 6 | @Module imports forFeature | `packages/server/src/tenant/tenant.seed.ts:10` |
| `role` | Role | 2 | @InjectRepository | `packages/server/src/tenant/tenant.service.ts:33` |
| `email_template` | EmailTemplate | 2 | @InjectRepository | `packages/server/src/email-template/events/handlers/tenant.created.handler.ts:15` |
| `user` | User | 1 | getRepository | `packages/server/src/tenant/tenant.service.ts:107` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`TenantFeatureOrganizationCreateCommand`、`TenantCreatedEvent`、`GetDefaultTenantQuery`、`TenantCreatedEvent`

## 守卫/权限

`RoleGuard`、`TenantPermissionGuard`

## 归属文件（21）

- `packages/server/src/tenant/tenant.module.ts`
- `packages/server/src/tenant/anonymous-tenant-resolver.service.ts`
- `packages/server/src/tenant/tenant.seed.ts`
- `packages/server/src/tenant/index.ts`
- `packages/server/src/tenant/tenant.controller.ts`
- `packages/server/src/tenant/tenant-subdomain.util.ts`
- `packages/server/src/tenant/tenant.service.ts`
- `packages/server/src/tenant/tenant.entity.ts`
- `packages/server/src/tenant/commands/index.ts`
- `packages/server/src/tenant/commands/tenant-feature-organization.create.command.ts`
- `packages/server/src/tenant/commands/handlers/index.ts`
- `packages/server/src/tenant/commands/handlers/tenant-feature-organization.create.handler.ts`
- `packages/server/src/tenant/events/tenant.created.event.ts`
- `packages/server/src/tenant/events/index.ts`
- `packages/server/src/tenant/events/handlers/index.ts`
- `packages/server/src/tenant/events/handlers/tenant.created.handler.ts`
- `packages/server/src/tenant/queries/index.ts`
- `packages/server/src/tenant/queries/get-default.query.ts`
- `packages/server/src/tenant/queries/handlers/index.ts`
- `packages/server/src/tenant/queries/handlers/get-default.handler.ts`
- `packages/server/src/email-template/events/handlers/tenant.created.handler.ts`
