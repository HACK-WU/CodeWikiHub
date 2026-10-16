---
groupPath: 关联关系/前端专题
relation: project-项目选择-对话门面
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：项目选择语义被对话域门面消费**

- 方向：项目协作 → 对话域（对话是消费方）
- 内容：ProjectSelection 类型与项目选择流程被 WorkbenchChatFacade 消费：chatkitProjectSelection（初始草稿意图）、chatkitMountProjectId（初始挂载）、onChatProjectChange?（切换回调）、syncConversationProject（持久化刷新）
- 契约点：features/chat/workbench-chat/workbench-chat.facade.ts 的字段注释（群组/项目双阶段语义）；项目侧 XpertProjectFacade / project-entry
- 改动风险：改项目选择语义/类型（ProjectSelection）会影响对话域 ChatKit 挂载与项目隔离逻辑；反之对话域改项目字段语义需回归项目页
- 证据：对话专家 C5 决策 2 与 C1 §1（已双向登记）；项目专家 C1 附录