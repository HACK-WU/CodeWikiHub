---
groupPath: 数据流/AI 对话与追问
relation: chat 域数据实体与落点
exportedAt: "2026-11-25T08:06:49.680Z"
---
AI 对话域的数据实体流向（基线 0f1426b）。
- {id}.json：生产方 createConversation，落 {chatDir}/{scope}/，消费方为会话列表与详情，用途是存会话与消息。
- prompt-config.json：生产方 readPromptConfig 对应的写接口，落 {chatDir}/，消费方为工具循环与预算，用途是存 find / recall / chat 三段配置。
- ka-*.json：生产方 runAsk，与 c-*.json 同目录靠前缀隔离，用途是存 ki_ask 短会话。
- askLog：生产方 ask-log.ts，不落文件，写 stderr 单行 JSON，用途是运维排查且绝不打印正文。
- 详细流向：见 .module-experts/AI 对话与追问专家/C4-数据流向与消费.md。