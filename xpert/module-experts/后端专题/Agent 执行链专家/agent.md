# Agent 执行链专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/Agent 执行链专家/`
- **职责**：本专家负责 **「一次 Agent 工作如何被定义、编译、发起、记账、观察与停止」**：Agent 定义面与图编译（`xpert-agent/`）、统一调用运行时与执行/用量账本（`agent-invocation/` + `xpert-agent-execution/` + `shared/execution/`）、以及中间件受控运行时、Prompt 工作流、协作文档这三块运行时外围（`shared/agent/middleware-runtime/` + `prompt-workflow/` + `collaboration/`）。
- **子专家**：子专家①[Agent定义与图编译子专家](file://.module-experts/后端专题/Agent 执行链专家/sub-experts/Agent定义与图编译子专家/C0-使用总览.md) · 子专家②[Agent调用与执行账本子专家](file://.module-experts/后端专题/Agent 执行链专家/sub-experts/Agent调用与执行账本子专家/C0-使用总览.md) · 子专家③[中间件工作流与协作子专家](file://.module-experts/后端专题/Agent 执行链专家/sub-experts/中间件工作流与协作子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/xpert-agent`
  - `server-ai/src/agent-invocation`
  - `server-ai/src/xpert-agent-execution`
  - `server-ai/src/prompt-workflow`
  - `server-ai/src/collaboration`
  - `server-ai/src/shared/agent/middleware-runtime`
  - `server-ai/src/shared/execution`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 需要落码或改实现时，按 `C1-能力契约.md` §4「契约来源索引」跳实现层，或跳对应子专家的 `implementation/05-接口.md` 读逐端点明细。
  - 凡未显式标注「待核实」的结论，均取自源码或本域明写文档：`agent-invocation/README.md`、`xpert-agent-execution/README.md`、`handoff/runtime-messaging/README.md`、`docs/plans/2026-09-22-unified-agent-invocation.md`。
  - 本层不复述实现层文档的结构、规模与测试清单；那些内容属实现层（`implementation/01~07`）。
- **测试状态**：本域实测 spec 文件合计 **75** 个：（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
