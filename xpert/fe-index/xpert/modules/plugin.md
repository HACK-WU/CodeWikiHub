# PluginModule（`plugin`）

- **位置**：`packages/server/src/plugin/` · 归属文件 **80** 个 · 约 **15267** 行
- **定义**：`packages/server/src/plugin/plugin.module.ts:54`（nestjs）
- **挂载前缀**：`/api/plugin`、`/api/plugin/marketplace`、`/api/system/setup/plugins` · 视图/接口入口 **30** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/plugin/plugin.controller.ts`（PluginController） | `plugin` | 12 | `:76` |
| `packages/server/src/plugin/marketplace/plugin-marketplace.controller.ts`（PluginMarketplaceController） | `plugin/marketplace` | 15 | `:21` |
| `packages/server/src/plugin/setup/setup-plugins.controller.ts`（SetupPluginsController） | `system/setup/plugins` | 3 | `:11` |

## 依赖关系

- **依赖**（改它要连带看）：`ConfigModule`、`RedisModule`、`RuntimeControlModule`
- **被依赖**（动它会影响）：`MigrationRootModule`、`RootModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，2 出 / 2 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`ImportDefaultAgentPluginsCommand`）
- → `IntegrationModule`（CQRS：`ResolveConnectorIntegrationQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `RuntimeCapabilityModule`（`ResolvePluginArtifactNamespaceQuery`）
- ← `WorkspaceFilesRuntimeModule`（`ResolvePluginArtifactNamespaceQuery`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `plugin_marketplace_source` | PluginMarketplaceSource | 4 | @Module imports forFeature | `packages/server/src/plugin/marketplace/plugin-marketplace.service.ts:63` |
| `plugin_marketplace_registry_item` | PluginMarketplaceRegistryItem | 4 | @Module imports forFeature | `packages/server/src/plugin/marketplace/plugin-marketplace.service.ts:65` |
| `plugin_instance` | PluginInstance | 3 | @Module imports forFeature | `packages/server/src/plugin/plugin-instance.service.ts:34` |
| `tenant_setting` | TenantSetting | 2 | getRepository | `packages/server/src/plugin/setup/setup-plugins.store.ts:45` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`UpdatePluginCommand`、`ResolveLatestPluginVersionQuery`、`ResolvePluginArtifactNamespaceQuery`、`GetPluginSkillDocumentQuery`

## 守卫/权限

`OrganizationPermissionGuard`、`TenantPermissionGuard`、`RoleGuard`

## 归属文件（80）

- `packages/server/src/plugin/plugin-strategy-registration.ts`
- `packages/server/src/plugin/plugin-install-policy.ts`
- `packages/server/src/plugin/plugin-runtime-state.service.ts`
- `packages/server/src/plugin/plugin.module.ts`
- `packages/server/src/plugin/plugin-http-routes.ts`
- `packages/server/src/plugin/plugin-schema-sync.service.ts`
- `packages/server/src/plugin/plugin-update.utils.ts`
- `packages/server/src/plugin/organization-plugin.store.ts`
- `packages/server/src/plugin/plugin-instance.service.ts`
- `packages/server/src/plugin/errors.ts`
- `packages/server/src/plugin/plugin-management.service.ts`
- `packages/server/src/plugin/plugin-runtime-policy.ts`
- `packages/server/src/plugin/plugin-webhook-credential.service.ts`
- `packages/server/src/plugin/plugin-instance.loader.ts`
- `packages/server/src/plugin/plugin-discovery.ts`
- `packages/server/src/plugin/index.ts`
- `packages/server/src/plugin/plugin-startup-watchdog.ts`
- `packages/server/src/plugin/plugin-sdk-versioning.ts`
- `packages/server/src/plugin/plugin-startup-step.ts`
- `packages/server/src/plugin/plugin-loader.ts`
- `packages/server/src/plugin/plugin-bundle-manifest.ts`
- `packages/server/src/plugin/plugin-archive.ts`
- `packages/server/src/plugin/plugin-config.crypto.ts`
- `packages/server/src/plugin/source-config.ts`
- `packages/server/src/plugin/lifecycle.ts`
- `packages/server/src/plugin/plugin-instance.entity.ts`
- `packages/server/src/plugin/plugin-management.test-fixture.ts`
- `packages/server/src/plugin/plugin-scope.ts`
- `packages/server/src/plugin/types.ts`
- `packages/server/src/plugin/plugin-orm-metadata.ts`
- `packages/server/src/plugin/plugin.controller.ts`
- `packages/server/src/plugin/plugin-startup-state.ts`
- `packages/server/src/plugin/config.ts`
- `packages/server/src/plugin/plugin-schema-scope.ts`
- `packages/server/src/plugin/plugin-config.resolver.ts`
- `packages/server/src/plugin/plugin.helper.ts`
- `packages/server/src/plugin/plugin-config-schema.ts`
- `packages/server/src/plugin/plugin-webhook.tokens.ts`
- `packages/server/src/plugin/commands/update-plugin.command.ts`
- `packages/server/src/plugin/commands/index.ts`
- ……其余 40 个见 JSON 输出（完整清单）
