---
groupPath: 错误库/Web前端界面
relation: AI查找的判断不了的点收起后丢失（落盘漏传uncertainties）
exportedAt: "2026-11-19T02:48:28.914Z"
---
AI 查找面板里能看到「判断不了的点 · N」，收起后只剩「查找总结」一句话——前端落盘只传了 summary，收起态又只渲染 summary，两处同时缺字段，看起来像模型这次没输出。
- 根因: `saveFindSummary(scope, eventId, summary)` 第 4 参 uncertainties 未传；`onSummary` / `onAdded` 回调签名只带 summary；`EventsPage` 的 findSummary state 存的是 `string` 而非 `{summary, uncertainties?}`
- 判据: 面板里有的信息收起态没有 → 先看落盘请求体有没有该字段，再看收起态渲染，别只盯 UI
- 解法: 回调签名加 uncertainties → state 改 record → 收起态复用 `.gov-ai-final__uncertain*` 样式渲染；历史落盘无该字段自然降级（要补只能重新查找一次）
- 验证: web `tsc` 0 / `vite build` ✓ / 1312 测试全绿