# 租户·用户·组织·设置 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| GET | `/api/languages` | `/settings/email-templates` | 0 | `apps/cloud/src/app/features/setting/email-templates/email-templates.component.ts` |
| DELETE | `/api/languages/:param` | `/settings/email-templates` | 0 | `apps/cloud/src/app/features/setting/email-templates/email-templates.component.ts` |
| PUT | `/api/organization/:param` | `/organizations、organizations/:id` | 8 | `apps/cloud/src/app/@shared/organization/avatar-editor.component.ts；apps/cloud/src/app/features/setting/organizations/organizations.component.ts` |
| POST | `/api/organization/:param/demo` | `/organizations、organizations/:id` | 0 | `apps/cloud/src/app/features/setting/organizations/organizations.component.ts` |
| PUT | `/api/role-permissions/:param` | `/roles` | 0 | `apps/cloud/src/app/features/setting/roles/roles.component.ts` |
| POST | `/api/role-permissions/sync-defaults` | `/roles` | 0 | `apps/cloud/src/app/features/setting/roles/roles.component.ts` |
| GET | `/api/roles` | `/roles`、`/users` | 4 | `apps/cloud/src/app/@shared/user/forms/basic-info/basic-info-form.component.ts；apps/cloud/src/app/features/setting/roles/roles.component.ts` |
| PUT | `/api/roles/:param` | `/roles`、`/users` | 4 | `apps/cloud/src/app/@shared/user/forms/basic-info/basic-info-form.component.ts；apps/cloud/src/app/features/setting/roles/roles.component.ts` |
| POST | `/api/tenant-setting` | `/tenant/membership`、`/tenant/retention`、`/tenant/settings` | 0 | `apps/cloud/src/app/features/setting/tenant/membership/membership.component.ts；apps/cloud/src/app/features/setting/tenant/retention/retention.component.ts` |
| POST | `/api/user-organization` | `/users/organizations`、`/organizations、organizations/:id`、`/settings/organizations` | 0 | `apps/cloud/src/app/features/setting/organizations/organization-members/organization-members.component.ts；apps/cloud/src/app/features/setting/users/organizations/organizations.component.ts` |
| PUT | `/api/user-organization/:param` | `/users`、`/users/organizations`、`/organizations、organizations/:id`、`/project`、`/project/config`、`/settings/groups`、`/settings/organizations` | 0 | `apps/cloud/src/app/features/project/project-members-dialog.component.ts；apps/cloud/src/app/features/setting/users/manage-user/manage-user.component.ts` |
| GET | `/api/xpert-project/:param/members` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-config.component.ts；apps/cloud/src/app/features/project/project-members-dialog.component.ts` |
| PATCH | `/api/xpert-project/:param/members/:param` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-members-dialog.component.ts` |
| GET | `⟨base⟩/email/:param` | `//`、`/organizations、organizations/:id`、`/settings/password`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id` | 4 | `apps/cloud/src/app/@core/state/users.service.ts` |
| PUT | `⟨base⟩/preferred-language/:param` | `//`、`/organizations、organizations/:id`、`/settings/password`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id` | 4 | `apps/cloud/src/app/@core/state/users.service.ts` |
| GET | `⟨customSmtp⟩/setting` | `/custom-smtp/tenant、custom-smtp/organization 等 3 条` | 0 | `apps/cloud/src/app/@shared/smtp/smtp.component.ts` |
| POST | `⟨customSmtp⟩/validate` | `/custom-smtp/tenant、custom-smtp/organization 等 3 条` | 0 | `apps/cloud/src/app/@shared/smtp/smtp.component.ts` |
| POST | `⟨feature⟩/upgrade` | `/settings/features` | 0 | `apps/cloud/src/app/features/setting/features/features.component.ts` |
| POST | `⟨tenant⟩/:param/demo` | `/settings/tenant` | 0 | `apps/cloud/src/app/features/setting/tenant/demo/demo.component.ts` |
| DELETE | `⟨user⟩/:param` | `/settings/profile`、`//`、`/organizations、organizations/:id`、`/settings`、`/settings/account`、`/settings/password`、`/users`、`/users/edit/:id、users/:id` | 13 | `apps/cloud/src/app/@shared/user/avatar/avatar-editor.component.ts；apps/cloud/src/app/features/setting/users/edit-user/edit-user.component.ts` |
| GET | `⟨user⟩/me` | `//`、`/organizations、organizations/:id`、`/settings/password`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id`、`/settings`、`/settings/account` | 13 | `apps/cloud/src/app/@theme/header/user/user.component.ts；apps/cloud/src/app/features/setting/account/profile.component.ts` |
