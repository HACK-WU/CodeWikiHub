---
groupPath: 决策记录/知识治理
relation: AI查找生产接线（端点拆分+一次回填+去重口径）
exportedAt: "2026-11-15T12:56:29.766Z"
---
2026-11-15 二轮修订（用户实机走查后）。首版把 demo 的 skill/MCP 调用行**删掉了**，理由是「demo 的 4 次调用属演示态」；用户随即指出①与 demo 不一致②怀疑没真检索。核实结论：②是真检索，但首版确有一个**真缺陷**（谎报 mode）。

## 三条定稿
1. **调用行：出，但只标真调了东西的**，并**直接复用 AI 对话的工具行类**（`ki.css` 的 `.ki-chat-tl__node--tool` / `__skill` / `__act` / `__tool` / `__stat`），站内调用行只有一种长相；不新造 `.gov-ai-call*`。`steps[].calls` 由服务层按真实执行填充，表头计数按 calls 累加（`5 步 · N 次调用`）。
   - 现状：只有 ③ search 有调用（`tool ki_search`，走 executeSearch）；①②④⑤ 是本地读/纯函数，**不得**补 `event-context` / `relevance-rank` 这类不存在的 skill（demo 里那两个是虚构的）。
2. **`mode` / `degraded` 必须如实透出**（原缺陷）：首版 `metrics.mode` 写死 `'hybrid'` —— 一旦 embedding 不可用、`executeSearch` 降级为全文，面板仍显示 hybrid 就是骗人。现由适配器透出 `mode/degraded/degradedReason`，服务层记进 metrics+detail+结果体，面板在 fulltext 时显式黄条提示「语义不可用，已降级为全文」。
3. **分数解释**：归一化口径不变（批次内 min-max，最高恒 1.00 / 最低恒 0.00），弹窗底部加一行说明，避免被读成绝对相似度。

## 取证（scope `default`，5 篇文档，只读）
事件 #6 → 端到端 766ms，mode=hybrid、degraded=false，search 步 761ms、hits 5/docs 5，calls=[ki_search 761ms]。**「快」的根因是该 scope 只有 5 篇文档**，不是没检；此前无法自证，正是因为 mode/query 没暴露。

## 契约变化
`RefSearchCallDto`(kind/name/label/ms/note) 进 `RefSearchStepDto.calls`；`RefSearchResultDto` + `mode`/`degraded`/`degradedReason`。双侧同步，parity 测试绿。

## 教训
（可复用）**「显示真实数字」不只指耗时**：模式、降级、调用名同样属于数字口径。写死常量（`mode:'hybrid'`）在正常路径永远看不出问题，只在降级时才说谎——这类"只在异常分支才暴露的谎报"要专门构造用例。

**验证**：`refs-sr05-search` 16 例（含 calls/mode 透出 2 例）、`refs-sr05` 11、`governance-refs-route` 3、`governance-contract` 24、`governance-routes` 14、`capability-coverage` 4 全绿；`web tsc` + `vite build` 通过。