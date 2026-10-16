# ClawXpert子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：子专家（对话前端专家）
- **资产路径**：`.module-experts/前端专题/对话前端专家/sub-experts/ClawXpert子专家/`
- **入口路由**：`/chat/clawxpert`、`/chat/clawxpert/c[/:threadId]`、`/chat/clawxpert/assistant[/:threadId]`、`/chat/clawxpert/settings`
- **职责**：本子域是「**外壳 + 作用域面板 + 详情骨架**」三层：外壳按 `viewState()` 分流，面板为每个作用域装配门面与命令，详情骨架把门面字段映射进 `injectHostedAssistantChatkitControl`；消息面（列表 / 流式 / 滚动 / composer）在 ChatKit iframe 内，**本子域不渲染消息**。
- **覆盖目录**：
  - `apps/cloud/src/app/features/chat/clawxpert/**（54 非 spec / 32 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 绑定向导与首次创建** → `ClawXpertBindingWizardComponent.selectXpert` / `savePreference`、`ClawXpertSetupWizardComponent`、`ClawXpertBootstrapService.createClawXpert` / `bindAndOpenCreatedClawXpert`。
  - 会话面板与详情骨架**（ChatKit 装配、工作区标签、固定视图栈、命令注册） → `ClawXpertConversationPaneComponent.providers`、`ClawXpertConversationDetailComponent.control` / `workspaceTabs` / `reviewTabs`。
  - 作用域会话**（`task` / `assistant` 两 scope 的线程隔离与恢复） → `clawXpertConversationScope` / `clawXpertConversationPath`、`ClawXpertScopedConversationFacade.active` / `onChatThreadChange`。
  - 群组工作台 scope**（共享运行时解析前不出个人视图） → `createGroupWorkbenchScope`、`ClawXpertConversationDetailComponent.groupWorkbenchScope` / `viewRuntimeScope`。
  - 工具与 skill 偏好**（乐观开关、串行写队列、批量启停、安装卸载） → `ClawXpertToolPreferencesComponent.toggleTool` / `toggleSkill` / `setSelectedSkillsEnabled`。
  - 触发器草稿**（副本 + `dirty` / `invalid` 门控，保存只写 draft） → `ClawXpertTriggerConfigEditorComponent.workingItems` / `save`、`ClawXpertFacade.saveTriggerDraft`。
- **测试状态**：66 spec = 52 PASS / 10 FAIL（4 环境级缺依赖 + 1 contracts 产物 + 5 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
