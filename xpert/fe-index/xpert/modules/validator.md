# ValidatorModule（`validator`）

- **位置**：`packages/server/src/shared/validators/` · 归属文件 **9** 个 · 约 **260** 行
- **定义**：`packages/server/src/shared/validators/validator.module.ts:11`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`EmployeeModule`、`RoleModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`SharedModule`

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `role` | Role | 2 | @InjectRepository | `packages/server/src/shared/validators/constraints/role-should-exist.constraint.ts:19` |
| `user_organization` | UserOrganization | 2 | @InjectRepository | `packages/server/src/shared/validators/constraints/organization-belongs-to-user.constraint.ts:17` |

## 归属文件（9）

- `packages/server/src/shared/validators/is-organization-belongs-to-user.decorator.ts`
- `packages/server/src/shared/validators/index.ts`
- `packages/server/src/shared/validators/is-role-should-exist.decorator.ts`
- `packages/server/src/shared/validators/validator.module.ts`
- `packages/server/src/shared/validators/is-tenant-belongs-to-user.decorator.ts`
- `packages/server/src/shared/validators/constraints/role-should-exist.constraint.ts`
- `packages/server/src/shared/validators/constraints/organization-belongs-to-user.constraint.ts`
- `packages/server/src/shared/validators/constraints/index.ts`
- `packages/server/src/shared/validators/constraints/tenant-belongs-to-user.constraint.ts`
