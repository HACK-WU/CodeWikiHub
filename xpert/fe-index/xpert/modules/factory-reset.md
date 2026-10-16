# FactoryResetModule（`factory-reset`）

- **位置**：`packages/server/src/user/factory-reset/` · 归属文件 **2** 个 · 约 **248** 行
- **定义**：`packages/server/src/user/factory-reset/factory-reset.module.ts:7`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`UserModule`

## 数据表（3）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `organization` | Organization | 2 | @InjectRepository | `packages/server/src/user/factory-reset/factory-reset.service.ts:19` |
| `user` | User | 2 | @InjectRepository | `packages/server/src/user/factory-reset/factory-reset.service.ts:23` |
| `user_organization` | UserOrganization | 2 | @InjectRepository | `packages/server/src/user/factory-reset/factory-reset.service.ts:26` |

## 归属文件（2）

- `packages/server/src/user/factory-reset/factory-reset.service.ts`
- `packages/server/src/user/factory-reset/factory-reset.module.ts`
