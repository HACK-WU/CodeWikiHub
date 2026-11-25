---
groupPath: 错误库/知识治理
relation: REQ-20261123-009 收尾踩坑（skills 双段调用、stage 回执对象插值）
exportedAt: "2026-11-23T12:35:45.869Z"
---
REQ-20261123-009 收尾阶段补充踩坑（2026-11-23）：
- ★ 批量把旧工具名替换成 `ki_event_edit(action=xxx)` 时，原文本里已有 `(action="add")` / `(action="remove")` 这类参数串，会拼成 `ki_event_edit(action=references)(action="remove")` —— **双段调用**，AI 照抄必然调错；同时参数名 `docs:` 没同步改成 `docRefs`。教训：改名后必须 grep `)(action=` 与 `docs: [` 两个模式，并按工具 schema 重写调用示例，不能只替换工具名
- ★ `TransitionOutcome`（`event-service.ts:476-484`）的 `from` / `to` 是 `{key,name,index}`、`affected` 是 `{docs,failed}`。模板字符串直接插值对象会得到 `[object Object]`（真机 hint 显示「已流转：[object Object] → [object Object]」）；必须取 `.name` / `.docs`
- stage 三条路径真机结论：非终态 `affected={docs:0,failed:0}` 且 visibility 随阶段递变（hidden → fts-only → full）；终态 `closed=true` + `terminalAction` 回显，keep 的 hint 是「回到长期保留」、trash 是「已移入回收站（可恢复，但不会自动撤销）」
- 验证 MCP 上传/关联文档时，default 库 `relations-cache.json` 的 `groups` 可能为空（旧格式 `{group}/{relation}/index.json` 已不被识别）—— 要先用 `ki_sync_relation` 建一篇真文档，否则 `members add` 一律 `DOC_NOT_FOUND`