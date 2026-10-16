# 会话工作台子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：子专家（对话前端专家）
- **资产路径**：`.module-experts/前端专题/对话前端专家/sub-experts/会话工作台子专家/`
- **入口路由**：`/chat/x/:name/c[/:threadId]`、`/chat/x/:name/p/:projectId/c[/:threadId]`
- **职责**：子域存在的理由是**解耦「会话工作台骨架」与「宿主实现」**：同一份骨架 `ClawXpertConversationDetailComponent` 同时服务 `/chat/clawxpert/c/*`、`/chat/clawxpert/assistant/*`、`/chat/x/:slug[/p/:projectId]/c/*` 三种形态；若骨架直接 `inject(ClawXpertFacade)`，第三种形态就必须污染 ClawXpert 门面。契约层零出向耦合——`workbench-chat/` 不 import 任何宿主。
- **覆盖目录**：
  - `apps/cloud/src/app/features/chat/workbench-chat（5 非 spec / 3 spec）`
  - `apps/cloud/src/app/features/chat/xpert-workbench（3 / 2）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 复用骨架 / 新增一种会话形态** → 实现 `WorkbenchChatFacade`（21 个必需成员）＋ `providers: [{ provide: WORKBENCH_CHAT_FACADE, useExisting: YourFacade }]` ＋ 模板一行；参考 `ChatXpertWorkbenchComponent`。
  - 接入新宿主（第三种入口）** → 先定「状态是否由 URL 表达」：URL 驱动型照抄 `/chat/x`（facade + 装配组件 + resolver + 路由项）；内存驱动型（如 per-scope pane）需自持 `threadId` 与 `nullGuardUntil` 类保护。
  - 门面契约变更评估** → 改 [workbench-chat.facade.ts](file://apps/cloud/src/app/features/chat/workbench-chat/workbench-chat.facade.ts)；新增**必需**成员会同时打断三个实现（`XpertWorkbenchFacade`、`ClawXpertFacade`、`ClawX
  - 入口 resolver 行为**（私聊门控 / 群组放行 / 错误阻断） → `resolveConversationEntry` 与 `ConversationEntryResolution`；错误态行为见 [implementation/05-接口.md](file://.module-experts/前端专题/对话前端专家/sub-experts/会话工作台子专家/imp
  - 加载与空态零件**（助手/群组菜单、账号入口、400ms 加载条、常见问题起始页） → `WorkbenchAssistantMenuComponent`、`WorkbenchAccountComponent`、`WorkbenchLoadingIndicatorComponent`、`injectFrequentQuestionsStartScreen`。
  - 查 Project 双阶段语义**（初始挂载 / 草稿意图 / 运行后持久刷新） → `chatkitMountProjectId`、`chatkitProjectSelection`、`syncConversationProject`、`projectAccess`、`onChatProjectChange`。
- **测试状态**：66 spec = 52 PASS / 10 FAIL（4 环境级缺依赖 + 1 contracts 产物 + 5 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
