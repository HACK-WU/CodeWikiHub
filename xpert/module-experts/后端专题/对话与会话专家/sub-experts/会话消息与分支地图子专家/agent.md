# 会话消息与分支地图子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（对话与会话专家）
- **资产路径**：`.module-experts/后端专题/对话与会话专家/sub-experts/会话消息与分支地图子专家/`
- **职责**：本子专家是**对话账本的主体**：会话/线程/目标/读状态与消息的持久化与授权、消息反馈、分支（写模型）、脉络地图（只读视图）、线程运行控制（pause/resume/租约）、`/api/chat` 主聊天流与语音入口、会话摘要任务。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/chat-conversation（含 branch/map/goal）`
  - `server-ai/src/chat-message`
  - `server-ai/src/chat-message-feedback`
  - `server-ai/src/chat`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 需要新建/更新/删除会话、按 `threadId` 反查会话、读会话详情与工作台导航/侧边栏：找本子专家。
  - 需要写一条消息，或授权读取一条消息（含建议问题、任务摘要、文件变更统计投影）：找本子专家。
  - 需要从未锚定的历史点分叉出新会话（保留检查点与文件链接）：找分支能力。
  - 需要脉络地图（话题视图、项目下拉、在地图上创建/改名/侧聊/分支/定位）：找地图能力。
  - 需要线程运行控制（pause/resume/线程态、租约与过期 run 回收）或取消一次会话：找本子专家。
  - 需要消息反馈的授权 CRUD 与摘要联动、语音合成与转写：找本子专家。
- **测试状态**：1. **地图 provider 契约缺端到端**：`conversation-map.module.spec.ts` 只验证模块边界与 CQRS 装配，没有断言 `AGENT_WORKBENCH_SLOT` 下清单字段（`order`/`activation.requiredFeatures`/`view.entry`）与 `getRemoteComponentEntry` 的真实产物读取。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
