---
groupPath: 决策记录/知识治理
relation: 事件详情读取收敛为两层（store.mustFindEvent + loadEventDetail）
exportedAt: "2026-11-18T07:21:18.371Z"
---
事件详情原先有三处读法（MCP get / HTTP 详情路由内联 / 前端二次请求 listRefs），字段与裁剪口径会分叉。2026-11-18 收敛为两层：
- **查找层**：`store.ts::mustFindEvent` —— 唯一实现，找不到抛 `EVENT_NOT_FOUND` 并带 `available`（前 5 条未收口事件）。`event-service` / `members` / `refs-service` / `event-detail` 四处全部 import 它。为什么放 store：`event-service` 已 import `members`，实现放任一业务层都会成环；store 只依赖 fs 与 types。
- **读取层**：`event-detail.ts::loadEventDetail(scope, ref, { resolveRefs, now })` —— 返回原始数据（event 原形 / type / stage / members / refs / refsTotal / logs / 已归一 analysis）。MCP 与 HTTP 共用，各自加工：MCP `ki_event_get` 裁剪 + 精简 draft（去 steps/candidates/liveThinking）；HTTP `GET /governance/events/:id` 保持旧 DTO（event 原形、完整 draft 含 candidates/steps、logs 带 eventId），前端零改动。
- `resolveRefs: false` 用于 `refs_limit=0`：跳过逐条解析可见性，条数改由 `readRefs` 取。
- 为什么 HTTP 不直接用 MCP 的 view：MCP 删了 candidates/steps，而前端 `EventAnalysisDto` 依赖它们，直接复用会白屏。
- 验证：`mcp-event-get` 6/6、`mcp-event-tools` 11/11、`governance-routes` 14/14、`event-members` 9/9、`governance-refs-route` 3/3；根 tsc 仍 7 条既有错误、无新增。台账 `.plans/2026-11-18-event-detail-unify/`。