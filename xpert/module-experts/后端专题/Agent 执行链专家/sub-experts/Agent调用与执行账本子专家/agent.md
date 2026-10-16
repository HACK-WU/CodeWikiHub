# Agent调用与执行账本子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Agent 执行链专家）
- **资产路径**：`.module-experts/后端专题/Agent 执行链专家/sub-experts/Agent调用与执行账本子专家/`
- **职责**：本子专家负责 **「一次 Agent 调用如何被授权、幂等发起、记账、观察与停止」**：Invocation 运行时账本、执行与用量账本、有界等待与续跑、协作式取消、后台任务入口与结果/资源卡视图。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/agent-invocation`
  - `server-ai/src/xpert-agent-execution`
  - `server-ai/src/shared/execution`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - CAS 冲突是返回值不是异常：`replace(record, expectedRevision)` 在 `affected !== 1` 时立即返回 `false`；调用方必须重读重算（`updateLatest` 上限 8 次，超限才收敛为 `ConcurrentUpdate` 409）。事件表唯一 `(invocationId, revision)` 冲突会回滚整个 `replace` 事务。
  - 停请求不是终止证明：只有 `exited` 能确认进程停止，`unknown` **必须保持可见**；取消是协作式的（`AbortSignal`），不强杀 CPU-bound，也取消不了 Project Task。
  - 解析一次即 pin，恢复不得静默回退：`providerSource` 首次解析落库，此后 `pinned(record)` 走 `registry.getPinned(provider, providerSource)`，找不到即 `ProviderChanged`（409），**不降级**到另一个实现。
  - 先持久化再派发：`start` 先 `insert` 保留 `queued`，CAS `begin` 赢家才调 `strategy.start`；幂等键 `agentInvocationId(scope, callId)` 含 `scope.parentExecutionId` 与调用点 `callId`（toolCallId）。
  - `waitForTasks` 是有界观察：观察窗口耗尽正常返回 `pending`，**不挂起父级、不暗示完成**；只有人工交互才挂起父级；`unknown` 在 `pending` 中归一为 `unavailable`。
  - 终局化不得重放初始行：整行重放初次快照会覆盖较新的 `updatedAt` 与用量计数；元数据写入不得移动已记录的结束时间。
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
