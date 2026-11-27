---
groupPath: 项目踩坑点
relation: 视图下后台任务里 open api 上传的文档查看不了（排查口径）
exportedAt: "2026-11-25T10:48:45.973Z"
---
视图模式下打开「后台任务」，会列出别库的 open api 上传任务，点「新增的文档」却报「Group xxx 未匹配到有效路径」——先分清「视图成员范围」与「文档已被删除」，不要当代码缺陷修。
- 后台任务页跨库：`/api/tasks` 不带 scope 参数、前端 `getTasks(200)` 也不传 ⇒ 列表不受顶栏所选视图影响（在 kisearch-docs 视图下看到 img-demo 的任务属正常，不是串库）
- 视图只聚合成员库：`~/.ki/views.json` 的 members 决定范围；库不在成员里时文档在也不可见。open api 上传用 `?scope=` 指定真实库名，写视图名会被 400 `OPEN_API_VIEW_NOT_WRITABLE` 拒绝（不会产生任务）
- 任务台账是历史快照：`result.created` 的 `[group, relation]` 与库现状会漂移，文档被删进 `.trash` 后点开必 404
- 排查三步：① `/api/doc/list?scope=<任务 scope>` 看文档是否还在 ② `ls ~/.ki-data/<scope>/.trash` 看是否被 manual 删除 ③ 读 `~/.ki/views.json` 看该库是否在视图成员里
- 2026-11-25 已修显示层：`/api/doc/get` 404 现在会查回收站，命中则该库条目返 404 + `code:"DOC_IN_TRASH"` + `trash{kind,group,name,reason,deletedAt,expiresAt,dirName}`，文案改「文档在回收站中（手动删除）」；未命中保持原文案（路径写错不误报）。前端 ModuleDrawer 标题改「该文档已被删除」并给「前往回收站」（先 setScope 再整页跳 /governance/trash）
- 位置：`src/lib/doc-trash-hint.ts`（判据）、`src/lib/mcp-http-api.ts::handleDocGet`（两条 404 分支）、`web/src/components/ModuleDrawer.tsx`（错误区渲染）