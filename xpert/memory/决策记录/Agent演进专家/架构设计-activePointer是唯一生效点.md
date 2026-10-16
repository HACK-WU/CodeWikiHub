---
groupPath: 决策记录/Agent演进专家
relation: 架构设计-activePointer是唯一生效点
exportedAt: "2026-10-16T07:28:46.849Z"
---
【决策记录｜架构设计：active_pointer 是唯一生效点（发布成功 ≠ 线上换版本）】
- 分类：架构设计
- 动机（避坑）：**现象** 把「发布成功」等同于「线上换版本」（在发布包里写 `currentVersionId`，或由控制器 / 治理服务直接更新指针行）；**后果** 多入口并发写同一指针，最后一次写覆盖前一次，激活与回滚互相踩踏，且没有任何冲突信号
- 决策：所有「生效」收敛为 `ActiveCapabilityPointer` 的**一次条件更新**——`activatePointerCas` / `rollbackPointerCas` 以 `revision + activeVersionId` 为条件，`affected !== 1` 即抛 `Error('Active Pointer CAS conflict')`；指针写入被 `EvolutionRuntimeStore` **独占**（文件头逐字：`// Invariants: runtime rollout mutations keep their original CAS, locks and safety gates.`）
- 背景约束：激活前必须校验指针仍等于 `release.rollbackVersionId`（被别人前推就拒绝：`Production pointer no longer matches the approved rollback version`）；回滚前必须校验指针仍等于 `release.targetVersionId`；`revision` 是手写应用层版本列（19 表无 `@VersionColumn`）；**发布不改任何 Agent 运行时行为**——真正切换发生在消费方调用 `resolveExecutionPlan` 时
- 被否决方案：「由控制器或治理服务直写 `active_pointer` 实体行」——被「运行时写入唯一（`EvolutionRuntimeStore` 独占状态迁移、指针 CAS 与审计）」这一约束排除（implementation/01-架构.md 结论）
- 重新评估触发条件：出现多目标 / 多 scope 批量切换需求时，仍应**逐指针 CAS**（或新增批量 CAS 原语），不得改为无条件 UPDATE；若消费方要求 409 语义，需把 CAS 冲突从普通 `Error` 改为显式 HTTP 冲突
- 失败面：CAS 冲突当前表现为 **5xx 而非 409**，前端无法据此做重试语义；审计固定 `action: 'active_pointer.cas_activated'`、`auditId: AUD-<releasePackageId>-activate`
- 关联代码：file://packages/server-ai/src/agent-evolution/application/evolution-runtime.store.ts、file://packages/server-ai/src/agent-evolution/application/agent-evolution-governance.service.ts
- 证据来源：C5-关键决策.md §D4；implementation/07-运维.md「指针切换的影响面」；C0-使用总览.md 坑 6、C1-能力契约.md §2（`activateProduction`/`rollbackProduction` 行）
- 详细资产：.module-experts/后端专题/Agent 演进专家/C0-使用总览.md「本域只写」清单