# 项目协作 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| GET | `/api/xpert-project/:param` | `/chat/x/common`、`/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/chat/xpert-workbench/xpert-workbench.facade.ts；apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/:param/access` | `/chat/x/common`、`/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/chat/xpert-workbench/xpert-workbench.facade.ts；apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/assets` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/automations` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| PUT | `/api/xpert-project/:param/automations/:param` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/:param/available-xperts` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-config.component.ts` |
| PUT | `/api/xpert-project/:param/content/instructions` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/file/upload` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/:param/invitations` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-members-dialog.component.ts` |
| DELETE | `/api/xpert-project/:param/invitations/:param` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-members-dialog.component.ts` |
| PATCH | `/api/xpert-project/:param/owner` | `/project/config` | 0 | `apps/cloud/src/app/features/project/project-members-dialog.component.ts` |
| POST | `/api/xpert-project/:param/plans` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| PUT | `/api/xpert-project/:param/plans/:param` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/plans/:param/milestones` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/:param/plans/:param/sprints` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| PUT | `/api/xpert-project/:param/xperts/:param` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project-assistants-dialog.component.ts；apps/cloud/src/app/features/project/project.facade.ts` |
| POST | `/api/xpert-project/invitations/decline` | `/project/invitations/accept` | 0 | `apps/cloud/src/app/features/project/project-invitation-accept.component.ts` |
| GET | `/api/xpert-project/my` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/overview` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/type-entry` | `/project` | 0 | `apps/cloud/src/app/features/project/project-list.component.ts` |
| GET | `/api/xpert-project/types` | `/project` | 0 | `apps/cloud/src/app/features/project/project-list.component.ts` |
