---
groupPath: 专题记忆/AI对话链路
relation: 工具图片读取与SVG栅格化实测
exportedAt: "2026-11-23T11:49:32.043Z"
---
2026-11-23 为「MCP 图片可读」（REQ-20261123-008 / 事件 #78）做的实测，结论可直接复用。
- **SVG 栅格化可行**：`@resvg/resvg-js`（native binding，与既有 @zvec/zvec 同类）渲染 1140×540 信息图 → 1568×743 / 150KB / **704 image_tokens**；服务器 Noto CJK 生效，中文渲染正确，模型完整读出 4 阶段 12 课。
- **耗时只跟 SVG 复杂度走**：纯色块 240×120 = 38~46ms；35 个 `<text>` 的信息图 = 2284~2495ms；收窄 `fontDirs`、关系统字体指定字体文件**都无收益** ⇒ `render()` 是同步 CPU 调用，必须放 worker_threads，否则一次取图卡住 daemon 全部并发请求 2.5s。
- **字体 fallback 会改变排版**（B3 端到端发现）：SVG 常声明 `PingFang SC`/微软雅黑，服务器用 Noto 渲染 → 字宽不同，长文本溢出/重叠。实测 `learning-path-overview.svg` 的故事卡第 2–3 行叠印，模型在回答里主动指出了这个“渲染瑕疵”。属**我们的产物**不是原文缺陷；出路是部署机装同名字体或 `fontFiles` 显式指定。
- **resvg 不加载外部资源**：含 `<image href="file:///etc/passwd">` 与相对路径穿越的 SVG，渲染输出与不含 image 版本**字节完全相同**（506/506/506）⇒ 无需额外 resourcesDir 隔离。
- **判别形状的坑**：`ki_lifecycle_list` 返回体已占用 `kind:'wiki'|'temp'|'event'`，新增 `{kind:'images'}` 判别必须 `=== 'images'` 精确比较，宽松判断会把生命周期结果误判成图片、丢正文。
- **真实图像分布**：`consul` scope 1370 张里 1369 张是 SVG、仅 1 张 PNG；引用形态有 `./assets/`、`assets/`、`../assets/`、`images/`、裸文件名，且落点有单层与双层两种（`./assets/x.svg` → `{group}/assets/assets/x.svg`，`./x.png` → `{group}/assets/x.png`）⇒ 归一化必须**原样拼接相对路径，不能取 basename**。
- **worker 入口必须用 .mjs**：项目用 jiti 直跑 TS，但 `new Worker()` 走 Node 原生 ESM 加载器、不认识 .ts；用 `new URL('./x.worker.mjs', import.meta.url)` + `createRequire` 加载 native 模块。
- 复现：`CodeWikiHub/kisearch/requirements/2026-11-23-MCP图片可读/demo/verify/`