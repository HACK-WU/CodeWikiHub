---
groupPath: 决策记录/Agent演进专家
relation: 架构设计-能力版本不可变与发布包冻结gatePolicy
exportedAt: "2026-10-16T07:28:46.849Z"
---
【决策记录｜架构设计：能力版本不可变 ＋ 发布包一次性冻结 gatePolicy】
- 分类：架构设计
- 动机（避坑）：① **现象** 把「同一目标第 N 版能力」实现为可改写行（就地覆盖 `artifactHash`/`sequence`）；**后果** 已激活的生产指针会指向内容被悄悄替换的版本，历史审计、金丝雀对比与回滚目标同时失真。② **现象** 闸门阈值直接从 `process.env` 现读现用；**后果** 发布进行到一半有人改阈值，同一发布包在不同档位被不同标准判定，历史结论不可复现
- 决策：① `CapabilityVersionEntity` 以 **UQ `(tenant, organization, targetId, sequence)` ＋ `artifactHash`** 固化「第 N 版」（`versionId = targetId:changeId`、`sequence = max+1`、`semanticVersion = 1.{sequence-1}.0`），版本只被指针引用、不被改写，精确重放只返回旧行；② 阈值在**建模发布包时一次性冻结**——`EvolutionPublicationExecutor.package()` 调 `snapshot()` 把 `gatePolicy`（`profile` ＋ 六个样本/时长阈值）写入 `ReleasePackage.value`，此后 `forRelease(release)` **只读冻结值**，缺失即 400 `Release gate policy was not frozen`
- 背景约束：列与 `value` JSON 的重复字段（`artifactHash`/`sequence`）是查询副本，一致性由服务端同时赋值、**DB 层无约束**；`sourceCandidateId` 可空（基线初版无候选）；`STANDARD_GATE_POLICY` 写死 shadow `100/72h`、canary `30/24h`、productionCanary `30/24h`、experience `100/168h`；`manual_test` 档仅**非生产** ＋ `AGENT_EVOLUTION_GATE_PROFILE=manual_test`；`requestedShadowMinimumSamples` 只能抬高（`Math.max`）；发布包 id 固定 `PUB-<changeId>`（幂等：已存在直接返回旧值，**无法改**）
- 被否决方案：能力版本——无显式否决记录，边界以注释明写「An exact replay after success is harmless; never overwrite a different version on retry.」；gatePolicy——「靠改 env 调整在途发布的阈值」被**结构上排除**（implementation 明写「改配置影响在途发布在结构上不可能」）
- 重新评估触发条件：出现「同版本号修补（hotpatch 同一 `sequence`）」硬需求时须先定义修补版本号语义与指针失效规则，不得放开 `saveVersion` 的 hash 校验；需要「灰度放宽」某道闸门只能在**建新包**路径上做，不得让 `forRelease` 读环境变量
- 失败面：版本重试只返回旧行（不改内容）；`forRelease` 缺冻结策略即 400；`capability_version` 的 `sequence` 由 UQ 物理兜底并发分配
- 关联代码：file://packages/server-ai/src/agent-evolution/entities/evolution.entities.ts、file://packages/server-ai/src/agent-evolution/changes/publication-executor.service.ts、file://packages/server-ai/src/agent-evolution/application/agent-evolution-release-gate-policy.service.ts、file://packages/server-ai/src/agent-evolution/application/evolution-baseline.service.ts
- 证据来源：C5-关键决策.md §D1 ＋ §D2；implementation/01-架构.md「关键不变量」3；implementation/02-实现.md「设计维度分析」