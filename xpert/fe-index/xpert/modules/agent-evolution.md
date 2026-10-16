# AgentEvolutionModule（`agent-evolution`）

- **位置**：`packages/server-ai/src/agent-evolution/` · 归属文件 **45** 个 · 约 **8203** 行
- **定义**：`packages/server-ai/src/agent-evolution/agent-evolution.module.ts:32`（nestjs）
- **挂载前缀**：`/api/baselines`、`/api/changes` · 视图/接口入口 **48** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/agent-evolution/controllers/evolution-baseline.controller.ts`（EvolutionBaselineController） | `baselines` | 1 | `:6` |
| `packages/server-ai/src/agent-evolution/changes/lifecycle.controller.ts`（EvolutionLifecycleController） | `changes` | 8 | `:15` |
| `packages/server-ai/src/agent-evolution/controllers/agent-evolution.controller.ts`（AgentEvolutionController） | `-` | 39 | `:31` |

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，2 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`ChatConversationUpsertCommand`）
- → `XpertAgentExecutionModule`（CQRS：`XpertAgentExecutionUpsertCommand`）

## 数据表（19）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `agent_evolution_release_package` | ReleasePackageEntity | 12 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:102` |
| `agent_evolution_audit_event` | EvolutionAuditEventEntity | 11 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:108` |
| `agent_evolution_approval` | ApprovalDecisionEntity | 9 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:100` |
| `agent_evolution_proposal` | ImprovementProposalEntity | 8 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:92` |
| `agent_evolution_active_pointer` | ActiveCapabilityPointerEntity | 7 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:83` |
| `agent_evolution_capability_version` | CapabilityVersionEntity | 6 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:79` |
| `agent_evolution_candidate` | EvolutionCandidateEntity | 6 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:94` |
| `agent_evolution_evaluation_run` | EvaluationRunEntity | 6 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:98` |
| `agent_evolution_target` | EvolutionTargetEntity | 5 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:78` |
| `agent_evolution_release_deployment` | ReleaseDeploymentEntity | 5 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:104` |
| `agent_evolution_canary_test_override` | EvolutionCanaryTestOverrideEntity | 5 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:106` |
| `agent_evolution_capability_bundle` | CapabilityVersionBundleEntity | 4 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:81` |
| `agent_evolution_learning_event` | LearningEventEntity | 4 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:85` |
| `agent_evolution_dataset_snapshot` | DatasetSnapshotEntity | 4 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:96` |
| `agent_evolution_runtime_observation` | EvolutionRuntimeObservationEntity | 4 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:110` |
| `agent_evolution_diagnosis` | EvolutionDiagnosisEntity | 3 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:86` |
| `agent_evolution_event_cluster` | EvolutionEventClusterEntity | 3 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:88` |
| `agent_evolution_experience` | EvolutionExperienceEntity | 3 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:90` |
| `agent_evolution_job` | EvolutionJobEntity | 3 | @Module imports forFeature | `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts:112` |

## 守卫/权限

`PermissionGuard`

## 归属文件（45）

- `packages/server-ai/src/agent-evolution/agent-evolution.module.ts`
- `packages/server-ai/src/agent-evolution/index.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-queue.service.ts`
- `packages/server-ai/src/agent-evolution/application/evolution-store.helpers.ts`
- `packages/server-ai/src/agent-evolution/application/evolution-governance.helpers.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-governance.service.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution.store.ts`
- `packages/server-ai/src/agent-evolution/application/index.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution.service.ts`
- `packages/server-ai/src/agent-evolution/application/evolution-runtime.store.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-release-gate-policy.service.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-analyst.service.ts`
- `packages/server-ai/src/agent-evolution/application/evolution-baseline.service.ts`
- `packages/server-ai/src/agent-evolution/application/evolution-persistence-proof.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-queue.processor.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-runtime.service.ts`
- `packages/server-ai/src/agent-evolution/application/agent-evolution-quality-governance.service.ts`
- `packages/server-ai/src/agent-evolution/changes/evaluation-executor.service.ts`
- `packages/server-ai/src/agent-evolution/changes/change.errors.ts`
- `packages/server-ai/src/agent-evolution/changes/lifecycle.controller.ts`
- `packages/server-ai/src/agent-evolution/changes/change.validation.ts`
- `packages/server-ai/src/agent-evolution/changes/change.service.ts`
- `packages/server-ai/src/agent-evolution/changes/change.processor.ts`
- `packages/server-ai/src/agent-evolution/changes/publication-executor.service.ts`
- `packages/server-ai/src/agent-evolution/changes/submission.schema.ts`
- `packages/server-ai/src/agent-evolution/changes/strategy.service.ts`
- `packages/server-ai/src/agent-evolution/changes/lifecycle.service.ts`
- `packages/server-ai/src/agent-evolution/changes/lifecycle.projection.ts`
- `packages/server-ai/src/agent-evolution/changes/execution-conversation.service.ts`
- `packages/server-ai/src/agent-evolution/changes/change.store.ts`
- `packages/server-ai/src/agent-evolution/controllers/evolution-baseline.controller.ts`
- `packages/server-ai/src/agent-evolution/controllers/index.ts`
- `packages/server-ai/src/agent-evolution/controllers/agent-evolution.controller.ts`
- `packages/server-ai/src/agent-evolution/domain/evolution-hash.ts`
- `packages/server-ai/src/agent-evolution/domain/evolution-state.ts`
- `packages/server-ai/src/agent-evolution/entities/index.ts`
- `packages/server-ai/src/agent-evolution/entities/evolution-row-guards.ts`
- `packages/server-ai/src/agent-evolution/entities/evolution.entities.ts`
- `packages/server-ai/src/agent-evolution/examples/index.ts`
- `packages/server-ai/src/agent-evolution/examples/conformance-field-mapping.example.ts`
- ……其余 5 个见 JSON 输出（完整清单）
