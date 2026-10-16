# TenantSettingModule（`tenant-setting`）

- **位置**：`packages/server/src/tenant/tenant-setting/` · 归属文件 **13** 个 · 约 **400** 行
- **定义**：`packages/server/src/tenant/tenant-setting/tenant-setting.module.ts:11`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/tenant/tenant-setting/tenant-setting.controller.ts`（TenantSettingController） | `-` | 2 | `:21` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`FileStorageModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `TenantModule`（`TenantSettingSaveCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tenant_setting` | TenantSetting | 3 | @Module imports forFeature | `packages/server/src/tenant/tenant-setting/tenant-setting.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`TenantSettingSaveCommand`、`TenantSettingGetCommand`

## 守卫/权限

`TenantPermissionGuard`、`RoleGuard`

## 归属文件（13）

- `packages/server/src/tenant/tenant-setting/tenant-setting.seed.ts`
- `packages/server/src/tenant/tenant-setting/tenant-settings.middleware.ts`
- `packages/server/src/tenant/tenant-setting/index.ts`
- `packages/server/src/tenant/tenant-setting/tenant-setting.module.ts`
- `packages/server/src/tenant/tenant-setting/tenant-setting.controller.ts`
- `packages/server/src/tenant/tenant-setting/tenant-setting.entity.ts`
- `packages/server/src/tenant/tenant-setting/tenant-setting.service.ts`
- `packages/server/src/tenant/tenant-setting/commands/tenant-setting.save.command.ts`
- `packages/server/src/tenant/tenant-setting/commands/tenant-setting.get.command.ts`
- `packages/server/src/tenant/tenant-setting/commands/index.ts`
- `packages/server/src/tenant/tenant-setting/commands/handlers/tenant-setting.save.handler.ts`
- `packages/server/src/tenant/tenant-setting/commands/handlers/index.ts`
- `packages/server/src/tenant/tenant-setting/commands/handlers/tenant-setting.get.handler.ts`
