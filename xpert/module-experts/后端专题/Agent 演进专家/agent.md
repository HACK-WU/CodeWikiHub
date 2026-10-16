# Agent 演进专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/Agent 演进专家/`
- **职责**：本专家负责 **「Agent 能力/策略的版本化治理」**——把一条改进从「学习信号」推进到「生产指针」的受治理闭环：**学习事件 → 诊断 → 提案 → 候选 → 评估 → 审批 → 发布 → 金丝雀/回滚 → 观测 → 经验**。四块职责：① 目标与基线（`EvolutionTargetEntity` 注册 provider 描述符；`EvolutionBaselineService.inspect/publish` 把「已发布源规则」铺成初版能力版本与生产指针）；② 变更全生命周期（`EvolutionChangeService.prepare/build/evaluate/process/decide/publish` ＋ `EvolutionLifecycleService` 投影成 HTTP 可读的 `EvolutionLifecycleRecord`）；③ 评估与发布（`EvolutionEvaluationExecutor` 逐步评估与 golden replay；`EvolutionPublicationExecutor` 在调用方事务内分配版本与 `PUB-<changeId>`；`AgentEvolutionGovernanceService` 的 install→shadow→canary→activate→rollback 阶梯）；④ 运行时解析与回流（`AgentEvolutionRuntimeService.resolveExecutionPlan` 出能力束，`recordRuntimeObservation` 把观测回流成部署样本并可在严重错误时自动暂停）。
- **子专家**：子专家①[变更与生命周期子专家](file://.module-experts/后端专题/Agent 演进专家/sub-experts/变更与生命周期子专家/C0-使用总览.md) · 子专家②[评估与发布子专家](file://.module-experts/后端专题/Agent 演进专家/sub-experts/评估与发布子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/agent-evolution（44 非 spec / 19 spec / 19 表 / 48 端点）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 权限位三分不可混用：读＝`EVOLUTION_VIEW｜XPERT_EDIT`（或语义），写＝`EVOLUTION_MANAGE`；基线读是**三位任一**（含 `EVOLUTION_MANAGE`），是「管理员只做读巡检」的唯一通道。
  - 夹具端点的生产 404 是预期行为：`environment.production && AGENT_EVOLUTION_ENABLE_CONFORMANCE !== 'true'` → `NotFoundException`（空体 404，与「路由不存在」不可区分）；门禁**只读 `environment.production`、不叠加 `NODE_ENV`**，且 provider 侧另有同款 `assertTemplateConformanceEnabled()` ＋ `authorizeScope` 二次校验。
  - 能力版本不可变：`CapabilityVersionEntity` 以 `UQ(tenant,organization,targetId,sequence)` ＋ `artifactHash` 固化「第 N 版」，`versionId = targetId:changeId`、`sequence = max+1`；hash 变即抛 `Immutable capability version`，重试只返回旧行。
  - 发布包一次性冻结 `gatePolicy`：`package()` 在调用方事务内写入，命名固定 `PUB-<changeId>`；此后 `forRelease()` 只读冻结值，缺失即 `Release gate policy was not frozen`——**发布中途改 env 不影响已建包**。
  - 金丝雀覆盖只生效一次：`activeKey = sha256(tenant:org:deploymentId:subjectKey)` 唯一索引保证同主体同部署至多一条 pending；消费后立即回落 `deterministicPercent = sha256(deploymentId:subjectKey)` 的确定性路由。
  - 回滚与 `active_pointer` 切换有硬前置：激活要求「指针 `activeVersionId` 仍等于 `release.rollbackVersionId`」，回滚要求「指针仍等于 `release.targetVersionId`」；并发由 `revision + activeVersionId` 条件更新兜底，`affected !== 1` 抛 `Active Pointer CAS conflict`（属异常/5xx，不是 409）。
- **测试状态**：spec 分布（19 个）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
