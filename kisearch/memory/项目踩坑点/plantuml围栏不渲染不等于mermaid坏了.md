---
groupPath: 项目踩坑点
relation: plantuml围栏不渲染不等于mermaid坏了
exportedAt: "2026-11-12T05:07:07.461Z"
---
md 文档里的图显示成源码块、且**没有任何失败提示**时，先看工具条左侧的语言名：ki 的图表链路只认 `language-mermaid`，`plantuml` 围栏在 2026-11-12 之前一律走普通代码块分支，**根本不进图表 effect**，所以连「⚠ 图表渲染失败」标记都不会出现，极易被误报为「mermaid 渲染坏了」。
- 判据: `renderMarkdownHtml` 产物包含 `language-mermaid` 才进图表 effect；plantuml 产物原本只有 `language-plantuml`
- 第二个坑: 即使把围栏改成 mermaid，`@startuml` 源码也解析不了（`mermaid.parse` 报 `No diagram type detected matching given configuration for text: @startuml`），别把「改围栏」当修复
- 第三个坑: 改围栏后用户会以为是新 bug —— 从静默的代码块变成带「⚠ 图表渲染失败」的代码块，两种表现都是源码块
- 现状: 2026-11-12 起 ```plantuml / puml / uml 已在 ki 前端本地渲染（见 决策记录/图表渲染 → PlantUML图表渲染选型）
- 排查入口: `.debug/md-fence-plantuml-not-rendered-20261112/`（含 repro-fence-kind.mjs 与 probe-mermaid-parse.mjs）