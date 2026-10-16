# XpertMarketplaceModule（`xpert-marketplace`）

- **位置**：`packages/server-ai/src/xpert-marketplace/` · 归属文件 **5** 个 · 约 **975** 行
- **定义**：`packages/server-ai/src/xpert-marketplace/xpert-marketplace.module.ts:11`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `xpert-marketplace`、`xpert-access-requests` · 视图/接口入口 **7** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-marketplace/xpert-marketplace.controller.ts`（XpertMarketplaceController） | `-` | 7 | `:40` |

## 依赖关系

- **依赖**（改它要连带看）：`XpertTemplateModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert` | Xpert | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts:43` |
| `xpert_access_request` | XpertAccessRequest | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts:45` |
| `user_group` | UserGroup | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts:47` |
| `user` | User | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts:49` |

## 归属文件（5）

- `packages/server-ai/src/xpert-marketplace/xpert-marketplace.controller.ts`
- `packages/server-ai/src/xpert-marketplace/xpert-marketplace.service.ts`
- `packages/server-ai/src/xpert-marketplace/xpert-marketplace.module.ts`
- `packages/server-ai/src/xpert-marketplace/index.ts`
- `packages/server-ai/src/xpert-marketplace/xpert-access-request.entity.ts`
