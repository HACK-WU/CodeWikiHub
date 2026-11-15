---
groupPath: 决策记录/知识治理
relation: 治理页文档行统一点开全站阅读抽屉（ModuleDrawer）
exportedAt: "2026-11-15T14:08:37.786Z"
---
【决策｜治理页文档行统一可点开正文】

**背景**：治理三页（分类 / 事件 / 回收站）的行内文档名原先是纯文本 `<div>`，用户看到「登录态失效根因」这类标题后无法查看原文 —— 事件页 `关联文档`/`参考文档` 点了完全没反应（demo 有抽屉，实现漏接线），分类页文档名同理。

**决策**：所有治理页的文档行，**文档名一律渲染成 `<button>`**（重置成文本样式，保持原有字号/字重/对齐），点击 `setDocTarget({group,name})`，页面末尾渲染 `<ModuleDrawer scope module group fetcher={getDocContent} onClose>`。

- 复用而非新造：`ModuleDrawer` 是全站阅读器（大纲 / 文档内查找 / 全屏 / 编辑下载入口），与浏览页、任务页、数据源页、AI 引用预览同一形态；设计 `S07 §3.3` 亦要求「文档抽屉直接复用 ModuleDrawer」。
- 正文走 `getDocContent`（`/api/doc/get`，read 通道），导入/向量化期间不会被 MCP 写队列排队；`key` 含 `group+name` 保证切换文档时整块重挂载，正文/大纲/滚动不串台。
- 引用已失效（`stale`，文档已不存在）仍允许点：由阅读器给出「未找到 + 路径」的失败态，比禁用更容易让人查清是哪一篇没了。
- 与 demo 的有意差异：抽屉是 70vw、无遮罩、带完整阅读器，不是 demo 里 560px + 遮罩的只读弹窗。
- 可点击样式：事件页 `.gov-docline__main`（hover 底色 + 名称转主色）、分类页 `.gov-cell-name--link`（hover 主色下划线），均带 `focus-visible` 描边。

**落地位置**：`web/src/pages/EventsPage.tsx`（关联/参考文档）、`web/src/pages/LifecyclePage.tsx`（文档列表）、`web/src/styles/governance.css`。

**验证**：`web tsc --noEmit` 0 错；`node --test test/*.test.mjs` 1168 例全绿；agent-browser 实测事件页 3 个入口、分类页 5 个入口均能打开正文（507 / 490 / 74 字符）。台账 `.debug/gov-docline-open-unwired-20261115/`。

**待办**：回收站页文档名（`TrashPage`）尚未接通 —— 回收站文档已进 `trash` 目录，`doc/get` 是否可读需先确认，不要贸然照抄。