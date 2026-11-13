---
groupPath: 决策记录/图表渲染
relation: ECharts图表渲染选型
exportedAt: "2026-11-12T06:32:37.912Z"
---
文档里的 ```echarts 围栏（内容为 option JSON）在 ki 前端本地渲染，与 PlantUML 共用「图表 / 代码」双面板（`data-ki-diagram="echarts"`）；选 `echarts@6.1.0` 的**静态 SVG 快照**而非活实例。
- 为何静态: 文档场景要「能看/能打印/随主题重绘」；活实例要管 dispose / resize / 切面板，且 tooltip 的 `formatter` `extraCssText` 是把字符串写进 innerHTML 与 style。代价：**无 hover tooltip**（tooltip 字段被忽略、不报错）
- 加载: Vite `?url` 引 `echarts/dist/echarts.min.js`（1.1MB / gzip 360KB，UMD → 插 classic script 取 globalThis.echarts），不进主包
- ★ 真机两个坑（都已修，别退回去）: ① zrender 给根 svg 加了 `style="position:absolute;left:0;top:0"`，原样注入会脱流并盖住工具条（实测「代码」标签点不到、容器高塌成 24px）；② 产物只有 width/height 720×420 **没有 viewBox**，`max-width:100%` 只裁切不等比缩放。修法 `normalizeEchartsSvg()`：剥 style、删固定宽高、补 `viewBox="0 0 720 420"`
- 清洗: `sanitizeEchartsOption()` 强制 `animation:false`（否则截到动画中间帧、产物不确定）并剥 `tooltip.extraCssText` 与含标签的 formatter
- 失败口径五档: json（写错）/ blank（合法但没图元）/ unavailable / insecure / failed，全部退回纯代码块 + ⚠ 标记；JSON 错与渲染错分开讲
- 落点: `web/src/lib/echarts.ts`、`MarkdownPreview.tsx`（`diagramBlockHtml` / `failDiagramBlock` / 统一渲染 effect）、`ki.css` 的 `.ki-diagram__*`
- 验证: 首渲染 55ms / 二次 5ms / SVG 2.4KB；web 单测 1106/1106；真链（生产构建 + 真实 daemon）echarts + plantuml 同页均出图、tab 可点、坏 JSON 走兜底
- 能力边界: JSON 里不能写函数（`formatter: (p)=>…` 无效）；依赖外部资源的图（map 的 geoJSON、图片 URL）不可用