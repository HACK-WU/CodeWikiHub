---
groupPath: 接口信息/事件治理
relation: 治理路由与事件 MCP 工具
exportedAt: "2026-11-25T08:06:24.395Z"
---
事件治理域对外接口清单（基线 0f1426b）。
- HTTP：/api/governance/events（GET|POST）、/events/running、/events/:id（GET|PATCH|DELETE）；/analysis 系列（analyze / cancel / confirm / ask / ask/stream / ask/cancel）；/stage、/reopen、/pin、/members、/refs、/refs/upload；/event-types、/lifecycle/*；/governance/trash/*。
- MCP 工具：ki_event_list、ki_event_type_list、ki_event_get、ki_event_create、ki_event_delete、ki_event_edit（action 互斥六选一）。旧名 ki_event_docs / ki_event_refs / ki_event_set_stage 已下线不保留别名。
- 错误码例子：EVENT_NOT_FOUND 1101/404、REVISION_CONFLICT 1114/409、FIND_TIMEOUT 1426/504、ANALYSIS_ASK_CANCELED 1627/499。
- 位置：src/lib/governance-http.ts、src/lib/governance-errors.ts、src/lib/mcp-tools/event-edit.ts。