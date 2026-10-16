# ServerAppModule（`server-app`）

- **位置**：`packages/server/src/` · 归属文件 **10** 个 · 约 **696** 行
- **定义**：`packages/server/src/server.module.ts:52`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `hello` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/app.controller.ts`（AppController） | `-` | 1 | `:5` |

## 依赖关系

- **依赖**（改它要连带看）：`AccountBindingModule`、`ApiKeyModule`、`AuthModule`、`BusinessAreaModule`、`CoreModule`、`CountryModule`、`CurrencyModule`、`CustomSmtpModule`、`DataSourceModule`、`DataSourceTypeModule`、`EmailModule`、`EmailTemplateModule`、`EmployeeModule`、`FeatureModule`、`FileStorageModule`、`FileUploadModule`、`HealthModule`、`HomeModule`、`IntegrationModule`、`InviteModule`、`LanguageModule`、`ManagedConnectionModule`、`ManagedQueueModule`、`OrganizationContactModule`、`OrganizationLanguageModule`、`OrganizationModule`、`ReferralModule`、`RoleModule`、`RolePermissionModule`、`RuntimeControlModule`、`StorageFileModule`、`TagModule`、`TenantModule`、`TenantSettingModule`、`UserGroupModule`、`UserModule`、`UserOrganizationModule`、`ViewExtensionModule`
- **被依赖**（动它会影响）：`ApiWorkerBootstrapModule`、`AppModule`、`BootstrapModule`
- **依赖的库/框架模块**：`ServeStaticModule`、`ConfigService`、`Promise`、`ServeStaticModuleOptions`、`MulterModule`、`RouterModule`、`CqrsModule`

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 归属文件（10）

- `packages/server/src/main.ts`
- `packages/server/src/server.module.ts`
- `packages/server/src/helper.ts`
- `packages/server/src/index.ts`
- `packages/server/src/app.controller.ts`
- `packages/server/src/seed.ts`
- `packages/server/src/app.service.ts`
- `packages/server/src/email-send/utils.ts`
- `packages/server/src/file/index.ts`
- `packages/server/src/plugin/plugin-webhook-credential.service.ts`
