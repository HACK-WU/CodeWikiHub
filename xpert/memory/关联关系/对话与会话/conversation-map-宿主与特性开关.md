---
groupPath: 关联关系/对话与会话
relation: conversation-map-宿主与特性开关
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 脉络地图（只读视图）与宿主 view-extension 与特性开关
强度：必改——改 provider key（`platform.conversation-map`）、slot（`AGENT_WORKBENCH_SLOT`）、key（`topics`）或 `scope()` 的三重比对 → 宿主（Studio/工作台）渲染与越权防护必改；改宿主 host context 结构 → 地图作用域判定必改
原因：地图**无 entity、无表**，完全依赖宿主 view-extension 发现机制与 host context；宿主/槽位一变地图静默消失，而 scope 判定是防越权视图的关键点

地图端：
- ConversationMapViewProvider（@ViewExtensionProvider）@ packages/server-ai/src/chat-conversation/conversation-map/provider.ts
- ConversationMapService.read/projectOptions/act/scope @ packages/server-ai/src/chat-conversation/conversation-map/service.ts
- presentation.ts（turnNodes/humanMessageSummary）@ packages/server-ai/src/chat-conversation/conversation-map/

宿主端：
- ViewExtensionModule / slot AGENT_WORKBENCH_SLOT @ packages/server/src/view-extension/
- 特性开关 CONVERSATION_MAP_FEATURE / host context（RequestContext 三重比对依赖）@ packages/server-ai/src/chat-conversation/conversation-map/ 与 packages/server/src/core/context/