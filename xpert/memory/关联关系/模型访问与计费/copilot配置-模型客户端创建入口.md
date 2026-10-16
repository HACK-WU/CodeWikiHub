---
groupPath: 关联关系/模型访问与计费
relation: copilot配置-模型客户端创建入口
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] copilot 配置（provider/凭据/模型）与 运行时模型客户端创建
强度：必改——改 copilot_provider 的凭据结构、模型 id 命名或角色枚举（Primary/Secondary/Reasoning/Embedding）→ `GetChatModelQuery` / `GetEmbeddingsQuery` / `GetRerankQuery` 与全部运行时取模型调用方必改；改客户端内部实现 → 配置侧不用管
原因：配置层与运行层以查询契约为接口，任何「新增模型/provider」都同时改动两端（配置与 discovery），且组织级凭据会覆盖租户级

配置端：
- CopilotProvider / CopilotProviderService.findVisibleByCopilotIds（组织级覆盖租户级）@ packages/server-ai/src/copilot-provider/
- CopilotService.findAllAvailablesCopilots / 角色启停 @ packages/server-ai/src/copilot/
- CopilotModel / ModelDiscoveryService @ packages/server-ai/src/{copilot-model,copilot-provider}/

客户端端：
- GetChatModelQuery / GetEmbeddingsQuery / GetRerankQuery（创建 LangChain 客户端的唯一入口）@ packages/server-ai/src/{copilot,copilot-model}/
- 运行时消费方：xpert-agent / ai（对话与 Agent 执行链）@ packages/server-ai/src/{xpert-agent,ai}/