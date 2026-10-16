---
groupPath: 错误库/Web前端界面
relation: Markdown 表格长内容列挤压与溢出容器
exportedAt: "2026-10-13T11:25:53.258Z"
---
【错误库｜Markdown 表格长内容列挤压与溢出容器】
- 报错原文片段：无控制台报错（视觉缺陷）。用户口径原话「AI 回答渲染表格时，如果其中一列内容很长，会把后面的列推过去很多」。可量测特征：表格 getBoundingClientRect().width 远大于正文容器 clientWidth，且某一列 th 宽度接近整表宽度。
- 现象：Markdown 表格某列含无断点长串（长 path、长 URL、无空格长词、无断点行内代码，如 custom-columns="NAME:.metadata.name,REV:..."）时，该列吃掉绝大部分宽度，其余列被压到每行 2 至 6 个字，表格整体溢出容器（被裁切或让消息区出现横向滚动）。容器越窄越严重。
- 根因：渲染链路没有给 Markdown 表格任何样式（项目里只有业务数据表的 table 规则，容易被误当成 Markdown 表格样式），表格因此走浏览器默认 table-layout auto；auto 布局先满足每列的 min-content，而无断点长串的 min-content 就是该串本身宽度（实测单列可达 996px），表格总宽被顶到 1128.9px，容器只有 355px 或 880px。同一根因也发生在表格之外：段落、列表、引用里的长串同样溢出正文容器（实测 380px 面板下溢出 386px）。
- 解法：给 Markdown 根容器加一行 overflow-wrap: anywhere（必须 anywhere，不能用 break-word —— 只有 anywhere 会把软换行机会计入 min-content，才会让 auto 表格收敛）；再按需补表格最小样式：border-collapse collapse、1px 主题 token 边框、8px 10px 内距、表头底色、左对齐、vertical-align top（多行单元格不错位）。不要设 width 100%（短表格会被拉散），不要用 table-layout fixed（两列被强行等分，短列浪费空间）。
- 验证方式：用 Playwright 把真实渲染器产出的表格 HTML 注入真实消息容器量测，断言表格溢出不超过 1px、消息区 scrollWidth 等于 clientWidth、最窄列不小于 44px、短表格宽度小于容器宽；修复后 380px 面板下溢出 773.9 归零、列宽由 995.8 与 127.1 恢复为 214.7 与 139.3，四列表格最窄列由 25.4px 恢复到 59.7px，长串文本溢出 386 归零，web 单测 191 项全通过。
- 关联方案：.solutions/frontend/markdown-long-token-overflow/