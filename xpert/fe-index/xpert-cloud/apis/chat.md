# 对话与会话（含 /api/ai 调用面） · 接口反查（xpert-cloud）

| 方法 | 接口 | 直接调用页面 | 间接候选 | 定义/证据位置 |
|---|---|---|---|---|
| GET | `/api/ai/groups` | — | 2 | `apps/cloud/src/app/features/chat/workbench-chat/workbench-assistant-menu.component.ts` |
| PATCH | `/api/ai/groups/:param/preferences` | — | 2 | `apps/cloud/src/app/features/chat/workbench-chat/workbench-assistant-menu.component.ts` |
| GET | `/api/ai/threads/:param` | `/chat/assistant、chat/assistant/:threadId`、`/chat/x/common` | 0 | `apps/cloud/src/app/features/chat/clawxpert/clawxpert-conversation-detail.component.ts` |
| GET | `/api/xpert-project/:param/conversations` | `/project`、`/project/:id`、`/project/assets`、`/project/config`、`/project/plan`、`/project/tasks` | 0 | `apps/cloud/src/app/features/project/project.facade.ts` |
