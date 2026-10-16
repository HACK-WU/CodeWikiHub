# Agent定义与图编译子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Agent 执行链专家）
- **资产路径**：`.module-experts/后端专题/Agent 执行链专家/sub-experts/Agent定义与图编译子专家/`
- **职责**：本子专家负责 **「Agent 长什么样（定义）+ 这段定义被编译成哪张可执行图」**：`xpert-agent/` 的定义面 CRUD、草稿校验、图命令链（`CompileGraphCommand` → swarm / subgraph）、native 兼容编译，以及中间件策略与工具在**草稿态**的可视面。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-agent`
  - `server-ai/src/agent-invocation（native 编译三件套）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 编译成功 ≠ 校验通过：`CompileGraphHandler.execute` 只调 `GetXpertWorkflowQuery` 与两条子命令，**不读取** `ChecklistItem`；校验由 `@OnEvent(EventNameXpertValidate)` 的订阅者（`XpertAgentGraphValidator`、`XpertAgentNodeValidator`、`plugins`/`workflow` 下各 validator）独立产出。「编译前必须过 validator」在源码中**不成立**，闸门实际落在草稿保存侧。
  - native 与 legacy 双图路径并存：`CompileGraphHandler` 产出的是 legacy 图（swarm/subgraph handler）；native 分支由 `NativeAgentCompiler` + `AgentInvocationGraphService` 另起一条路径接入同一执行账本。排障时要先确认走的是哪条。
  - `xpert_agent` 的 `knowledgebaseIds` / `toolsetIds` / `collaboratorNames` 是 `@Column({ type: 'json', nullable: true })`，没有 FK：实体上无 `@ManyToMany`/`@JoinTable`，`knowledgebases?` / `toolsets?` / `collaborators?` 只是内存属性。删知识库 / 工具集 / 协作团队不会级联清理，也不会报错。
  - native 三件套按目录归属会误划给子专家 ②：`NativeAgentCompiler` 与 `AgentInvocationGraphService` 由 `XpertAgentModule.providers` 注册，并复用本域 `agent.ts` 的 `messageEvent`、`collaborators.middleware.ts` 的 `collaboratorToolDeclaration`。
  - barrel 隐式导出面：`plugins/index.ts` 的 `Strategies`/`Validators` 与 `workflow/index.ts` 的 `Validators` 直接被 `XpertAgentModule.providers` 展开注册；改 barrel 等于改 provider 集合，`DiscoveryModule` 型注册表会随之变化。
  - 草稿态与发布态上下文分离：`chatAgent` 固定 `isDraft: true` + `store: null`（无长期记忆）；`getDraftXpertMiddlewareContext` 先 `assertCanAuthorById` 再 `FindXpertQuery({ id }, { isDraft: true })`；native 侧 `AgentInvocationGraphService.wrap` 的 `revision` 仅在 `isDraft` 时把 `target.draft` 纳入哈希。
- **测试状态**：1. 测试分布与规模（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
