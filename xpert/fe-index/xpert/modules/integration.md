# IntegrationModule（`integration`）

- **位置**：`packages/server/src/integration/` · 归属文件 **25** 个 · 约 **1137** 行
- **定义**：`packages/server/src/integration/integration.module.ts:19`（nestjs）
- **挂载前缀**：`/api/qr` · 视图/接口入口 **11** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/integration/integration.controller.ts`（IntegrationController） | `-` | 7 | `:30` |
| `packages/server/src/integration/integration-qr.controller.ts`（IntegrationQrController） | `qr` | 4 | `:7` |

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`ApiKeyModule`、`ConnectorModule`、`EnterpriseChatkitModule`、`KnowledgeDocumentModule`、`KnowledgebaseModule`、`ServerAppModule`、`ViewExtensionModule`、`XpertModule`、`XpertProjectModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 4 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `RolePermissionModule`（CQRS：`CheckRolePermissionCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`IntegrationDelCommand`、`IntegrationUpsertCommand`）
- ← `KnowledgebaseModule`（`GetIntegrationQuery`）
- ← `PluginModule`（`ResolveConnectorIntegrationQuery`）
- ← `XpertModule`（`IntegrationDelCommand`、`IntegrationUpsertCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `integration` | Integration | 7 | @Module imports forFeature | `packages/server/src/integration/integration.service.ts:13` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`IntegrationUpsertCommand`、`IntegrationDelCommand`、`ResolveConnectorIntegrationQuery`、`GetIntegrationQuery`

## 守卫/权限

`PermissionGuard`

## 归属文件（25）

- `packages/server/src/integration/integration.controller.ts`
- `packages/server/src/integration/index.ts`
- `packages/server/src/integration/integration-qr.service.ts`
- `packages/server/src/integration/integration-qr.controller.ts`
- `packages/server/src/integration/integration.service.ts`
- `packages/server/src/integration/integration.entity.ts`
- `packages/server/src/integration/integration.module.ts`
- `packages/server/src/integration/types.ts`
- `packages/server/src/integration/commands/upsert.command.ts`
- `packages/server/src/integration/commands/index.ts`
- `packages/server/src/integration/commands/delete.command.ts`
- `packages/server/src/integration/commands/handlers/upsert.handler.ts`
- `packages/server/src/integration/commands/handlers/index.ts`
- `packages/server/src/integration/commands/handlers/delete.handler.ts`
- `packages/server/src/integration/connector-app/resolve-connector-integration.handler.ts`
- `packages/server/src/integration/connector-app/connector-app-integration.service.ts`
- `packages/server/src/integration/dto/integration-public.dto.ts`
- `packages/server/src/integration/dto/index.ts`
- `packages/server/src/integration/events/index.ts`
- `packages/server/src/integration/events/authorized.event.ts`
- `packages/server/src/integration/queries/index.ts`
- `packages/server/src/integration/queries/get-one.query.ts`
- `packages/server/src/integration/queries/handlers/get-one.handler.ts`
- `packages/server/src/integration/queries/handlers/index.ts`
- `packages/plugin-sdk/src/lib/integration/strategy.registry.ts`
