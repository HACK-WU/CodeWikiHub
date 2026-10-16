# Agent 执行与任务 · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| POST | `/api/xpert-project/:param/tasks` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| PUT | `/api/xpert-project/:param/tasks/:param` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| GET | `/api/xpert-project/:param/tasks/:param/relations` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
| PUT | `/api/xpert-project/:param/tasks/order` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
