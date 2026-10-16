# 其他与公共 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| DELETE | `/api/connector/:param/:param` | `/w/connectors、w/clawxpert-connectors` | 0 | `apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| POST | `/api/connector/:param/:param/connect` | `/w/connectors、w/clawxpert-connectors` | 0 | `apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| GET | `/api/connector/bindings` | `/w/connectors、w/clawxpert-connectors`、`/project/config` | 0 | `apps/cloud/src/app/features/project/project-connectors-dialog.component.ts；apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| DELETE | `/api/connector/bindings/:param` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-connectors-dialog.component.ts` |
| POST | `/api/connector/bindings/:param/connect` | `/w/connectors、w/clawxpert-connectors`、`/project/config` | 0 | `apps/cloud/src/app/features/project/project-connectors-dialog.component.ts；apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| POST | `/api/connector/bindings/:param/integration` | `/w/connectors、w/clawxpert-connectors` | 0 | `apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| GET | `/api/connector/definitions` | `/w/connectors、w/clawxpert-connectors`、`/project/config` | 0 | `apps/cloud/src/app/features/project/project-connectors-dialog.component.ts；apps/cloud/src/app/features/xpert/workspace/connectors/connectors.component.ts` |
| GET | `/api/connector/integration-options` | `/w/connectors、w/clawxpert-connectors` | 0 | `apps/cloud/src/app/features/xpert/workspace/connectors/connector-integration-form.component.ts` |
| PUT | `/api/data-source/:param` | — | 2 | `apps/cloud/src/app/features/setting/data-sources/edit/edit.component.ts` |
| POST | `/api/data-source/:param/ping` | — | 1 | `apps/cloud/src/app/features/setting/data-sources/edit/edit.component.ts` |
| POST | `/api/data-source/ping` | — | 1 | `apps/cloud/src/app/features/setting/data-sources/edit/edit.component.ts` |
| POST | `/api/mcp-api-keys/:param/revoke` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| POST | `/api/mcp-api-keys/:param/rotate` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| PATCH | `/api/mcp-publications/:param` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| POST | `/api/mcp-publications/:param/api-keys` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| GET | `/api/mcp-publications/:param/audit` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| GET | `/api/mcp-publications/:param/connection-info` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| POST | `/api/mcp-publications/:param/disable` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| POST | `/api/mcp-publications/:param/enable` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| POST | `/api/mcp-publications/:param/test` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-publications/publications.component.ts` |
| PUT | `/api/xpert-access-requests/:param/approve` | `//xpert-access-requests` | 0 | `apps/cloud/src/app/features/xpert-access-requests/review-requests-list.component.ts` |
| PUT | `/api/xpert-access-requests/:param/reject` | `//xpert-access-requests` | 0 | `apps/cloud/src/app/features/xpert-access-requests/review-requests-list.component.ts` |
| GET | `/api/xpert-access-requests/reviewable` | `//xpert-access-requests` | 0 | `apps/cloud/src/app/features/xpert-access-requests/review-requests-list.component.ts` |
| POST | `/api/xpert-toolset/operations/mcp-runtimes/:param/stop` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-runtimes.component.ts` |
| POST | `/api/xpert-toolset/operations/mcp-runtimes/kill` | `//operations` | 0 | `apps/cloud/src/app/features/operations/mcp-runtimes.component.ts` |
| POST | `⟨assistants⟩/:param/configuration/capabilities/preview` | — | 1 | `apps/cloud/src/app/features/xpert/xpert/blank/blank-project-management.ts` |
| POST | `⟨base⟩/:param/password` | `/settings/password`、`//`、`/organizations、organizations/:id`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id` | 4 | `apps/cloud/src/app/@core/state/users.service.ts；apps/cloud/src/app/features/setting/account/password.component.ts` |
| PUT | `⟨base⟩/preferred-layout/:param` | `//`、`/organizations、organizations/:id`、`/settings/password`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id` | 4 | `apps/cloud/src/app/@core/state/users.service.ts` |
| GET | `⟨base⟩/search` | `//`、`/organizations、organizations/:id`、`/settings/password`、`/settings/profile`、`/users`、`/users/edit/:id、users/:id` | 4 | `apps/cloud/src/app/@core/state/users.service.ts` |
| POST | `⟨base⟩/v1/chatkit/sessions` | `/x-chatkit/h5/:platform/:name/c/:id、x-chatkit/h5/:platform/:name 等 4 条` | 24 | `apps/cloud/src/app/features/assistant/assistant-chatkit.runtime.ts` |
| POST | `⟨index⟩/sync/:param` | — | 2 | `apps/cloud/src/app/@shared/skills/skill-repository/skill-repository.component.ts` |
| GET | `⟨repository⟩/availables` | `/explore`、`/tenant/skills`、`/w/skills` | 1 | `apps/cloud/src/app/@shared/skills/skill-repositories/skill-repositories.component.ts；apps/cloud/src/app/features/explore/skills/skills.component.ts` |
