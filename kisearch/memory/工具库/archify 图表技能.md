---
groupPath: 工具库
relation: archify 图表技能
exportedAt: "2026-11-20T10:20:03.480Z"
---
把一句话想法 / 代码库转成自包含交互式 HTML 图的 agent skill（tt-a1i/archify，Apache-2.0）。本地 ~/.codebuddy/skills/archify，已升 v3.2.0 stable（11 类图），零运行时依赖，Node ≥18。

- 流程：`doctor` → `guide` → 手写 JSON IR → `validate --quality showcase --json` → `deliver` → `visual-check`；showcase 须 9/9、0 error 0 warning
- v3.2.0 坑：`meta.output` 须相对路径且在产物目录内执行；失败交付留 `.archify-delivery-lock.json` 需清理（项目 temp/ 另触发 journal hardlink，换 /tmp 可跑）；workflow v1 同泳道相邻列必重叠（列中心距约 80px）→ 每环节独立泳道；viewBox 宽 >1085 触发可读性拒绝；boundary 框内不得含非成员；标签三难用 labelDx/labelDy/labelAt 调

**嵌入网页（已实测绕通）**
1. 产物 700~820KB 单文件 HTML；**`file://` 下 iframe 加载本地 HTML 被浏览器拦截→空白**，必须走 HTTP
2. 无 HTTP 时的降级：抽 HTML 内 `<svg>` + 把全部 `<style>` 内联进 `<defs><style>`，svg 根加 `data-theme="light"`（否则默认深色），存独立 .svg；但独立 svg 无交互
3. 要保留交互：fetch SVG 文本 → **用 Shadow DOM 注入**（`box.attachShadow`）。**关键：SVG 自带完整 `<style>`，直接 innerHTML 内联会污染整页配色（页面秒变深色）**，Shadow DOM 隔离后才正常
4. Shadow 内节点可操作：每个 `<g>` 带 `data-node-id`/`data-node-label`/`data-node-sublabel`（实测 47 处），绑定 click 后 `g.getRootNode().querySelectorAll` 清理高亮
5. 原生的“节点索引”面板与点击聚焦都是 tree/render-tree 自带；原生 `sources`（源码引用）需要 `meta.repository` = GitHub 公开仓库 + 40 位 commit，呈现为外链，**私有项目不可用**

- 图册 demo：`CodeWikiHub/kisearch/requirements/2026-11-20-知识地图图集/demo/verify/atlas-demo/index.html`（6 图 4 分类 + 19 个节点代码快照，点节点出右侧面板；2026-11-20 由 `temp/atlas-demo` 归档到 REQ-20261120-003，原 temp 路径已失效）；规格在 `diagrams/*.json`，片段在 `snippets.json`
- 更新检查 `scripts/check-update.mjs` 只提示不自动装，`--ack <eventKey>` 回执