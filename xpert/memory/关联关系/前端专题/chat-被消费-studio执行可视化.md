---
groupPath: 关联关系/前端专题
relation: chat-被消费-studio执行可视化
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：对话域被 Studio 消费（执行可视化与宿主控制）**

- 方向：对话域 → Studio（Studio 是消费方）
- 内容：
  - Studio 的执行可视化消费对话的会话消息/执行记录/反馈（ChatConversationService、ChatMessageFeedbackService 等）
  - Studio 复用 ChatKit 宿主控制 injectHostedAssistantChatkitControl（features/assistant/assistant-chatkit.runtime.ts:247）做预览/工作台
- 契约点：
  - apps/cloud/src/app/features/xpert/studio/services/execution.service.ts 注入对话服务
  - 共享组件：@shared/xpert/execution-log、@shared/xpert/execution-status（双向共用）
- 改动风险：改对话服务的接口签名/消息结构/socket 事件协议，会连带破坏 Studio 的执行面板、状态检查器；改宿主控制函数签名会影响 Studio 预览
- 证据：Studio 专家 C4 与本专家 C4 已双向登记；studio/services/execution.service.ts 的 import