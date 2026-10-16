---
groupPath: 数据流/对话域
relation: ChatKit宿主与助手注册
exportedAt: "2026-10-16T05:00:01.787Z"
---
【数据流｜ChatKit 宿主与助手注册】
- 实体类型：前端模型（助手注册表常量 + ChatKit 宿主状态机；iframe 协议为跨域投影，不进后端）
- 结构：ASSISTANT_REGISTRY × 3（CHAT_COMMON/XPERT_SHARED/CLAWXPERT；AssistantRegistryItem = code/featureKeys/management:'system'|'user'/labelKey/titleKey/descriptionKey，i18n 双写）
- 结构（宿主态）：control:signal<ChatKitControl|null>、activeRuntimeKey、activeSecurityScope、sessionRevision、sessionKey='hosted-session-${revision}'（不透明序号）
- 结构（键）：runtimeKey = identity+assistantId+groupId+delegatedConversation+frameUrl+apiUrl+token+organizationId（含凭据，注释禁止序列化）；securityScope = frameUrl+apiUrl+token+organizationId
- 生产方：getAssistantRegistryItem(code)；injectHostedAssistantChatkitControl（或 injectAssistantChatkitRuntime）装配并 createChatKit(options)；secret 由 iframe 经 api.getClientSecret → POST /api/ai/v1/chatkit/sessions 换取
- 主要消费方：ClawXpert 会话详情骨架、PublicChatkitComponent（/x-chatkit/* 公共页）、project-chat-panel/project-conversation-dialog；路由侧 redirectToDefaultChatEntry/featureGate 与门面 definition 同源
- 业务用途：一个注册表条目 + 一套宿主状态机即可在多种宿主页复用同一跨域会话 UI（由 iframe 承载）
- 关键约束：frame URL 双闸——sanitizeAssistantFrameUrl（空或 DOCKER_ 前缀 → null，不挂载）与 normalizeAssistantFrameUrl（本地 /chatkit 补 index.html）；runtimeKey 变才 sessionRevision++ 重建，否则 setOptions 原地刷新
- 关键约束（续）：loading 期间仅在同一 securityScope 内保留 iframe；附件上限 CHATKIT_ATTACHMENT_MAX_BYTES=50 MiB、maxCount=5；命令经 ViewClientCommandRegistry 校验（stale_context/forbidden/unsupported）
- 详细流向：见 .module-experts/前端专题/对话前端专家/implementation/03-数据流转.md（链③宿主/链④注册；模型清单见 04-模型.md §5/§6）