---
groupPath: 项目架构
relation: 文档查看器文档内搜索能力边界与Ctrl+F判定缺陷
exportedAt: "2026-10-14T04:20:11.718Z"
---
# 文档查看器（ModuleDrawer）文档内搜索能力边界 + Ctrl+F 三形态分裂

2026-10-14 需求分析结论（REQ-20261014-002，**未实施**）。证据 = 代码直读 + Playwright 只读探针（7423）+ git 历史。

## 一、已有能力（可复用，勿重造）
- **高亮内核**：`applyDocumentHighlights` / `clearDocumentHighlights` / `focusDocumentHighlight` @ `web/src/components/ModuleDrawer.tsx:86-148`；计数 state `highlightEnabled/highlightCount/highlightIndex`（L288-290）；导航条 UI L839-859（**只有「取消高亮 / 下一个命中」，无「上一个」、无输入框、无快捷键**）；样式 `.ki-doc-highlight`（ki.css:1893-1903）、`.ki-drawer__highlight`（ki.css:1295-1326）。
- **匹配算法**（L79-84 / L115-135）：多词 OR、`i` flag、**逐文本节点匹配、不跨节点** ⇒ 被 `<strong>/<code>` 拆开的关键词搜不到（浏览器原生查找能搜到）；**命中无上限**；词表侧仅剔除「≤2 字且全文出现 >6 次」的词（`web/src/lib/searchText.tsx:81-85`）。
- **触发方式**：只能由外部 prop `highlightQuery` 一次性开启（L288 / L337-341）—— 消费方共 20 处：BrowsePage(806/842/567/941)、SearchPage(698/242/768)、ChatPanel(1192/1961) 等；既有契约「**不新建高亮机制**」见 `SourcesList.tsx:6`、`ChatPanel.tsx:138`。
- **三形态同一组件**：内联阅读（BrowsePage `renderViewer(asDrawer)`）、全屏（受控 `fullscreen`）、语义检索抽屉（SearchPage）、AI 引用预览（ChatPanel）⇒ **改一处即全覆盖**。
- **全屏切换会重建 `.ki-drawer__body`**：滚动位置靠 `savedScrollRef` + `useLayoutEffect`(L674-680)，高亮靠依赖 `fullscreen` 的 rAF effect 重建（L458-479）⇒ 新搜索态必须放组件 state 才能存活。
- **滚动容器** `.ki-drawer__body`（L694-698）；工具条 `.ki-drawer__actions`（L824-891）；`.ki-drawer__head` **无 flex-wrap**（ki.css:1185-1194）⇒ 窄屏塞输入框会挤压其它按钮；`fullscreenToolbar`（L229-230 / L821-823）是**全仓无调用方的空位**（位于头部中央），可直接用。

## 二、坑：Ctrl+F 判定在「内联全屏」失效（已实测确认）
`web/src/layouts/AppShell.tsx:320-337`：判据 `document.querySelector('.ki-drawer:not(.ki-drawer--inline)')` 存在即 return（让位浏览器原生查找），否则 preventDefault 并聚焦 `[data-ki-search-input]`。
但内联阅读进入全屏后，元素**同时带** `.ki-drawer--inline` 与 `.ki-drawer--fullscreen`（ki.css:1174-1182）⇒ `:not(.ki-drawer--inline)` 匹配不到 ⇒ **全屏阅读时 Ctrl+F 仍被抢到「搜索全库文档」框**（搜索范围是全库，且结果会替换主区把文档顶掉），与同段 L322 注释「覆盖层抽屉打开时保留浏览器默认查找」意图相悖。
实测三形态（Playwright，7423）：内联 `prevented=true` → 聚焦全库框；**内联全屏 `prevented=true` → 同样聚焦全库框**；纯抽屉（SearchPage）`prevented=false` → 浏览器原生查找（搜整页含大纲/按钮等 UI 文本）。
`git log -S` 证据：该判据与 `.ki-drawer--inline.ki-drawer--fullscreen` 组合**同属提交 `ab1e3ec`（2026-10-02）** ⇒ 同一次改动漏同步，可排除「注释过期/后来改主意」。

## 三、待核查（未定位根因）
实测「/search?q=kubectl&mode=fulltext → 点结果打开文档」：高亮条显示 `1/200`，但 `document.querySelectorAll('.ki-doc-highlight').length` = **196** ⇒ 计数与实际可导航命中数可能不一致（排查方向：排除容器 / mark 嵌套 / 重复 apply）。

## 四、本需求给出的判定链（待用户确认）
① 文档查看器可见（含内联/全屏/抽屉）→ 文档内搜索；② 无查看器但有 `[data-ki-search-input]` → 聚焦应用内搜索框（现状）；③ 两者都无 → 浏览器原生查找。

## 五、证据与产物
- 需求报告：`CodeWikiHub/kisearch/requirements/2026-10-14-文档内搜索与命中导航/requirement.md`（v2：12 条需求 + 负向 8 条 + 影响面 10 行 + 三档判定链 + 整体成功判据 J1-J5）
- 质疑报告：同目录 `review/challenge-report.md`（2🔴+5🟡）
- 探针：`temp/probe-doc-inner-search.cjs`（A 内联 / B 全屏）、`temp/probe-doc-inner-search2.cjs`（C 抽屉 + 高亮链路）