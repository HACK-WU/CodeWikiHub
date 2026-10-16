# 插件与技能 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| POST | `/api/plugin-applications/bind-toolset` | `/explore/apps/:appName` | 0 | `apps/cloud/src/app/features/explore/app-detail/app-toolsets.component.ts` |
| GET | `/api/plugin-applications/catalog` | `/explore` | 0 | `apps/cloud/src/app/features/explore/agent-square/agent-square.component.ts` |
| POST | `/api/plugin-applications/initialize` | `/explore/apps/:appName` | 0 | `apps/cloud/src/app/features/explore/app-detail/app-detail.component.ts` |
| POST | `/api/plugin-applications/prepare` | `/explore/apps/:appName` | 0 | `apps/cloud/src/app/features/explore/app-detail/app-toolsets.component.ts` |
| POST | `/api/system/setup/plugins` | `/onboarding/plugins` | 0 | `apps/cloud/src/app/onboarding/plugins/setup-plugins.component.ts` |
| GET | `/api/xpert-project/:param/content/skills` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project-skills-dialog.component.ts；apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/content/skills/install` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-config.component.ts` |
| POST | `/api/xpert-project/:param/content/skills/upload` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-config.component.ts` |
| POST | `⟨skillPackage⟩/install` | `/explore`、`/w/clawxpert-skills` | 1 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert-tool-preferences.component.ts；apps/cloud/src/app/features/explore/skills/install/install.component.ts` |
