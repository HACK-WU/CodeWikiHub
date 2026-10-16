---
groupPath: 专题记忆/Agent演进专家
relation: Agent演进专家
exportedAt: "2026-10-16T07:28:46.847Z"
---
【专题记忆｜Agent演进专家】
- 资产路径：.module-experts/后端专题/Agent 演进专家/（用 expert-lookup 加载；含 2 个子专家）
- 一句话职责：回答「一条 Agent 改进怎么从学习信号走到生产指针」——学习事件 → 诊断 → 提案 → 候选 → 评估 → 审批 → 发布 → 金丝雀 / 回滚 → 观测 → 经验 的受治理闭环；**改的是能力版本与指针，不是 Agent 定义本体**
- 基线：`2026-10-16 · commit 80f5676fd`（批次 5 第 11 专家；**未复跑 jest**，见 test/known-failures.md）
- 模块范围：`packages/server-ai/src/agent-evolution` — **44 非 spec**（目录 `.ts` 63 − spec 19）· 19 spec · **19 张表** · **48 条真实路由**（39 + 8 + 1）
- HTTP 前缀：`/api/agent-evolution`（`RouterModule.register` 给 `/agent-evolution` ＋ 全局前缀 `api`）；3 控制器 = `AgentEvolutionController`（空前缀，39）· `EvolutionLifecycleController`（`/changes`，8）· `EvolutionBaselineController`（`/baselines`，1）
- 子专家①：变更与生命周期子专家（学习事件 / 诊断 / 聚类 / 提案 / 候选 / 数据集 / 评估 / 审批 ＋ `lifecycleRecord` 投影）
- 子专家②：评估与发布子专家（发布包 `PUB-<changeId>` / 部署阶梯 / 指针 CAS / 一次性金丝雀覆盖 / job 队列 / 观测回流 / 经验留档）
- 核心能力（变更侧）：`EvolutionChangeService.prepare/build/evaluate/process/decide/publish`、`EvolutionLifecycleService.list/get/evaluate/decide/publish`、`lifecycleRecord`（纯函数投影）、`AgentEvolutionAnalystService.diagnose`、`EvolutionBaselineService.inspect/publish`
- 核心能力（发布侧）：`AgentEvolutionGovernanceService.installRelease/startShadow/startCanary/pauseRelease/activateProduction/rollbackProduction/createCanaryTestOverride/createExperience`、`EvolutionPublicationExecutor.package`、`AgentEvolutionReleaseGatePolicyService.snapshot/forRelease`、`AgentEvolutionRuntimeService.resolveExecutionPlan/ingestLearningEvent/recordRuntimeObservation`、`AgentEvolutionQueueService.enqueue/getJob`
- 高频坑①：**夹具端点的生产 404 是预期行为**——`environment.production && AGENT_EVOLUTION_ENABLE_CONFORMANCE !== 'true'` → 空体 `NotFoundException`（与「路由不存在」不可区分；门禁只读 `environment.production`、不叠加 `NODE_ENV`）
- 高频坑②：**能力版本不可变 + 发布包一次性冻结 `gatePolicy`**——同 `versionId` 异 hash 抛 `Immutable capability version`；`forRelease()` 只读冻结值，缺失即 `Release gate policy was not frozen`（发布中途改 env 不影响已建包）
- 高频坑③：**入队型端点 HTTP 200 ≠ 动作成功**——`install|shadow|canary|rollback` 返回 `EvolutionJob`；`GET /jobs/:jobId` 未命中返回 `null`（200）而非 404；`job.status` 契约**无 `pending`**（`change.process` 的 `['pending',…]` 判断是死分支）
- 关键代码位置：`changes/change.service.ts`、`changes/change.store.ts`、`changes/lifecycle.projection.ts`、`application/agent-evolution-governance.service.ts`、`application/agent-evolution-runtime.service.ts`、`application/evolution-runtime.store.ts`、`entities/evolution.entities.ts`、`domain/{evolution-state.ts,evolution-hash.ts}`
- 数据落地（19 表四组）：目标与基线 4 —— `agent_evolution_target`·`_capability_version`·`_capability_bundle`·`_active_pointer`
- 数据落地（续）：变更与生命周期 8 —— `_learning_event`·`_diagnosis`·`_event_cluster`·`_proposal`·`_candidate`·`_dataset_snapshot`·`_evaluation_run`·`_approval`；发布与部署 4 —— `_release_package`·`_release_deployment`·`_canary_test_override`·`_job`；经验·审计·观测 3 —— `_experience`·`_audit_event`·`_runtime_observation`
- 数据落地口径：19 表**无外键、无 `@VersionColumn`、无软删、无 SQL 迁移**（DDL 唯一事实来源是实体注解）；快照列一律 `@Column({type:'json'})`（模块内 `jsonb` 零命中，但查询用 `value ->> 'field'`）
- 检索触发词：Agent演进, agent-evolution, 能力版本, capability_version, sequence, artifactHash, 版本束, bundle, 生产指针, active_pointer, channel, revision, CAS, 基线, baselines, 学习事件, learning_event, 诊断, diagnosis, correctionSignature, 事件簇, cluster, 提案, proposal, requestId, 候选, candidate, 数据集, dataset, snapshotHash, 评估, evaluation, gatePassed, 审批, approval, quorum, 发布包, PUB-, gatePolicy, 部署, shadow, canary, activate, rollback, rolled_back, 一次性覆盖, canary_test_override, activeKey, 观测, runtime_observation, 经验, experience, 审计, audit_event, job, EVOJOB-, 队列, change_preparation
- 详细资产：见 .module-experts/后端专题/Agent 演进专家/ — 契约层 C0~C5 + implementation/01~07 + sub-experts/2 子（变更与生命周期、评估与发布）；前端对照 .module-experts/前端专题/Agent 演进专家/