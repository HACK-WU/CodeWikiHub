---
groupPath: 接口信息/AI 对话与追问
relation: 对话路由与 ki_ask
exportedAt: "2026-11-25T08:06:24.396Z"
---
AI 对话域对外接口清单（基线 0f1426b）。
- HTTP：/api/chat/config、/config/ack、/prompt-config（GET|PUT）、/agent-asks、/conversations（GET|POST 及 :id 的 GET|PATCH|DELETE）、/archive、/compact。
- SSE：POST /conversations/:id/messages、/regenerate、PATCH /messages/:msgId；帧 type 为 reasoning/content/usage/sources/error/done/aborted，不使用 SSE event: 字段。
- MCP 工具：ki_ask，入参 scope（单库）/ question / background? / context_id?；错误 ASK_* 七码。
- 追问端点：POST /analysis/ask、/ask/stream、/ask/cancel。
- 位置：src/lib/chat/chat-routes.ts、src/lib/mcp-tools/ask.ts、src/lib/governance-http.ts。