---
groupPath: 专题记忆/AI对话链路
relation: 分析过程面板显示预取的实际检索范围（detail.scopes）
exportedAt: "2026-11-25T07:20:38.565Z"
---
2026-11-25 用户反馈：**AI 分析**的过程面板里，预取卡片没显示实际 scope。

**链路**：`ki_recall` 出参 `scopesUsed` → `analysis-runner` 的 `unwrapRecallPayload` 透传 → `runRecallPrefetch` 把它写进 step 的 `detail.scopes`（数组）→ 前端 `AiProcessPanel` 展开该步骤时由 `StepMetrics` 渲染（新增 LABEL `scopes: '实际检索范围'`，多值用 ` · ` 拼接）。

为什么放 `detail` 而非 `metrics`：`detail` 是「展开明细」的数据源，`metrics` 会被折叠摘要读作数字（如 `docs 4`）。两者在 `AiProcessPanel` 里合并传给 `StepMetrics`，所以加在 detail 即生效。

**真机**（#76 重跑分析）：recall step → `title=「预取知识库（ki_recall）：建议先读 4 篇」`、`detail.scopes=["kisearch-memory"]`、`metrics={docs:4,uncertain:3}`；页面展开即显示「实际检索范围 kisearch-memory」。

⚠️ 注意：前端改动需要重跑 `vite build`（本仓 daemon 直接 serve `web/dist`）；环境有 safe-delete 守卫，用 `npx vite build --emptyOutDir false` 绕过清空目录。

**其他入口**：事件详情「AI 查找」在 `FindRefPanel` 单独一行展示（§0.12）；分析工具级 step 的库名在 `describe` 的 `[库名]` 前缀里（模型传了才显示）。

- 位置: `src/lib/events/analysis-runner.ts`（unwrapRecallPayload / runRecallPrefetch）、`web/src/components/governance/StepMetrics.tsx`（LABEL）