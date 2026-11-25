---
groupPath: 错误库/Web前端界面
relation: 常驻页面各自渲染同一 tab 条导致重复 id 与键盘焦点丢失
exportedAt: "2026-11-16T04:12:21.557Z"
---
合并页（REQ-20261116-002）改造中实测到的缺陷：`/import` 与 `/write` 两个面板都在 AppShell 常驻（离开时只 `display:none`），若两个页面组件都无条件渲染共享的页级 tab 条 `WriteTabs`，则在 `/write` 上 DOM 里同时存在 **2 个 `aria-selected=true` 的按钮与重复的 `id`**。

- 现象：真机断言 `locator('.ki-page-tabs button[aria-selected="true"]')` 解析到 2 个元素（strict mode violation）；键盘 `←/→` 用 `document.getElementById` 找人，会命中 `display:none` 子树里的那一份 → `focus()` 无效，焦点丢失。
- 根因：tab 条按 `location.pathname` 推断选中态，但**渲染条件没跟可见性绑定**；常驻面板的隐藏实例照样渲染。
- 解法：每个页面只在自己可见时渲染 tab 条 —— `ImportPage` 用 `{onImportTab ? <WriteTabs/> : null}`，`WritePage` 用 `{onWriteTab ? <WriteTabs/> : null}`（两者都已有该路径判定），保证同一时刻只有一个实例。
- 通用判据：**任何「多个常驻面板共用一个带 id / role=tablist 的控件」时，都要按可见性收敛到一个实例**；`display:none` 不会阻止渲染与 id 冲突。