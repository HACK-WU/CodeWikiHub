# OrganizationLanguageModule（`organization-language`）

- **位置**：`packages/server/src/organization-language/` · 归属文件 **6** 个 · 约 **309** 行
- **定义**：`packages/server/src/organization-language/organization-language.module.ts:9`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **4** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/organization-language/organization-language.controller.ts`（OrganizationLanguageController） | `-` | 4 | `:26` |

## 依赖关系

- **依赖**（改它要连带看）：`TenantModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `organization_language` | OrganizationLanguage | 3 | @Module imports forFeature | `packages/server/src/organization-language/organization-language.service.ts:10` |

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（6）

- `packages/server/src/organization-language/organization-language.seed.ts`
- `packages/server/src/organization-language/organization-language.service.ts`
- `packages/server/src/organization-language/organization-language.controller.ts`
- `packages/server/src/organization-language/default-organization-languages.ts`
- `packages/server/src/organization-language/organization-language.module.ts`
- `packages/server/src/organization-language/organization-language.entity.ts`
