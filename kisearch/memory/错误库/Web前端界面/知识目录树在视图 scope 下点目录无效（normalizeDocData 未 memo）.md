---
groupPath: 错误库/Web前端界面
relation: 知识目录树在视图 scope 下点目录无效（normalizeDocData 未 memo）
exportedAt: "2026-11-20T10:26:50.724Z"
---
知识目录树 `GroupTreePanel` 在**视图 scope**（多库，如 kisearch-docs）下点目录无反应：点子目录 `aria-expanded` 恒为 false、点根恒为 true，看起来「点不开」。
- 根因: 组件渲染期裸调 `const data = normalizeDocData(rawDocList)`；视图下该函数每次返回新对象 ⇒ `data.groups` 每帧换引用 ⇒ 同步 effect 的 `groupsChanged` 恒 true ⇒ 每次重渲染都把树重置为 `withDefaultOpen`（根开、子目录关），用户展开操作被立即弹回。单库模式因归一直接返回原引用而不受影响，故只在视图下暴露。
- 修复: `const data = useMemo(() => normalizeDocData(rawDocList), [rawDocList])`（web/src/components/GroupTreePanel.tsx）。
- 影响面: 两处调用 —— SearchPage 全屏阅读器导航、ReaderLinkComposer 的引用/链接选择器。
- 回归锚点: web/test/browse-tree-state.test.mjs「GroupTreePanel 归一结果必须 memo」。
- 复现/验证: playwright 切 scope=kisearch-docs → 打开引用弹窗 → 点子目录应 false→true（修前恒 false）。修后实测：子目录 docs 4→30、点根 true→false docs 30→3。
- 定责: 与 2026-11-20 的「引用整篇」改动**无关**（对这两个文件 git stash 后复现结果完全一致）。