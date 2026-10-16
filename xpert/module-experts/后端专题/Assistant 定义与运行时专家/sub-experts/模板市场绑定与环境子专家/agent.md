# 模板市场绑定与环境子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Assistant 定义与运行时专家）
- **资产路径**：`.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/模板市场绑定与环境子专家/`
- **职责**：一句话：这四条入口是**同一条运行时链的四个供给位**——运行时准入读 `xpert_to_user_group`（市场审批的产物），桌面端读 `assistant_binding` 的 `code`/`scope` 决定用哪个 Xpert，模板安装的产物就是 `xpert` 行，环境变量经 `EnvStateQuery` 进入运行时上下文。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-template`
  - `server-ai/src/xpert-marketplace`
  - `server-ai/src/assistant-binding`
  - `server-ai/src/environment`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 市场授权落地为 UserGroup 成员关系。`approveRequest` → `ensureAccessGroup` 建/复用（`managedBy = XPERT_MARKETPLACE`、`managedEntityType = XPERT`、`managedEntityId = xpert.id`）的组，把申请人加进 `group.members`，再把组挂进 `xpert.userGroups`，最后回写 `request.accessGroupId`。因此**删组 / 改名 / 手工移除成员会直接改已审批访问**，而 `request.status` 仍是 `approved`。
  - `AssistantBinding` 三个 partial unique 与 organization 优先回落。索引谓词 `"scope" = 'tenant'` / `'organization'` / `'user'` 是字符串 SQL，必须与列名逐字符匹配；`getEffectiveBinding` 先查 organization，命中立即返回，否则回落 tenant，都无则 `NONE` + `enabled: false`。
  - 模板安装副作用面大，但"不建工作区"。一次安装同时写：`xpert` 行、（可选）发布态、该工作区的默认 prompt workflow、技能 / MCP / toolset 组件落盘。失败时仅 `rollbackTemplateXpert` 删 Assistant，**不回滚**已建 prompt workflow；且 `initializeByTemplateId` 失败只 `logger.warn` 返回 `{ status: 'failed' }`，调用方不检查该返回值。**注意口径**：`workspaceId` 是入参、工作区必须已存在且当前用户可创作，安装**不**创建工作区本体。
  - `desktopBootstrap` 是 `@Exclude` 的服务端恢复态。实体上标 `@Exclude({ toPlainOnly: true })`，HTTP 出口只经 `BosiBootstrapService.publicProgress()` 暴露 `phase` / `capabilities` / `modelId` / `threadId`；`desktopOnboarding` 未排除但只存 `workspaceId` / `packages` / `connectorIds` / `revision`。
  - `onModuleInit` 启动回填旧 `assistant_config` 是多实例竞争。`AssistantBindingService implements OnModuleInit` → `backfillLegacyBindings()` → `backfillLegacySystemBindings()`（先 `tableExists('assistant_config')`）+ `backfillLegacyUserBindings()`，逐行 `findBinding` 先查后写。仓库内**没有**为这段回填加 advisory lock（advisory lock 只在 `BosiBootstrapService`），多 API 实例同时启动只能靠 partial unique 兜底。
  - 环境变量是数据而非进程环境变量。`Environment.variables` 是 json 行数据，`EnvStateQuery → EnvStateHandler → toEnvState` 只把它摊成 `{ env: { name: value } }`，再经 `mergeRuntimeContextWithEnv` 在请求态合并（请求上下文 env 覆盖环境值）。它**不会**设进 `process.env`，也不影响容器运行时。
- **测试状态**：1 测试框架与运行命令（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
