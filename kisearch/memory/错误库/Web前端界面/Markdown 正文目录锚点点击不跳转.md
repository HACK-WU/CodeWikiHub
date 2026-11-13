---
groupPath: 错误库/Web前端界面
relation: Markdown 正文目录锚点点击不跳转
exportedAt: "2026-11-12T09:36:14.508Z"
---
文档正文里手写的「目录」条目（`[一、执行摘要](#一、执行摘要)`）点击后页面不动，只有 URL hash 变了。根因两层：① `MarkdownPreview.buildRenderer()` 从未覆盖 `renderer.heading`，而 marked 自 v5 移除 `headerIds`（v18 默认只出 `<h2>文本</h2>`）⇒ 标题没有 id，`#anchor` 无目标元素；② 即便补 GitHub slug（`一、执行摘要`→`一执行摘要`），AI/手写目录常把带标点的标题原文直接当锚点，精确匹配仍 miss。
- 现象取证：真机 18 个标题 0 个带 id、`getElementById('简介')===null`、点击后 `.ki-drawer__body` 的 scrollTop 恒为 0
- 解法：`renderer.heading` 输出 GitHub 口径 slug（`headingSlug`，重名加 `-1`、空 slug 回落 `section`）+ 点击代理 `resolveAnchorTarget`（先精确 id，再 `normalizeAnchorKey` 去标点兜底）+ `scrollToAnchorTarget` 滚最近可滚动祖先并留 20px（阅读器是 `.ki-drawer__body`，不是 window），`preventDefault` 不写 hash
- 两个易踩的坑（二次审查发现）：① 别用 `[id="…"]` 属性选择器匹配锚点——含换行时 `querySelector` 直接抛 SyntaxError；遍历 `[id]` 比对 `el.id` ② 折叠 `<details>` 里的标题无布局盒（rect 全 0），要先展开外层 details 再滚，否则跳到错位置
- 边界：只在当前 `.ki-markdown` 块内解析（对话流每消息一块，跨块会滚到别的消息）；跨块重复 id 属已知取舍
- 验证：真实 KB 两篇 ×10 锚点全通（距顶 20px）+ 三种锚点写法同页 + 生产构建（:7423）复验；`npm test` 1140、tsc 0、build ✓；守卫 `web/test/markdown-anchor.test.mjs`
- 位置：`web/src/components/MarkdownPreview.tsx`；证据 `.debug/md-heading-anchor-no-jump-20261112/`