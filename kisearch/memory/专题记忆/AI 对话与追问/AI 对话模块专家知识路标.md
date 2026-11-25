---
groupPath: 专题记忆/AI 对话与追问
relation: AI 对话模块专家知识路标
exportedAt: "2026-11-25T08:05:19.224Z"
---
AI 对话与追问域的专家资产路标（2026-11-25 新建，基线 0f1426b）。
- 资产路径：.module-experts/AI 对话与追问专家/（含 2 个子专家：会话与追问 / 工具循环与技能）。
- 一句话职责：提供 Web 端 SSE 流式对话、ki_ask 单库问答与追问停止/接续，以及提示词配置与工具循环。
- 核心能力：handleChatRoutes / writeSseStream / runAsk / runToolLoop / readPromptConfig / getChatTool。
- 高频坑：ki_ask 只吃单库；rounds 是工具调用次数不是模型往返轮数；生效超时是 min(find.timeoutMs, recall.hardTimeoutMs)。
- 关键代码位置：src/lib/chat/chat-routes.ts、src/lib/chat/ask/ask-runner.ts、src/lib/chat/retrieval/tool-loop.ts、src/lib/mcp-tools/ask.ts。
- 数据落地：{chatDir}/{scope}/{id}.json、prompt-config.json、ka-*.json；askLog 只写 stderr 单行 JSON。
- 检索触发词：SSE、ki_ask、追问停止、续接、prompt-config、ASK_BUSY、ANALYSIS_ASK_CANCELED。
- 详细资产：见 .module-experts/AI 对话与追问专家/，契约层 C0~C5 + implementation/01~07。