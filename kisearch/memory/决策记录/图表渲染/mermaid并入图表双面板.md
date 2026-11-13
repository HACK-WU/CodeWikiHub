---
groupPath: 决策记录/图表渲染
relation: mermaid并入图表双面板
exportedAt: "2026-11-12T06:45:09.760Z"
---
2026-11-12 起 mermaid 块也走「图表 / 代码」双面板（与 PlantUML / ECharts 同构），此前它是“直接替换 pre”的老形态。统一为 `data-ki-diagram="mermaid|plantuml|echarts"` + 一条渲染 effect。
- 为什么合并: 三种图共 90% 逻辑（面板切换 / 失败兜底 / 复制取原文 / 主题重绘），原来 mermaid 单独一套（自收集目标 + 复用 data-copy-text 容器），两份维护必然漂移
- ★ 兼容保留: 图容器同时带 `ki-diagram__figure` 与 `ki-mermaid` 两个类（仓库里既有走查脚本都按 `.ki-mermaid svg` 定位）；CSS 里用 `.ki-markdown .ki-diagram__figure.ki-mermaid` 把 `.ki-mermaid` 的卡片样式归零，否则容器里会再套一层边框
- 回退点: 主题切换由 effect 依赖 theme 触发重绘（mermaid 需重新 initialize）；失败打 `data-ki-diagram-failed=1` 跳过重试
- ⚠️ 行为变更: `::: code-group` 内含 mermaid 不再渲染成图（以前旧 effect 能命中 panel 里的 `pre > code.language-mermaid`），现在显示源码 —— 该用法本就是 docs/markdown-multilang.md 明令禁止的（组内只放代码块）
- 验证: web 单测 1109/1109、tsc 0、build ✓；真机（生产构建 + 真实 daemon）三类图同页均出图 + mermaid 切代码面板 + 复制取原文 + 暗色重绘 + 语法错误兜底