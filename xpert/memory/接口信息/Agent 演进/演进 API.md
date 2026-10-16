---
groupPath: 接口信息/Agent 演进
relation: 演进 API
exportedAt: "2026-10-16T03:52:14.870Z"
---
**Agent 演进接口**（前端调用视角，真实路径）

- 基址常量：API_AGENT_EVOLUTION（@core/constants/app.constants）
- GET {API_AGENT_EVOLUTION}/changes —— 变更列表（{items: EvolutionLifecycleRecord[], total}，可带过滤）
- GET/POST {API_AGENT_EVOLUTION}/changes/:id/evaluations —— 变更评估
- POST {API_AGENT_EVOLUTION}/changes/:id/decisions —— 变更决策
- POST {API_AGENT_EVOLUTION}/changes/:id/publication —— 发布包/发布动作
- :id 经 encodeURIComponent 拼路径；前端：AgentEvolutionApiService / AgentEvolutionFacade（features/agent-evolution）