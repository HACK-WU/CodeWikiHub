---
groupPath: 关联关系/AI 对话与追问
relation: AI 对话与外部模块的强耦合
exportedAt: "2026-11-25T08:05:40.734Z"
---
AI 对话与追问域与外部模块的强耦合（2026-11-25 核对，基线 0f1426b）。
- 依赖 MCP 服务：mcp-http-api.ts 单行挂载 handleChatRoutes；ask.ts 用 loadConfig / executeScopeList / listTokens。Token 与 scope 口径改动会直接影响 ki_ask。
- 依赖回想内核：对话工具循环复用只读工具集与 llm-client 类型；find 域预算两侧共享（maxToolCalls / timeoutMs）。改预算必须同时复核对对话与 ki_recall。
- 依赖检索与向量客户端：工具循环调 ki_search / doc 工具取候选。
- 与可视化前端划界：web/src/chat/ 归前端专家，SSE 帧 type 是跨端契约（reasoning/content/usage/sources/error/done/aborted）。
- 位置：src/lib/chat/chat-routes.ts、src/lib/mcp-tools/ask.ts、src/lib/chat/retrieval/tool-loop.ts。