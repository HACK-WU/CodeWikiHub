# RuntimeControlModule（`runtime-control`）

- **位置**：`packages/server/src/runtime-control/` · 归属文件 **23** 个 · 约 **3122** 行
- **定义**：`packages/server/src/runtime-control/runtime-control.module.ts:24`（nestjs）
- **挂载前缀**：`/api/system/runtime` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/runtime-control/runtime-control.controller.ts`（RuntimeControlController） | `system/runtime` | 6 | `:31` |

## 依赖关系

- **依赖**（改它要连带看）：`ManagedConnectionModule`、`RedisModule`
- **被依赖**（动它会影响）：`HealthModule`、`PluginModule`、`ServerAppModule`
- **依赖的库/框架模块**：`DiscoveryModule`

## 数据表（0）

（未引用数据表——纯计算/转发型模块）

## 守卫/权限

`TenantPermissionGuard`、`RoleGuard`

## 归属文件（23）

- `packages/server/src/runtime-control/runtime-restart.test-fixture.ts`
- `packages/server/src/runtime-control/plugin-convergence-capacity.ts`
- `packages/server/src/runtime-control/runtime-restart-target.store.ts`
- `packages/server/src/runtime-control/runtime-restart-deadlines.ts`
- `packages/server/src/runtime-control/index.ts`
- `packages/server/src/runtime-control/runtime-restart-coordinator.service.ts`
- `packages/server/src/runtime-control/runtime-restart.types.ts`
- `packages/server/src/runtime-control/shutdown-step.ts`
- `packages/server/src/runtime-control/runtime-lifecycle.service.ts`
- `packages/server/src/runtime-control/runtime-control.dto.ts`
- `packages/server/src/runtime-control/runtime-control.service.ts`
- `packages/server/src/runtime-control/runtime-control.module.ts`
- `packages/server/src/runtime-control/runtime-drain.middleware.ts`
- `packages/server/src/runtime-control/runtime-rollout-policy.ts`
- `packages/server/src/runtime-control/runtime-shutdown-preparation.ts`
- `packages/server/src/runtime-control/runtime-control.controller.ts`
- `packages/server/src/runtime-control/plugin-runtime-generation.store.ts`
- `packages/server/src/runtime-control/runtime-shutdown.ts`
- `packages/server/src/runtime-control/plugin-runtime-requirements.ts`
- `packages/server/src/runtime-control/runtime-process-signaler.ts`
- `packages/server/src/runtime-control/runtime-queue-shutdown.service.ts`
- `packages/server/src/runtime-control/runtime-plugin-admission.ts`
- `packages/server/src/runtime-control/fixtures/shutdown-process.cjs`
