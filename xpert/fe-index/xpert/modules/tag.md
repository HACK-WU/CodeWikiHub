# TagModule（`tag`）

- **位置**：`packages/server/src/tags/` · 归属文件 **9** 个 · 约 **634** 行
- **定义**：`packages/server/src/tags/tag.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `directory`、`:id`、`categories` · 视图/接口入口 **8** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/tags/tag.controller.ts`（TagController） | `-` | 8 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tag` | Tag | 7 | @Module imports forFeature | `packages/server/src/tags/tag-management.service.ts:49` |

## 守卫/权限

`TenantPermissionGuard`、`PermissionGuard`

## 归属文件（9）

- `packages/server/src/tags/tag.controller.ts`
- `packages/server/src/tags/tag.seed.ts`
- `packages/server/src/tags/tag.module.ts`
- `packages/server/src/tags/index.ts`
- `packages/server/src/tags/tag.subscriber.ts`
- `packages/server/src/tags/tag.entity.ts`
- `packages/server/src/tags/tag-management.service.ts`
- `packages/server/src/tags/default-tags.ts`
- `packages/server/src/tags/tag.service.ts`
