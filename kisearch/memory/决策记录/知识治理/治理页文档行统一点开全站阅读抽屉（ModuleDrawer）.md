---
groupPath: 决策记录/知识治理
relation: 治理页文档行统一点开全站阅读抽屉（ModuleDrawer）
exportedAt: "2026-11-23T09:48:25.664Z"
---
【决策｜治理页文档行统一可点开正文】

**背景**：治理三页（分类 / 事件 / 回收站）的行内文档名原先是纯文本 `<div>`，用户看到标题后无法查看原文 —— 事件页「关联文档 / 参考文档」点了完全没反应（demo 有抽屉、实现漏接线），分类页同理。

**决策**：所有治理页的文档行，**文档名一律渲染成 `<button>`**（重置成文本样式），点击 `setDocTarget`，页面末尾渲染 `<ModuleDrawer scope module group fetcher onClose>`。

- 复用而非新造：`ModuleDrawer` 是全站阅读器（大纲 / 文档内查找 / 全屏 / 复制下载），与浏览页、任务页、数据源页、AI 引用预览同一形态；设计 S07 §3.3「文档抽屉直接复用 ModuleDrawer」。
- 正文走 `getDocContent`（`/api/doc/get`，read 通道），导入/向量化期间不被 MCP 写队列排队；`key` 含 group+name 保证切篇重挂载，正文/大纲/滚动不串台。
- 引用已失效（stale）仍允许点：由阅读器给「未找到 + 路径」失败态，比禁用更容易查清是哪一篇没了。
- 与 demo 差异：抽屉 70vw、无遮罩、完整阅读器，不是 560px + 遮罩的只读弹窗。
- 可点击样式：事件页 `.gov-docline__main`（hover 底色 + 名称转主色）、分类页/回收站 `.gov-cell-name--link`（hover 主色下划线），均带 `focus-visible` 描边。

**落地位置**：`web/src/pages/EventsPage.tsx`、`web/src/pages/LifecyclePage.tsx`、`web/src/pages/TrashPage.tsx`、`web/src/styles/governance.css`。

**回收站页（2026-11-23 补齐，第三页）**：文档名同样改按钮 + `ModuleDrawer`，但**取数不能照抄** —— `/api/doc/get` 会因文档已从 KB 摘除而 404，正文只剩 `.trash/…/content.md`，故改用 `GET /governance/trash/content`（详见同 Group「回收站条目正文快照端点」）。这同时回答了本文旧「待办」：`doc/get` 读不到回收站文档。

**验证**：事件页/分类页 2026-11-15 真机实测 8 个入口；回收站 2026-11-23 真机 6 个文档名可点、正文 1453 字、Esc 可关、抽屉无编辑/删除动作。静态守卫 `web/test/governance-doc-open-ui.test.mjs` 三页全覆盖。