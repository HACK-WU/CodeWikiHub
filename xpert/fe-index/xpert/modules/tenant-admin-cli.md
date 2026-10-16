# TenantAdminCliModule（`tenant-admin-cli`）

- **位置**：`apps/api/src/` · 归属文件 **15** 个 · 约 **1901** 行
- **定义**：`apps/api/src/tenant-admin-cli.module.ts:13`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`DatabaseModule`
- **被依赖**（动它会影响）：无
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 数据表（6）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `tenant` | Tenant | 4 | @Module imports forFeature | `packages/server/src/tenant/tenant.service.ts:29` |
| `user` | User | 4 | getRepository | `packages/server/src/tenant/tenant.service.ts:107` |
| `role` | Role | 3 | @Module imports forFeature | `packages/server/src/tenant/tenant.service.ts:33` |
| `email_verification` | EmailVerification | 2 | @InjectRepository | `packages/server/src/user/user.service.ts:159` |
| `feature_organization` | FeatureOrganization | 2 | @InjectRepository | `packages/server/src/user/user.service.ts:165` |
| `external_identity_binding` | ExternalIdentityBinding | 1 | getRepository | `packages/server/src/user/user.service.ts:720` |

## 归属文件（15）

- `apps/api/src/main.ts`
- `apps/api/src/knowledge-filter-v2-migration-cli.ts`
- `apps/api/src/tenant-admin-cli.module.ts`
- `apps/api/src/plugin-config.ts`
- `apps/api/src/schema-sync.ts`
- `apps/api/src/polyfills.ts`
- `apps/api/src/prepare.ts`
- `apps/api/src/tenant-admin-cli.ts`
- `apps/api/src/bootstrap-worker.ts`
- `apps/api/src/seed.ts`
- `apps/api/src/seed-module.ts`
- `apps/api/src/environments/environment.prod.ts`
- `apps/api/src/environments/environment.ts`
- `packages/server/src/tenant/tenant.service.ts`
- `packages/server/src/user/user.service.ts`
