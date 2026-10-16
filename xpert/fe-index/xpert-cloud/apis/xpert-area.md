# 助手·工作区·模板·市场 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| GET | `/api/assistant-binding/:param` | `/w/files` | 4 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert-binding-target.service.ts；apps/cloud/src/app/features/xpert/workspace/files/files.component.ts` |
| POST | `/api/assistant-binding/:param/preference` | `/chat`、`/chat/clawxpert`、`/w/clawxpert-skills` | 10 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert.facade.ts` |
| POST | `/api/assistant-binding/bosi/onboarding/connection/resolve` | `//workspace-connection` | 0 | `apps/cloud/src/app/features/assistant/bosi-connector-connect.runtime.ts` |
| GET | `/api/assistant-binding/effective/:param` | — | 1 | `apps/cloud/src/app/features/setting/assistants/assistants.facade.ts` |
| POST | `/api/xpert-marketplace/:param/access-requests` | `/explore` | 0 | `apps/cloud/src/app/features/explore/agent-square/agent-square.component.ts` |
| GET | `/api/xpert-project/:param/workspace/file` | `/project/assets` | 0 | `apps/cloud/src/app/features/project/project-assets.component.ts` |
| POST | `/api/xpert-project/:param/workspace/file/upload` | `/project/assets` | 0 | `apps/cloud/src/app/features/project/project-assets.component.ts` |
| GET | `/api/xpert-project/:param/workspace/files` | `/project/assets` | 0 | `apps/cloud/src/app/features/project/project-assets.component.ts` |
| GET | `/api/xpert/:param/template-setup` | `/chat/c/:id` | 0 | `apps/cloud/src/app/features/chat/xpert/template-setup.component.ts` |
| PUT | `/api/xpert/:param/template-setup/routines/:param` | `/chat/c/:id` | 0 | `apps/cloud/src/app/features/chat/xpert/template-setup.component.ts` |
| GET | `⟨plugin⟩/marketplace/public` | `//plugins`、`/plugins/marketplace` | 0 | `apps/cloud/src/app/features/setting/plugins/marketplace/marketplace.component.ts` |
| GET | `⟨plugin⟩/marketplace/registry` | `//plugins`、`/plugins/marketplace` | 0 | `apps/cloud/src/app/features/setting/plugins/marketplace/marketplace.component.ts` |
| POST | `⟨plugin⟩/marketplace/sources` | `//plugins`、`/plugins/marketplace` | 0 | `apps/cloud/src/app/features/setting/plugins/marketplace/marketplace.component.ts` |
| DELETE | `⟨skillPackage⟩/workspace/:param/:param` | `/w/clawxpert-skills` | 0 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert-tool-preferences.component.ts` |
| GET | `⟨skillPackage⟩/workspace/:param/:param/download` | `/w/clawxpert-skills` | 0 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert-tool-preferences.component.ts` |
| POST | `⟨skillPackage⟩/workspace/:param/:param/share` | — | 1 | `apps/cloud/src/app/features/explore/skills/share/share-dialog.component.ts` |
| POST | `⟨skillPackage⟩/workspace/:param/install-github` | `/w/skills` | 1 | `apps/cloud/src/app/@shared/skills/github-install/github-install.component.ts` |
| POST | `⟨skillRepository⟩/workspace-public/ensure` | `/tenant/skills` | 0 | `apps/cloud/src/app/features/setting/tenant/skills/skills.component.ts` |
