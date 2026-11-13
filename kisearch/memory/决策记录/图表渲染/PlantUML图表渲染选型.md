---
groupPath: 决策记录/图表渲染
relation: PlantUML图表渲染选型
exportedAt: "2026-11-12T05:06:54.161Z"
---
文档里的 PlantUML 围栏（```plantuml / puml / uml）在 ki 前端本地渲染，选 `@plantuml/core`（官方 PlantUML 的 TeaVM 编译版）而非本地 jar 或远端 kroki；渲染结果带「图表 / 代码」双面板。
- 备选与淘汰理由: 本地 jar 需 JRE（本机 java not found）且每次起进程；远端 kroki / plantuml server 要外发文档源码（内含内网架构与故障细节）
- 实测（Playwright + chromium headless）: 时序图首次 240ms、暗色重绘 24ms；`!include http(s)` 被引擎拒绝、外部请求 0 个；标签内 <script> 被转义，注入面为零
- 加载: Vite `?url` 引 plantuml.js(3.1MB) + viz-global.js(1.4MB)，运行时先插 classic script（viz-global 是 UMD，要挂 globalThis.Viz）再动态 import；不进主包（dist 主 chunk grep 引擎关键字 = 0，资源独立为 assets/plantuml-*.js）
- 落点: `web/src/lib/plantuml.ts`（懒加载 / 守卫 / 兜底文案）、`web/src/components/MarkdownPreview.tsx`（renderer.code 分支 + 渲染 effect + 复制固定取代码面板）、`web/src/styles/ki.css` 的 `.ki-plantuml__*`
- 守卫: `isSafePlantumlSvg` 只扫标签片段（正文里出现 onclick= 字样不算攻击）；`classifyPlantumlSvg` 识别引擎画进图里的 Syntax Error? / Empty description / cannot include 三种错误图
- 失败口径: 退回「纯代码块」——标签组换回语言名、图表面板隐藏、代码面板显示、工具条标 ⚠ PlantUML …（与 mermaid 的兜底标记共用 markBlockFallback）
- 验证: web 单测 1092/1092（新增 11 条）、tsc 0、npm run build ✓、真机 17/17（图表/代码切换、复制两态一致、←/→、语法错误兜底、mermaid 不受影响、暗色重绘）
- 未做: mermaid 不加「图表 / 代码」切换（用户 2026-11-12 拍板本次不动）