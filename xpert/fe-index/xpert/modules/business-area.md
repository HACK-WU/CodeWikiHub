# BusinessAreaModule（`business-area`）

- **位置**：`packages/server/src/business-area/` · 归属文件 **5** 个 · 约 **205** 行
- **定义**：`packages/server/src/business-area/business-area.module.ts:9`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `:id` · 视图/接口入口 **5** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/business-area/business-area.controller.ts`（BusinessAreaController） | `-` | 5 | `:15` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `business_area` | BusinessArea | 3 | @Module imports forFeature | `packages/server/src/business-area/business-area.service.ts:13` |

## 守卫/权限

`RoleGuard`

## 归属文件（5）

- `packages/server/src/business-area/business-area.entity.ts`
- `packages/server/src/business-area/business-area.service.ts`
- `packages/server/src/business-area/index.ts`
- `packages/server/src/business-area/business-area.module.ts`
- `packages/server/src/business-area/business-area.controller.ts`
