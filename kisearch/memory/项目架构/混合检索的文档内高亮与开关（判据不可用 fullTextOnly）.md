---
groupPath: 项目架构
relation: 混合检索的文档内高亮与开关（判据不可用 fullTextOnly）
exportedAt: "2026-10-14T07:02:26.061Z"
---
# 混合检索的文档内高亮与开关（REQ-20261014-003 · **已实施 2026-10-14，未提交**）

## 最终判据（`web/src/lib/searchHighlight.ts::decideDocHighlight`）
| 参数 | 取值 |
| --- | --- |
| `listHighlight`（列表高亮） | `resultMode === 'fulltext' \|\| degraded`（降级 = 全文待遇） |
| `docHighlightQuery`（传给查看器） | 全文恒传；混合（**含降级**）由开关决定（Q2：降级不改变开关语义） |
| `autoScroll`（打开时是否滚动） | **仅全文 true**；混合与降级不滚（用户主动跳转才滚） |
| **`switchDisabled`（开关可用性）** | **`resultMode === 'fulltext'`** —— 未检索与混合都**可用** |

## 关键教训（2026-10-14 用户实测反馈：“当前选择的就是混合检索，怎么关不了？？”）
**❌ 反例**：曾把 `resultMode === null`（未检索）也当“开关不适用”→ 刚进页面/刷新后开关禁用（`aria-disabled=true` + `opacity .5` + `cursor: not-allowed`，点击被 `return` 拦掉），且禁用态 `title` 写死为“全文检索（含降级）…始终开启”，与眼前选中的「混合」模式对不上 ⇒ 用户只能理解为 bug。
**✅ 正确口径**：**持有“用户偏好”的开关不应因“当前尚无结果/暂无作用对象”而禁用** —— 未检索时也必须可点（用户要先设偏好）；只有**语义确实无意义**时（结果是全文、恒高亮）才禁用，且禁用必须配**可见**说明（本项目用 `ki-cell-sub` 小字「全文检索始终高亮」），不得只靠 hover 的 `title`。
**通用句式**：开关禁用 ├ 条件要窄（只禁“真的无意义”）；└ `title`/说明必须与**当前可见状态**一致（不能写死一种情形）。

## 实现（5 文件；未动后端 / MCP 契约）
- 新 `web/src/lib/searchHighlight.ts`（判据纯函数，单测 10 例）+ 新 `web/src/lib/searchPrefs.ts`（`ki.searchDocHighlight`，`'1'`/`'0'`，默认开，**不进 URL**，单测 7 例）
- `web/src/components/ModuleDrawer.tsx`：新 prop **`highlightAutoScroll`**（缺省 `true` = 旧行为）+ `focusDocumentHighlight(..., scroll)` + `autoScrollRef`（挂载取初值；「下一个/上一个命中」与查找输入生效时置 true）；**搭车修复**：复扫（`DOC_HIGHLIGHT_RESCAN_DELAYS=[400,1200]`，`b6ab6a9` 引入）重建 mark 会丢 `--active` ⇒ 复扫后补一次 `focusDocumentHighlight(..., scroll=false)` 重标
- `web/src/pages/SearchPage.tsx`（接判据 + 参数行 `.ki-switch` + 禁用态可见说明）+ `web/src/styles/ki.css`（`.ki-switch--disabled`）

## E2E 注入降级的可复用手法（MCP 走 SSE，Playwright `route` 改不了长连接流）
在 `addInitScript` 里**包装 `window.fetch`**、用 `ReadableStream` 中转并改写 SSE；三个易错点：① SDK 传的是 **`URL` 实例**（无 `.url`）；② SSE payload 是**转义字符串**（`\"results\"`）不能按 `"results"` 匹配；③ 事件**跨 chunk**，须按 `\n\n` 累积完整事件后再改写。只改 `degraded`/`degradedReason` ⇒ 零副作用。

## 验证锚点
`tsc` 0 错；web 单测 **263/263**；`temp/verify-mixed-doc-highlight.cjs` **14/14**；`temp/verify-degraded-doc-highlight.cjs` **6/6**；`temp/repro-doc-highlight-switch-disabled.cjs`（开关禁用复现→翻转）；全文滚动 `scrollTop=189 == computedScrollTarget=189`。

## 已知项
开关切换对**已打开文档**不即时生效（`viewing.highlightQuery` 为打开时快照，符合 N3）；浏览页内联态与 AI 引用预览未实测。