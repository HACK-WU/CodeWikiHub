# 对话前端专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/对话前端专家/`
- **入口路由**：`/chat`（收敛至 `/chat/clawxpert`）· 公共页 `/x/*`、`/x-chatkit/*`（无路由守卫）
- **职责**：本域是「**契约化骨架 + 注册式宿主**」的双层结构：页面骨架 `ClawXpertConversationDetailComponent` 只依赖 `WorkbenchChatFacade` 类型与 `WORKBENCH_CHAT_FACADE` token，三种路由形态（`/chat/clawxpert/c[/:threadId]`、`/chat/clawxpert/assistant[/:threadId]`、`/chat/x/:slug[/p/:projectId]/c[/:threadId]`）各自提供一个门面实现；会话 UI 本体由 ChatKit iframe 承载，宿主只负责
- **覆盖目录**：
  - `apps/cloud/src/app/features/chat（99 非 spec）`
  - `apps/cloud/src/app/xpert（42）`
  - `apps/cloud/src/app/features/assistant（22）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改会话与消息**（会话列表/详情、标题内联编辑、归档与置顶）→ `XpertHomeService.conversations`、`ChatConversationsComponent`、`ChatConversationService`。
  - 改流式渲染**（增量正文、Markdown 冻结块、推理折叠、执行树）→ `executeChatRequest` 的分支与 `ai-message` / `thought` / `streaming-markdown`。
  - 新增一种对话形态**（第四种宿主路由）→ 实现一个 `WorkbenchChatFacade` + 一个 `providers` 块，复用 `ClawXpertConversationDetailComponent`。
  - 嵌入助手（ChatKit 宿主）** → `injectHostedAssistantChatkitControl`；需要绑定态组合时用 `injectAssistantChatkitRuntime`。
  - 注册或调整助手** → `ASSISTANT_REGISTRY` 表项 + `getAssistantRegistryItem`；漏注册的直接表现是「入口/标题不出现」。
  - 排查 socket 断线与消息合并** → `ChatWebsocketServer`（401 刷新、2s 重发、ACK）与 `filterLatestMessages`。
- **测试状态**：66 spec = 52 PASS / 10 FAIL（4 环境级缺依赖 + 1 contracts 产物 + 5 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
