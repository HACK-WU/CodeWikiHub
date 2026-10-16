# 模型·会员·计费 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| GET | `/api/copilot/membership-models` | `/settings/membership` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts` |
| GET | `/api/membership/admin/members` | `/settings/membership` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts` |
| GET | `/api/membership/admin/users` | `/settings/membership`、`/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts；apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| GET | `/api/membership/admin/users/:param/audit` | `/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| GET | `/api/membership/admin/users/:param/periods` | `/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| GET | `/api/membership/admin/users/:param/personal-points` | `/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| GET | `/api/membership/admin/users/:param/scope-memberships` | `/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| GET | `/api/membership/me` | `/settings/billing` | 0 | `apps/cloud/src/app/features/setting/account/billing.component.ts` |
| POST | `/api/membership/me/details` | `/settings/billing` | 0 | `apps/cloud/src/app/features/setting/account/billing.component.ts` |
| GET | `/api/membership/me/overview` | `/settings/usage` | 0 | `apps/cloud/src/app/features/setting/account/usage.component.ts` |
| GET | `/api/membership/me/periods` | `/settings/usage` | 0 | `apps/cloud/src/app/features/setting/account/usage.component.ts` |
| GET | `/api/membership/me/usage-summary` | `/settings/billing` | 0 | `apps/cloud/src/app/features/setting/account/billing.component.ts` |
| GET | `/api/membership/plans` | `/settings/membership`、`/users/edit/:id、users/:id` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts；apps/cloud/src/app/features/setting/users/user-membership/user-membership.component.ts` |
| DELETE | `/api/membership/plans/:param` | `/settings/membership` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts` |
| GET | `/api/membership/scope/status` | `/settings/membership` | 0 | `apps/cloud/src/app/features/setting/membership/membership.component.ts` |
| GET | `/api/model-access/admin/events` | `/settings/model-access` | 0 | `apps/cloud/src/app/features/setting/model-access/model-access.component.ts` |
| GET | `/api/model-access/admin/grants` | `/settings/model-access` | 0 | `apps/cloud/src/app/features/setting/model-access/model-access.component.ts` |
| GET | `/api/model-access/admin/requests` | `/settings/model-access` | 0 | `apps/cloud/src/app/features/setting/model-access/model-access.component.ts` |
| POST | `/api/model-access/requests` | `/settings/models` | 0 | `apps/cloud/src/app/features/setting/account/available-models.component.ts` |
| GET | `/api/model-gateway/admin/calls` | `/settings/model-gateway` | 0 | `apps/cloud/src/app/features/setting/model-gateway/model-gateway.component.ts` |
| GET | `/api/model-gateway/admin/calls/:param/body` | `/settings/model-gateway` | 0 | `apps/cloud/src/app/features/setting/model-gateway/model-gateway.component.ts` |
| GET | `/api/model-gateway/admin/keys` | `/settings/model-gateway` | 0 | `apps/cloud/src/app/features/setting/model-gateway/model-gateway.component.ts` |
| POST | `/api/model-gateway/admin/keys/:param/revoke` | `/settings/model-gateway` | 0 | `apps/cloud/src/app/features/setting/model-gateway/model-gateway.component.ts` |
| GET | `/api/model-gateway/admin/settings` | `/settings/model-gateway` | 0 | `apps/cloud/src/app/features/setting/model-gateway/model-gateway.component.ts` |
| GET | `/api/model-gateway/calls/my` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| GET | `/api/model-gateway/catalog` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| GET | `/api/model-gateway/grants/my` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| GET | `/api/model-gateway/keys` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| POST | `/api/model-gateway/keys/:param/revoke` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| POST | `/api/model-gateway/requests` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| POST | `/api/model-gateway/requests/:param/withdraw` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| GET | `/api/model-gateway/requests/my` | `/settings/api` | 0 | `apps/cloud/src/app/features/setting/account/model-gateway.component.ts` |
| GET | `⟨xpert⟩/:param/statistics/usage-overview` | `/x/monitor` | 0 | `apps/cloud/src/app/features/xpert/xpert/monitor/statistics/statistics.component.ts` |
| GET | `⟨xpert⟩/tag-usage/:param` | `/organizations、organizations/:id`、`/tenant/tags`、`/w/prompt-workflows` | 0 | `apps/cloud/src/app/@shared/tag/directory/tag-directory.component.ts` |
