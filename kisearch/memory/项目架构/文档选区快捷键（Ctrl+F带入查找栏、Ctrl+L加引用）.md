---
groupPath: 项目架构
relation: 文档选区快捷键（Ctrl+F带入查找栏、Ctrl+L加引用）
exportedAt: "2026-10-15T10:08:32.859Z"
---
【项目架构｜文档选区快捷键（Ctrl+F 带入查找栏、Ctrl+L 加入引用）】2026-10-15 实施完成（REQ-20261015-004，**未提交**；需求报告 CodeWikiHub/kisearch/requirements/2026-10-15-文档选区快捷键/requirement.md（含 §9 增量）；台账 .plans/2026-10-15-doc-selection-shortcuts/）

## 交互契约
- 文档查看器里**选中正文**后：`Ctrl+F` 或**点工具条放大镜** → 所选带入**文档内查找栏**并立即查找（文本全选，可直接覆盖输入）；`Ctrl+L` → 所选加入 AI 引用（面板未开则**自动打开**）。
- **条件式拦截**：只有"选区落 `.ki-drawer` 且有 data-ki-doc-name"时 Ctrl+L 才 preventDefault；空选区 / 非正文选区一律放行浏览器（prevented=false 已实测）。Ctrl+F 保持既有三档判定链（有抽屉 → 文档内查找栏；无抽屉有 search-input → 聚焦；都无 → 不拦截）。
- 取词口径 pickFindSeed（web/src/lib/docFind.ts）：首行 → 首个空白块 → 去**首尾**标点（内部 config.yaml 的点保留）→ **≤40 字（码点计）**；无选区时**不替换**已有查找词。
- Ctrl+L 加入后**不清选区**（与划选路径的 removeAllRanges 故意不同）：用户可接着 Ctrl+F 用同一段。

## 实现要点（6 文件）
- DocFindOpenDetail：DOC_FIND_OPEN_EVENT 从"不带 payload"升级为可带 {query}（docFind.ts）—— 查找栏是受控 input，**已展开时无法从外部赋值**，必须走事件通道；无 query 时行为不变（预填 highlightQuery）。
- ModuleDrawer.applyFindSeed()：写 draft/applied + **恢复高亮开关** + findSeedSeq 递增触发聚焦 effect；置 findSeededRef 防被 highlightQuery 覆盖。**放大镜入口**：选区在 **onMouseDown** 抓（click 时正文已失焦、DOM 选区已被清）→ openFindBar 用 captured seed 调 applyFindSeed。
- chat/refSelection.ts（新增，**单一来源**）：drawerOfSelection / buildRefCandidate / checkRefAdd → 条数(5) → 单条截断(2000) → 合计(6000) → 重复；返回 {ok:true,ref,message} | {ok:false,reason,message}。**三条入口共用**：划选 mouseup、Ctrl+L、handleAddRef（选择器，保持其"条数/重复静默、合计超限提示"的既有行为）。
- ChatPanel 的 Ctrl+L 监听：(ctrl||meta) && key∈{l,L}、排除 shift/alt/repeat；**多实例门控** if (!isPage && isChatRoute) return;；面板未开时 store.dispatch({type:'setOpen',open:true})（开合真相是 store，URL chat=1 由 AppShell 镜像）。
- 「+ 加入引用」**hover 说明卡**（2026-10-15 增量，用户口径：原生 title 不够精致）：`.ki-chat-refbar__addwrap` + `.ki-chat-refbar__pop`，复用「来源文档」chip 的 `.ki-chat-src__pop` 视觉（白底描边/圆角/shadow-2/opacity+translateY 过渡）；**hover 挂包装元素**（按钮 disabled 时不派发鼠标事件，挂按钮上会连"已达上限"说明一起消失）；定位基准是 `.ki-chat-composer`（与 `.ki-chat-refbar__toast` 同坐标，不随按钮位置漂移）；说明用 `<span className="ki-chat-refbar__pop-note">` 而非 `<q>`（`<q>` 自带引号，来源卡片里它是"摘要原文"语义）；原 title 移除 → aria-label。

## ★ Ctrl+L 可拦截（Chromium 源码证据，复用价值高）
chrome/browser/ui/accelerator_table.cc:347-370 的 kReservedCommandIds[] **只有** CLOSE_TAB/WINDOW、NEW_TAB/WINDOW/INCOGNITO/ISOLATED、RESTORE_TAB、SELECT_NEXT/PREV_TAB、CYCLE_TO_NEXT/PREV_TAB、EXIT（Android 另有 F6/Shift+F6）⇒ IDC_FOCUS_LOCATION（Ctrl+L，同文件 :68）**不在保留清单**，非保留键 = 渲染器先收事件、preventDefault 后浏览器不聚焦地址栏。同表 Ctrl+F（IDC_FIND）同类且本项目早已抢占生效。browser_command_controller.cc:487-545 的 IsReservedCommandOrKey 只额外特判：App 模式不保留任何键 / 全屏除 FULLSCREEN+EXIT 全交网页 / Linux 用户自定义编辑热键不保留。地址栏兜底仍在：Alt+D（同表 :140）同命令。**未验证 Firefox/Safari**。

## 验证锚点
web/test/doc-find.test.mjs 33/33、web/test/ref-selection.test.mjs 11/11、web 全量 307/307、tsc 0 错、npm run build exit=0；temp/verify-doc-selection-shortcuts.cjs **30/30**（A Ctrl+F 带入/换词/无选区不替换 · B 引用+去重 · C 面板关→自动开+URL chat=1 · D 放行断言 · E 相邻回归 · **F 增量：F1 放大镜代入+查找 / F2 聚焦全选 / F3 无选区不误填 / F4 hover 卡含 Ctrl+L / F5 上限信息**）；temp/probe-ctrl-l-scope.cjs（Ctrl+L 作用域三态：输入框无选区放行 / 点输入框清选区放行 / 程序化聚焦保留选区则拦截）；既有 verify-doc-inner-search 48/48、probe-doc-inner-search{,2}、repro-cancel-then-find EXIT=0。截图 temp/shots/doc-sel-{ctrl-f,ctrl-l,ctrl-l-autoopen,ref-hover-card}.png。
纯前端改动 ⇒ `npm run build` 后刷新即生效，不需重启 daemon。

## 已知边界
中文长句无空白可切 ⇒ pickFindSeed 取整句（≤40 字），由 buildFindTerms 的 2–4 字滑窗兜底；死键场景（AppShell 判"存在 .ki-drawer"、查看器才判"可见"）未修；Firefox/Safari 未验证；/chat 页双实例为静态判定（未实测）。