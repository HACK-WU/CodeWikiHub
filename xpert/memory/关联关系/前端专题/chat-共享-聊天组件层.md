---
groupPath: 关联关系/前端专题
relation: chat-共享-聊天组件层
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：对话域共享件 @shared/chat 与渲染组件的跨域使用**

- 方向：对话域 ↔ 共享层（双向）
- 内容：
  - @shared/chat/*（composer/preview/attachments/tool-call-chunk/context/task-dialog/follow-ups 等）是对话域页面与 Studio 预览共用的聊天组件层
  - @shared/chat/filter-latest-messages 是消息去重合并的关键正确性依赖（对话页与 Studio 预览共用）
  - @shared/xpert/execution-log、execution-status 由对话域与 Studio 域共同消费
- 改动风险：改这些共享组件的 props/服务签名，需同时回归对话页与 Studio 预览/检查器；改 filter-latest-messages 的去重语义会造成两域消息重复/丢失
- 证据：@shared/chat 目录结构与两域 import（.fe-index/xpert-cloud 依赖列）