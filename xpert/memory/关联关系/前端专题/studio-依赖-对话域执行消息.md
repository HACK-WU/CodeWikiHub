---
groupPath: 关联关系/前端专题
relation: studio-依赖-对话域执行消息
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：Xpert Studio 依赖对话域的执行消息流**

- 方向：对话域 → Studio（Studio 是消费方）
- 内容：Studio 的执行可视化（XpertExecutionService）消费对话/执行数据——会话消息（ChatConversationService / IChatConversation）、执行记录（IXpertAgentExecution）、上下文用量（TThreadContextUsageEvent）、消息反馈（ChatMessageFeedbackService）
- 契约点：
  - apps/cloud/src/app/features/xpert/studio/services/execution.service.ts 注入 ChatConversationService / ChatMessageFeedbackService
  - 共享组件：@shared/xpert/execution-log、@shared/xpert/execution-status（studio 与对话域共用）
  - SSE 事件消费：processEvents（预览面板）
- 改动风险：对话域若改会话消息结构 / SSE 事件协议 / 反馈接口，Studio 的执行面板、节点状态、检查器会连带受影响
- 证据：studio/services/execution.service.ts（imports）、frame 构建对话前端专家时需在 C4/强关联双向登记