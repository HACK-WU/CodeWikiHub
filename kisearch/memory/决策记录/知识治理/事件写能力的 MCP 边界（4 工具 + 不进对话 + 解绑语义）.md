---
groupPath: 决策记录/知识治理
relation: 事件写能力的 MCP 边界（4 工具 + 不进对话 + 解绑语义）
exportedAt: "2026-11-16T07:42:34.378Z"
---
对外暴露事件写能力时定下的四条边界，用于回答「为什么 AI 能建事件但不能在对话里建」「为什么没有单独的 add/remove 工具」。

- **4 个工具**：`ki_event_create`（可带 docs/refs）、`ki_event_delete`、`ki_event_docs`（action=add|remove）、`ki_event_refs`（action=add|remove）。备选被否：3 个聚合（docs+refs 合一的 kind 枚举）——关联改档位、参考纯引用，语义不同合一会提高误选率；6 个细粒度——工具描述总量增长约 40% 且每次会话都进上下文。
- **不进 AI 对话工具面**（不登记 `CHAT_MCP_TOOLS` / `MCP_TOOL_GROUPS`）：对话里一次误判即可批量改文档档位（hidden 后立刻搜不到），且对话难以要求二次确认。只走 `/mcp`。
- **删除事件必须带 `doc_action`**（wiki|trash，无默认）+ 事件须已收口：防止顺手删事件把文档一起丢了。
- **移除关联文档 = 解绑回 wiki**，不是删文档：用户点「移除」是解绑意图；删数据走回收站页，避免两个入口语义重叠。

- 位置: `src/lib/mcp-tools/event-*.ts`、`src/lib/events/members.ts`（设计见 CodeWikiHub/kisearch/requirements/2026-11-16-事件文档入口与事件MCP工具/）
- 状态: 2026-11-16 设计定稿，未实施