# ConnectorModule（`connector`）

- **位置**：`packages/server-ai/src/connector/` · 归属文件 **23** 个 · 约 **4688** 行
- **定义**：`packages/server-ai/src/connector/connector.module.ts:21`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `integration-options`、`bindings`、`provider-options` 等 6 个 · 视图/接口入口 **25** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/connector/integrations/connector-integration.controller.ts`（ConnectorIntegrationController） | `-` | 2 | `:14` |
| `packages/server-ai/src/connector/connector.controller.ts`（ConnectorController） | `-` | 23 | `:48` |

## 依赖关系

- **依赖**（改它要连带看）：`IntegrationModule`、`RuntimeCapabilityModule`、`TenantModule`、`UserOrganizationModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AIModule`、`AgentMiddlewareRuntimeModule`、`AgentPluginModule`、`AssistantBindingModule`、`ServerAIModule`、`XpertProjectModule`、`XpertTaskModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`DiscoveryModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 4 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`ResolvePluginConnectorsQuery`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `EnterpriseChatkitModule`（`ResolveTemplateConnectorsCommand`）
- ← `XpertAgentModule`（`ResolveTemplateConnectorsCommand`）
- ← `XpertModule`（`ResolveTemplateConnectorsCommand`）
- ← `XpertTaskModule`（`ResolveTemplateConnectorsCommand`）

## 数据表（5）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_connector` | Connector | 5 | @Module imports forFeature | `packages/server-ai/src/connector/connector.service.ts:183` |
| `xpert_connector_oauth_session` | ConnectorOAuthSession | 3 | @Module imports forFeature | `packages/server-ai/src/connector/connector.service.ts:185` |
| `xpert_connector_personal_grant` | ConnectorPersonalGrant | 3 | @Module imports forFeature | `packages/server-ai/src/connector/connector.service.ts:195` |
| `xpert_connector_personal_account` | ConnectorPersonalAccount | 2 | @Module imports forFeature | `packages/server-ai/src/connector/connector.service.ts:192` |
| `xpert_connector_runtime_audit` | ConnectorRuntimeAudit | 2 | @Module imports forFeature | `packages/server-ai/src/connector/connector.service.ts:198` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`ResolveTemplateConnectorsCommand`

## 守卫/权限

`WorkspaceGuard`、`WorkspaceOwnerGuard`

## 归属文件（23）

- `packages/server-ai/src/connector/connector-provider.service.ts`
- `packages/server-ai/src/connector/connector-runtime-audit.entity.ts`
- `packages/server-ai/src/connector/connector-oauth-session.entity.ts`
- `packages/server-ai/src/connector/connector-personal-grant.entity.ts`
- `packages/server-ai/src/connector/connector-credential.ts`
- `packages/server-ai/src/connector/connector.entity.ts`
- `packages/server-ai/src/connector/mcp-native-connector-adapter.ts`
- `packages/server-ai/src/connector/connector-oauth-result-page.ts`
- `packages/server-ai/src/connector/template-connectors.command.ts`
- `packages/server-ai/src/connector/template-connectors.handler.ts`
- `packages/server-ai/src/connector/index.ts`
- `packages/server-ai/src/connector/connector-catalog.ts`
- `packages/server-ai/src/connector/connector.service.ts`
- `packages/server-ai/src/connector/connector.controller.ts`
- `packages/server-ai/src/connector/connector-mcp-provider.ts`
- `packages/server-ai/src/connector/connector-personal-account.entity.ts`
- `packages/server-ai/src/connector/mcp-oauth.strategy.ts`
- `packages/server-ai/src/connector/connector.module.ts`
- `packages/server-ai/src/connector/connector-oauth-errors.ts`
- `packages/server-ai/src/connector/integrations/connector-integration.service.ts`
- `packages/server-ai/src/connector/integrations/connector-integration.schema.ts`
- `packages/server-ai/src/connector/integrations/connector-integration.controller.ts`
- `packages/plugin-sdk/src/lib/connector/strategy.registry.ts`
