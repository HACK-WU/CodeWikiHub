---
groupPath: 关联关系/运行时沙箱产物专家
relation: 沙箱域-Agent执行链
exportedAt: "2026-10-16T08:16:32.868Z"
---
[强关联] 运行时·沙箱·产物专家 与 Agent 执行链专家（沙箱只留字符串弱引用，执行账本归对方）
- 强度：必改 —— 改沙箱侧「谁拥有执行」的判据（`sandbox_job` 幂等键 / 容量租约 / `hardDeadlineAt`）→ Agent 侧重试与重挂的归因口径必改；改 Agent 侧执行账本的 executionId/agentKey 语义 → 托管服务孤儿反查与挂账字段必改
- 原因：本域**不写执行账本表**，唯一挂接点是字符串弱引用：`sandbox_managed_service.ownerExecutionId`/`ownerAgentKey`（无 FK）、`sandbox_job.businessResourceType`/`businessResourceId`（纯业务资源引用，**不挂会话外键**，`sandbox_job` 也不挂 conversation FK）；依赖方向单向 —— `xpert-agent-execution` 对 `sandbox` 无源码引用
- A 端（本域）：`SandboxJobRuntimeCapabilityService.run/cancel/getJob/getActionHealth/waitForAttachedJob`（经 `@RuntimeCapabilityProvider('platform.sandbox.jobs')` 暴露 `SandboxJobsApi`：`run/cancel/getJob/getActionHealth`）@ file://packages/server-ai/src/sandbox/sandbox-job/sandbox-job-runtime-capability.service.ts
- A 端（本域 · 表与契约）：`sandbox_job` / `sandbox_managed_service` 实体 @ file://packages/server-ai/src/sandbox/{sandbox-job/sandbox-job.entity.ts,sandbox-managed-service.entity.ts}；能力契约 @ file://packages/plugin-sdk/src/lib/runtime/capabilities/sandbox-jobs.ts；会话进程内工具（`sandbox_shell` 等共用同一 provider，不经 HTTP）
- B 端（Agent 执行链专家）：执行账本 `XpertAgentExecution`（`executionId`/`agentKey` 的持有方）、Agent 循环中的工具/中间件（`sandbox_shell` 与 `platform.sandbox.jobs` 的调用方）、执行期附件/会话绑定 @ .module-experts/后端专题/Agent 执行链专家/
- 改哪一侧会连带改另一侧：① 沙箱作业的幂等/重挂语义（重启后同幂等键的 `waiting/starting/running` 被 `waitForAttachedJob` 重新挂上）决定 Agent 侧「重试是否会重跑沙箱」；② `ownerExecutionId`/`ownerAgentKey` 只是字符串约定 ⇒ Agent 侧改 executionId 生成或 agentKey 命名会让托管服务**孤儿反查失效**；③ 本域执行后端/协议升级（Runner 协议 2/3 门槛）会让 Agent 侧工具调用出现执行期失败（`provider_unavailable`/`SANDBOX_CAPACITY_UNAVAILABLE`），**不是编译期**
- 边界面：Agent 的调用协议（命令/CQRS handler）、执行账本表与模型循环都归 Agent 执行链专家；本域只提供 `platform.sandbox.jobs` 能力面与隔离执行环境
- 冲突面收敛点：沙箱侧唯一「谁拥有执行」的判据就是 `sandbox_job`（幂等键 ＋ 容量租约 ＋ 硬截止）—— **任何绕过它直接落盘的代码都会落进「无来源」灰区**
- 资产与证据：本域 C0-使用总览.md「边界」2；C4-数据流向与消费.md「本域写 vs 跨域写」（ownerExecutionId 行）；C4-数据流向与消费.md 子域① 弱引用清单
- 邻域：.module-experts/后端专题/Agent 执行链专家/；memory/专题记忆/Agent 执行链专家/Agent 执行链专家.md