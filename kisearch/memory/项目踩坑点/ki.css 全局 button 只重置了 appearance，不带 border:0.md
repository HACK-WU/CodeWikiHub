---
groupPath: 项目踩坑点
relation: "ki.css 全局 button 只重置了 appearance，不带 border:0"
exportedAt: "2026-11-20T04:57:45.548Z"
---
在 ki.css 体系里新写按钮式组件（如浏览页筛选面板的字段行 `.cf-field`）时，如果只写 padding / border-radius / background，会渲染成"一排带 UA 默认边框与灰底的方块按钮"，与 demo 差异明显。
- 原因：ki.css 的全局重置（约 175 行）只有 `font / cursor / appearance`，**没有 border:0 与 background:transparent**；demo 文件自带完整 reset，所以 demo 里不写 border:0 也正常。
- 做法：新增按钮式组件必须显式写 `border: 0; background: transparent;`（或复用 `.ki-btn` 家族）。同类需要检查的还包括 `.cond-chip__x` 这种仅用 button 做小图标的元素。
- 影响位置：`web/src/styles/ki.css` 的 `.ki-cond-panel .cf-field` / `.cond-chip__x`。
- 附：从 demo 搬样式到 ki.css 前，先比较两份全局 reset 的差异，否则"demo 好看、上线变丑"会反复发生。