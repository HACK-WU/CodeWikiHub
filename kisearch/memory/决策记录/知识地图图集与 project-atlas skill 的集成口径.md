---
groupPath: 决策记录
relation: 知识地图图集与 project-atlas skill 的集成口径
exportedAt: "2026-11-24T06:45:45.575Z"
---
project-atlas skill（外部，/root/skills/skills/project-atlas）与本仓「知识地图图集」能力的分工口径：skill 只当生成侧，展示侧自建，不复用其单文件 HTML 形态。

- 生成侧（AI / 本地 agent）：策划视图 → archify 出图导 SVG → collect_snippets.py 抽片段并自检覆盖率 → 产出 atlas.config.json（nav/pages/code）+ views/*.svg + snippets.json。脚本可原样复用，但只在生成时跑，不进产品运行时。
- 展示侧（本仓）：复用框架「配置驱动 + SVG 内联 shadow DOM + 代码抽屉」的交互，但取数改为接口（框架现有 3 处 fetch：atlas.config.json:975、图源 :565/:836、snippets.json:1012），数据落在 scope KB 内，由 Web 页面渲染。
- 契约可直接对接 D8~D12：snippets.json 的 {file,line,endLine,snippet,commit,why} 与 D12 的 snapshots[nodeId] 同形；nav[].name/q 对应 categoryMeta{name,question}；views/{id}.svg 即条目图源。
- 三处必须取平台口径：① 产物形态用条目 JSON + SVG，不用烘焙单文件（本仓无目录静态服务，/api/asset 只发图片且 SVG 带 CSP sandbox）；② 片段由 AI 随 JSON 上传，平台不读源码；③ 抽屉用 D10 的 min(560px,92vw) + 遮罩 pointer-events:none（可开着抽屉切图），实测框架是 960px 半屏且 <1000px 走底部半屏会遮住图体。
- 实测基线（2026-11-24）：框架 1038 行；demo 4 图 188KB（archify 真图 173KB 含内联字体、手绘 2KB/张），单文件烘焙 252KB；375 下页面无横向溢出、图容器 overflow-x:auto 且 SVG min-width 680。
- 已核缺陷：SKILL 核心原则 6（点面板外任意处关闭）与阶段 6 检查项（点图空白不应关闭）自相矛盾，实测行为是「不关」；反模式「给所有节点挂 pointer」与实现相左（全节点 cursor:pointer，概念节点有兜底面板），不影响使用。
- 不做：产品内 IR→SVG 渲染（archify 只在有 shell 的环境可用）。