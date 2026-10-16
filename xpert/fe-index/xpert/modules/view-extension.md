# ViewExtensionModule（`view-extension`）

- **位置**：`packages/server/src/view-extension/` · 归属文件 **15** 个 · 约 **2223** 行
- **定义**：`packages/server/src/view-extension/view-extension.module.ts:14`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:hostType` · 视图/接口入口 **7** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/view-extension/view-extension.controller.ts`（ViewExtensionController） | `-` | 7 | `:154` |

## 依赖关系

- **依赖**（改它要连带看）：`IntegrationModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`RouterModule`、`DiscoveryModule`

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 守卫/权限

`ApiKeyOrClientSecretAuthGuard`

## 归属文件（15）

- `packages/server/src/view-extension/view-extension.module.ts`
- `packages/server/src/view-extension/view-extension.utils.ts`
- `packages/server/src/view-extension/host-definition.decorator.ts`
- `packages/server/src/view-extension/workbench-manifest.ts`
- `packages/server/src/view-extension/view-extension.service.ts`
- `packages/server/src/view-extension/index.ts`
- `packages/server/src/view-extension/host-definition.registry.ts`
- `packages/server/src/view-extension/view-request-metrics.ts`
- `packages/server/src/view-extension/view-extension.cache.service.ts`
- `packages/server/src/view-extension/host-definition.interface.ts`
- `packages/server/src/view-extension/view-extension.permission.service.ts`
- `packages/server/src/view-extension/view-extension.controller.ts`
- `packages/server/src/view-extension/hosts/integration-view-host.definition.ts`
- `packages/server/src/view-extension/subscribers/integration-view-host-cache.subscriber.ts`
- `packages/plugin-sdk/src/lib/view-extension/provider.registry.ts`
