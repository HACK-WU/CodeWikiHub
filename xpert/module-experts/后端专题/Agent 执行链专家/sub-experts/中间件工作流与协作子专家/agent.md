# 中间件工作流与协作子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Agent 执行链专家）
- **资产路径**：`.module-experts/后端专题/Agent 执行链专家/sub-experts/中间件工作流与协作子专家/`
- **职责**：三块代码共享同一个定位：**给 Agent 提供受控能力面，而不是承载业务逻辑**。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/shared/agent/middleware-runtime`
  - `server-ai/src/prompt-workflow`
  - `server-ai/src/collaboration`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 只暴露 `createScopedApi` 的受控 API，不得把全局 registry 传给插件：`AgentMiddlewareRuntimeApi` 只含上表五个能力位 + `capabilities`；平台能力通过 `platformCapabilities.require(...)` 在服务内部取用后转发。该边界由 `file://packages/server-ai/src/shared/agent/middleware-runtime/middleware-runtime.provider-boundary.spec.ts` 以**模块元数据断言**固化：消费方必须 import runtime module、不得自行 provide runtime service；`SandboxModule` 不得导入 `AgentMiddlewareRuntimeModule`。
  - 草稿态与发布态上下文分离：草稿 runtime 由子专家 ① 的 `createDraftXpertMiddlewareRuntime` 单独构造；运行时报文 scope 由 `resolveAgentExecutionScope` 从 runnable config 补齐，**不复用请求上下文**。
  - Workspace 能力需要绑定数据所有者：只有 `projectId` / `xpertId` 存在，或 `catalog === 'users' && scopeId === userId` 时才注册 workspace-files、tool-images、知识库视觉资产能力（`hasBoundRuntimeWorkspaceScope`）；缺能力时 `require(...)` **显式失败**，而不是回落到更宽的默认实现。
  - `prompt_workflow` 唯一 `(workspaceId, name)`：实体上 `@Index(['workspaceId', 'name'], { unique: true })`；同名并发创建 / 重命名直接撞唯一约束；软删（`archivedAt`）**不影响**唯一约束。
  - `sourceTemplateId` 是 server-owned provenance：实体 JSDoc 明写「never inferred from a matching name」；`initializeDefaultsInWorkspace` 的关联补写必须**同时**匹配 `sourceTemplateId`。
  - `associatedXpertIds` 需与模板使用方同步：默认初始化只在「有 `sourceTemplateId` 且有 `xpertId`、未归档、且该 xpert 不在现有列表」时才追加；清空该数组会把命令放大为全局可见。
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
