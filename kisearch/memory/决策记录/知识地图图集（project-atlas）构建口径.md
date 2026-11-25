---
groupPath: 决策记录
relation: 知识地图图集（project-atlas）构建口径
exportedAt: "2026-11-25T06:57:50.178Z"
---
用 project-atlas skill 给本仓出「知识地图」图集的落地口径，2026-11-25 全量 8 页完成（94/100 节点可点、单文件 0.91MB、check_atlas 0 错 0 警）。
- 产物：`.atlas/`（目录树模式，>4 页必须）：`site.json` + `nav/<分类>/<页面>.json` + `views/{id}.svg` + `views/{id}.archify.json`（图源）+ `build/`（交付 HTML）+ `dist/atlas.html`（烘焙单文件）；`.gitignore` 内容 `*`。
- 工具：`.atlas/tools/build-view.mjs <id>` 一条命令跑 finalize → 回拷 → 导 SVG；`.atlas/tools/export-svg.mjs` 用系统 Chrome 点「导出 → SVG · 浅色」捕获下载。
- 坑 1：`archify finalize` 输出到 `/tmp` 之外（含 repo 内）一律报 `finalize-receipt-hardlinked (links=2)`，同候选在 `/tmp` 下四闸全绿 → 统一 `/tmp/atlas-build` 暂存后回拷。
- 坑 2：框架把图源注入 shadow root，`document.querySelector('svg')` 与 `body.innerText` 都读不到；走查用 playwright locator 或递归 shadowRoot，抽屉信号 `aside#panel.codepanel.on`，直达图页用 `#<page-id>`（落点是总览列表页）。
- 坑 3：playwright 内置浏览器未下载 → `executablePath: '/usr/bin/google-chrome'`。
- 图种硬约束：sequence 参与者框 96px（sublabel ≤88px 否则报错）、note 每行占 44~66px 要给下条让位；workflow v2 `col` 只能 0~5、lane 是行、同格不能两节点；tree 只需 id/label/parent，目录树用 `layout.direction:"right"`；dataflow `stages` 2~5、`row` 0~4、每条 flow 必须有 label。
- 可读性：画布 ≤1000 宽；实测 1440 缩放 0.93~1.54、375 下 tree 类最好（0.92）。375 有 43~89px 横向溢出，来自「对应代码块」表格符号列（框架 CSS），非图源。
- 位置: `.plans/2026-11-25-project-atlas/{plan.md,checklist.md}`。