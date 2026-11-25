---
groupPath: 项目踩坑点
relation: 事件字段透出：HTTP 详情给原形、MCP 详情走白名单
exportedAt: "2026-11-24T08:40:40.040Z"
---
给事件新增任何字段（如 expectedEffect）时，「详情能不能拿到」必须分两条通道判断，混为一谈会漏改或白改。

- HTTP `GET /governance/events/:id`：走 `loadEventDetail`，`RawEventDetail.event` 是 `EventRecord` **原形**，加字段自动透出，零改动。前端详情页走的正是这条。
- MCP `ki_event_get`：走 `getEventDetail`，event 块是 `EventDetailEventDto` 的**逐字段白名单**（`event-detail.ts` 约 283-294 行），不显式写进去就拿不到。
- 列表同样分两条：HTTP 列表走 `toEventListView`（逐字段显式列出，`test/governance-contract-live.test.ts` 有「EventRecord 字段必须全进列表响应」守卫，漏加必红）；MCP `ki_event_list` 在 `event-list.ts` 自建返回形状，与前者零耦合，可以独立选择不支持某字段。
- 前端最阴的陷阱：`EventsPage.tsx` 的 `active` 优先取列表项（`events.find(id) ?? detail?.event`），所以 HTTP 列表 DTO 漏加字段的表现是「保存成功但界面不更新」，而抓接口看详情偏偏有值，极易误判为前端 bug。
- 位置: `src/lib/events/event-detail.ts`、`src/lib/events/event-view.ts`、`src/lib/mcp-tools/event-list.ts`、`web/src/pages/EventsPage.tsx`
- 被推翻的旧判断: 曾判「详情 DTO 漏加 → 前端 fallback 显示空」，实际 HTTP 详情给的是原形，该结论错误；真正的漏点是 MCP `ki_event_get`。
- 关联: 与「分析产物在契约里有两套 DTO 新增字段必须都加」「事件分析产物有 4 个写入口」同一族的漏加风险，但对象是事件本体而非分析产物。