---
groupPath: 关联关系/Agent演进专家
relation: 演进域-Agent执行链与定义
exportedAt: "2026-10-16T07:28:46.849Z"
---
[强关联] Agent 演进专家 与 Agent 执行链专家 + Assistant 定义与运行时专家（能力版本线与定义本体平行；与执行账本只写不读）
- 强度：必改——改本域 `resolveExecutionPlan` 的版本裁决或能力束形状 → 消费方（执行链 / 运行时）的执行模式与 shadow/canary 选路必改；改执行账本或会话 upsert 契约 → 本域评估转录与候选执行链路必改（但转录可用性不得改变结论）；改助手定义域 `Xpert` / 发布准入 → 本域 provider 描述符对齐与准入校验必改
- 原因：本域**不拥有 `Xpert` 实体**、也**不拥有执行账本**——对 `xpert` 只做准入校验（经 `ModuleRef` 取 `PublishedXpertAccessService.getAccessiblePublishedXpert` 与 `XpertProjectAccessService.assertCanUseXpert`），对执行与会话经 `CommandBus` **单向写、从不读**，且 `agent_evolution_*` 与执行记录之间**无关联列、无校验**
- A 端（本域）：`EvolutionTargetEntity` 描述符（`providerKey`/`providerVersion`/`artifactSchemaVersion`）@ file://packages/server-ai/src/agent-evolution/entities/evolution.entities.ts；`AgentEvolutionRuntimeService.resolveExecutionPlan/recordRuntimeObservation/ingestLearningEvent` @ file://packages/server-ai/src/agent-evolution/application/agent-evolution-runtime.service.ts
- A 端（本域，续）：`EvolutionExecutionConversationService.start/finish`（`ChatConversationUpsertCommand`/`ChatMessageUpsertCommand`/`XpertAgentExecutionUpsertCommand`，SSE 失败 `logger.warn` 静默降级）@ file://packages/server-ai/src/agent-evolution/changes/execution-conversation.service.ts；`EvolutionRuntimeStore`（指针 CAS、观测累加、审计）
- B 端（Agent 执行链专家）：`XpertAgentExecution` 行（`status RUNNING/SUCCESS/ERROR`、`metadata.evolutionChangeId`，本域**只写不读**）@ file://packages/server-ai/src/xpert-agent-execution/agent-execution.entity.ts；`AgentInvocationEntity` 与观察 / 回执面（本域引用 0 命中、无 `@OnEvent`）
- B 端（Assistant 定义与运行时专家）：`Xpert` 定义与发布版本、`PublishedXpertAccessService`、`XpertProjectAccessService`；消费方执行链经 `dynamicResources?.toolsetIds` 装配（跨域传递面）
- 改哪一侧会连带改另一侧：① 改本域能力束 / `executionMode` 形状 ⇒ 消费方执行链的选择与执行模式必改（本域只给裁决、不给执行）；② 改执行 / 会话 upsert 命令契约 ⇒ 本域转录与候选执行链路要同步，且必须保留「转录可用性不得改变评估、审批或发布结论」；③ 改助手定义域的目标接入方式 ⇒ 须同步 `EvolutionTargetProviderRegistry` 注册与描述符三字段对齐（**实体层无外键**）
- 边界面：本域**确实单向写**执行账本（口径校订：任务书「不写执行账本」与实现层不符）——准确表述是「**只写不读、无关联校验**」；闸门只认 `release_deployment` 的观测累加值，观测重复只靠 `observationId` 幂等
- 资产与证据：本域 C0-使用总览.md「边界 / 不做什么」（含「不含 Agent 调用账本与执行账本」）；C4-数据流向与消费.md「本域写 vs 跨域投影写」；C5-关键决策.md §D9；B 端 .module-experts/后端专题/{Agent 执行链专家,Assistant 定义与运行时专家}/ 与 memory/数据流/Agent 执行链专家/