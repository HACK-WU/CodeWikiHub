# AccountBindingModule（`account-binding`）

- **位置**：`packages/server/src/account-binding/` · 归属文件 **5** 个 · 约 **501** 行
- **定义**：`packages/server/src/account-binding/account-binding.module.ts:9`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `me` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/account-binding/account-binding.controller.ts`（AccountBindingController） | `-` | 2 | `:25` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`AuthModule`、`EnterpriseChatkitModule`、`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `user` | User | 7 | @Module imports forFeature | `packages/server/src/account-binding/account-binding.service.ts:48` |
| `external_identity_binding` | ExternalIdentityBinding | 5 | @Module imports forFeature | `packages/server/src/account-binding/account-binding.service.ts:46` |

## 归属文件（5）

- `packages/server/src/account-binding/account-binding.module.ts`
- `packages/server/src/account-binding/index.ts`
- `packages/server/src/account-binding/account-binding.service.ts`
- `packages/server/src/account-binding/external-identity-binding.entity.ts`
- `packages/server/src/account-binding/account-binding.controller.ts`
