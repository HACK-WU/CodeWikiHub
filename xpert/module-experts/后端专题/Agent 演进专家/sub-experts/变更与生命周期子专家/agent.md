# 变更与生命周期子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（Agent 演进专家）
- **资产路径**：`.module-experts/后端专题/Agent 演进专家/sub-experts/变更与生命周期子专家/`
- **职责**：本子专家负责 **「一条改进从提交到发布意图的全过程记录与读投影」**：提交受理与结构校验（`evolutionSubmissionSchema`）＋业务校验（`validateChangeInput`）、策略冻结（`EvolutionStrategyService.freeze`）、提交→候选→评估记录→审批→发布意图的**分表落库**（`EvolutionChangeStore`）、异步推进（`change_preparation` 队列 ＋ `EvolutionChangeProcessor` ＋ `process()` 的幂等重入）、HTTP 读投影（`lifecycleRecord`）、以及会话/执行账本的单向联动（`EvolutionExecutionConversationService`）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/agent-evolution 的 changes/**（8 端点 / 8 表）`
  - `controllers/agent-evolution.controller.ts`
  - `providers/conformance-template.provider.ts`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 权限位三分不可混用：8 条端点的读＝`EVOLUTION_VIEW｜XPERT_EDIT`（两位并列），写＝`EVOLUTION_MANAGE`（单独一位）；类级 `@UseGuards(PermissionGuard)` 是唯一守卫，服务层不再二次鉴权。
  - 两层「人主体」门不可省：`requireHuman` 在 `actorType === 'agent'` 时直接拒（400），`approvalAuthority` 由角色名派生（`SUPER_ADMIN`/`ADMIN` → `administrator`，否则 `standard`）；`manual_test` 档另要求 `administrator`。agent 主体既不能做 R4 提案，也不能做发布回滚。
  - 夹具端点的生产 404 是预期行为：`environment.production && AGENT_EVOLUTION_ENABLE_CONFORMANCE !== 'true'` → **空体 `NotFoundException`**，与「路由不存在」不可区分；provider 侧另有同款 `assertTemplateConformanceEnabled()` 与逐方法 `authorizeScope`（target ＋ `scope.type==='organization'` ＋ `scope.key===organizationId`）二次校验，不符即 `identity_mismatch`。
  - `submission.schema` 是结构边界，不是唯一真相：`.strict()` 使 `tenantId`/`organizationId` 出现在请求体即 400；服务层**只复用 `executionContext` 子 schema**，其余由手写 `validateChangeInput` 二次判定（scope key 与租户/组织一致性、`strategy.inputs.includes(sourceKind)`、evidence 白名单）。两层缺一层就可能放过或误杀。
  - `change.processor` 的异步与幂等分四层：① DB 唯一索引 `UX_evolution_proposal_request`；② 应用层 7 字段 `changeDigest` 对账（命中即返回**原变更**，内容不一致即 `immutable_request_changed`）；③ `prepare()` 仅凭 `record.changeId === changeId` 判断是否首建、重复提交**复用同一 `jobId`** 重投递；④ `process()` 三个事务块各自再判一次可推进状态，非可推进即**收尾残留 job 并直接返回**。
  - `lifecycle.projection` 是只读投影，勿当业务表改：`lifecycleRecord()` 只 import 契约类型，**无 DataSource、无 repository、无写**；`capabilities` 四位是**建议位不是权限位**，且 `release` 存在时 `capabilities.publish` 恒 false。想在投影里加字段必须先让写侧产生对应事实，否则会掉进 `preparing` 兜底。
- **测试状态**：范围：从父域 19 个 spec 中筛出「`changes/*` + 模块装配 + 本子域共享领域件」相关的 **11 个** + 1 个需 PG 的集成 spec（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
