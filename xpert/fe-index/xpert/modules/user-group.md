# UserGroupModule（`user-group`）

- **位置**：`packages/server/src/user-group/` · 归属文件 **5** 个 · 约 **428** 行
- **定义**：`packages/server/src/user-group/user-group.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **6** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/user-group/user-group.controller.ts`（UserGroupController） | `-` | 6 | `:27` |

## 依赖关系

- **依赖**（改它要连带看）：`UserModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`ServerAppModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user_group` | UserGroup | 3 | @Module imports forFeature | `packages/server/src/user-group/user-group.service.ts:13` |
| `user_organization` | UserOrganization | 3 | @Module imports forFeature | `packages/server/src/user-group/user-group.service.ts:17` |
| `user` | User | 3 | @Module imports forFeature | `packages/server/src/user-group/user-group.service.ts:19` |
| `organization` | Organization | 3 | @Module imports forFeature | `packages/server/src/user-group/user-group.service.ts:15` |

## 守卫/权限

`PermissionGuard`

## 归属文件（5）

- `packages/server/src/user-group/index.ts`
- `packages/server/src/user-group/user-group.service.ts`
- `packages/server/src/user-group/user-group.entity.ts`
- `packages/server/src/user-group/user-group.controller.ts`
- `packages/server/src/user-group/user-group.module.ts`
