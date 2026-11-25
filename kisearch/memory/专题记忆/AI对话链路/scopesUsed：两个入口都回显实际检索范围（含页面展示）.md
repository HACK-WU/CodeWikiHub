---
groupPath: 专题记忆/AI对话链路
relation: scopesUsed：两个入口都回显实际检索范围（含页面展示）
exportedAt: "2026-11-25T07:13:23.372Z"
---
2026-11-25 用户要求：`ki_recall` 返回体要有「实际使用了的 scope」，**AI 查找页面也要显示**。

**数据流**：内核 `runGroundedRecall` 从每次工具结果的 `scopeUsed` 汇总为 `scopesUsed`（并集，含视图名）→
- 预取：`RecallToolOk.scopesUsed` + `recallLog.scopes`；
- 查找：`DeepFindResult.scopesUsed` → `DeepFindSearchResult`（`RefSearchResult.scopesUsed`）→ 前端 `RefSearchResultDto.scopesUsed`。

**页面展示**：`web/src/components/governance/FindRefPanel.tsx` 在结果区顶部新增一行——「实际检索范围：A、B」；当出现过 `targets` 之外的范围时追加「（默认是 X，AI 按问题自行扩大）」。空态也显示（便于排障：查了哪些库还是 0 命中）。

⚠️ 与 `targets` 的区别：`targets` 是**默认**范围（调用方传入），`scopesUsed` 是**实际**查过的库——两者不一致即说明模型自主换库。

**真机**（daemon 已重启）：
- `refs/search`：`targets=["kisearch-memory"]`、`scopesUsed=["kisearch-memory"]`、38.1s；
- `ki_recall`：`targets=["kisearch-memory"]` 而 **`scopesUsed=["kisearch-memory","kisearch-xperts"]`**（34.3s、rounds=8、2 候选）—— 模型自己跑去 `kisearch-xperts` 查了，证明自选真正生效且被如实记录。

**测试**：`find-scope-switch` 2 例加断言（开启时候选保留且 `scopesUsed=['kisearch']`；未开启时候选被剔除但 `scopesUsed` 仍如实记录）；`find-runner` 20/20；两端 tsc 均无新增错误。

- 位置: `src/lib/recall/run-recall.ts`（scopesUsed 汇总）、`src/lib/mcp-tools/recall.ts`、`src/lib/events/deep-find-core.ts`、`src/lib/events/find-service.ts`、`src/lib/events/refs-service.ts`、`web/src/components/governance/FindRefPanel.tsx`、`web/src/api/governanceContract.ts`