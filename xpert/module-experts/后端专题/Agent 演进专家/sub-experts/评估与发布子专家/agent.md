# 评估与发布子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（Agent 演进专家）
- **资产路径**：`.module-experts/后端专题/Agent 演进专家/sub-experts/评估与发布子专家/`
- **职责**：本子专家负责把 ① 侧产出的「已批准候选」推进到「生产生效版本」并留下可审计证据，五块职责：**闸门判据**（`reviewGoldenReplay` 五项阈值 ＋ `reviewHumanApprovals` quorum ＋ 六级样本/时长阈值）、**评估执行**（`EvolutionEvaluationExecutor.run` 逐步评估与 golden replay）、**发布执行**（`EvolutionPublicationExecutor.package` 在调用方事务内分配版本与 `PUB-<changeId>`）、**部署与生效**（`install→shadow→canary→pause→activate→rollback`，唯一生效点是 `ActiveCapabilityPointer` 的一次 CAS）、**运行时与回溯**（`resolveExecutionPlan` 出版本裁决、`recordRuntimeObservation` 累加部署统计、`createExperience` 沉淀经验）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/agent-evolution 的 application/**（治理/闸门/质量/运行时/分析/队列）`
  - `application/evolution-baseline.service.ts`
  - `changes/{evaluation,publication}-executor.service.ts`
  - `controllers/evolution-baseline.controller.ts`
  - `providers/{conformance-field-mapping,intent-routing}.provider.ts`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 入队型端点的 200 不代表动作成功：`install|shadow|canary|rollback` 与 `POST /evaluations` 返回的都是 `EvolutionJob`（HTTP 200 仅代表**受理**），成败只能看 `GET /jobs/:jobId`；只有 `pause` / `activate` 是同步动作。且「入队失败」（`queue_enqueue_failed`，HTTP 500）与「作业失败」（`evolution_job_failed`）是**两个不同错误码**。
  - `job` 状态枚举契约无 `pending`：契约 `EvolutionJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'`；实写路径只到 `queued → running → completed | failed`，`cancelled` **未找到写入点**（无任何取消入口，只能直接改账本）。① 侧 `change.service.process` 仍判断 `['pending','queued','running']`，属**跨实现漂移/死分支**，以契约为准。
  - 闸门策略与环境开关有两套判定口径：`snapshot()` 以 `environment.production || process.env.NODE_ENV === 'production'` 定生产；而夹具门禁**只读 `environment.production`**。`manual_test` 档（`AGENT_EVOLUTION_GATE_PROFILE=manual_test`，trim ＋ lowerCase）**只在非生产生效**，阈值由 `AGENT_EVOLUTION_TEST_*` 覆盖；标准档下 `requestedShadowMinimumSamples` 只能抬高（`Math.max(100, requested)`）。
  - 发布包一次性冻结 `gatePolicy`：`package()` 在调用方事务内写入，命名固定 `PUB-<changeId>`、已存在即原样返回（发布幂等）；此后 `forRelease()` 只读冻结值，缺失即 `Release gate policy was not frozen`——**发布中途改 env 不影响已建包**，也**无法对同一变更改阈值**（id 固定）。
  - 金丝雀覆盖只生效一次随后回落：`activeKey = sha256(tenant:org:deploymentId:subjectKey)` 唯一索引保证「同主体同部署至多一条 pending」；消费即翻 `consumed` ＋ 清空 `activeKey`，此后回落到 **确定性路由** `deterministicPercent = sha256(deploymentId:subjectKey) → [0,100)` 与 `deployment.canaryPercent` 的比较。已消费/已过期行**永不删除**，索引是**单列、不带租户维度**。
  - `active_pointer` 是唯一生效点，CAS 冲突是 5xx：六个动作里只有 `activate` / `rollback` 改指针，走 `activatePointerCas` / `rollbackPointerCas`（以 `revision + activeVersionId` 为条件 UPDATE，`affected !== 1` 抛普通 `Error('Active Pointer CAS conflict')`）。前置于 `activate`：指针仍等于 `release.rollbackVersionId`；前置于 `rollback`：指针仍等于 `release.targetVersionId`。**前置校验与 CAS 是两步**，窗口内他人前推指针会以 5xx 结束而非业务拒绝。
- **测试状态**：本子域**没有** `*.store.spec.ts`：`evolution-runtime.store.ts`（覆盖消费、观测累加、指针 CAS、自动暂停）**完全没有 store 级用例**。`controllers/` 下 **0 个 spec**，因此基线端点的路由与权限位只由人工核对保证。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
