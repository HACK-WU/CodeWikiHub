---
groupPath: 决策记录
relation: AI分析目标目录配置
exportedAt: "2026-11-16T07:46:22.929Z"
---
「AI 设置 → AI 分析」与事件分析弹窗的最终形态：目录块「默认目录显式保存 + 映射行即改即存」，分析运行中可「停止」。
- 目录配置: 默认目录持草稿点「保存」/「清除」；映射行即时落盘（选完 scope 且路径合法 / 路径失焦 / 点 × 删行）、新增行填完点「确认」；行内校验失败只提示不落盘。
- scope 选择: 复用 `ScopeMultiPicker` 的 `single` 模式，**已选值回显在输入框里**（不再渲染上方 chips，行高 60→32px）。
- 数据源不参与: 数据源 = 知识从哪来，分析目标目录 = 代码在哪，两个概念。无「填入数据源」按钮、选 scope 不自动填路径、候选徽标只留「只读」。
- 手动停止（2026-11-16）: `POST /api/governance/events/:id/analysis/cancel` → 只置 `activeRuns[key].canceledByUser = true` + `controller.abort()`，幂等（未运行返回 canceled:false）；**终态由后台任务落盘**（不在这里改 .analysis.json，避开与收尾写盘打架）。
- 状态模型: `AnalysisRunStatus` 新增 `cancelled`（内部 types + 对外 governance-contract + web 契约镜像三处同步）；有候选落 `partial`，无候选落 `cancelled` + `ANALYSIS_CANCELED`。**不复用 failed**：failed 会把前端引向「去改配置」，而主动停止什么都没配错。
- 实现要点: 超时与用户停止共用一个 AbortController，靠 `activeRuns` 上的标记区分；收尾前还要再读一次标记（用户在“最后一轮已返回、正要写盘”的几百毫秒里点停止时 abort 打不到 stream，否则会被误判成 `NO_RESULT failed`）。
- 落点: `src/lib/events/analysis-runner.ts`（cancelEventAnalysis / canceledByUser）、`src/lib/events/types.ts`、`src/lib/governance-contract.ts`、`src/lib/governance-http.ts`（analysis/cancel 路由）、`src/lib/auth/route-permissions.ts`、`web/src/api/governanceApi.ts`、`web/src/components/governance/AiAnalyzeModal.tsx`（危险幽灵样式的「停止」+ 停止中防连点）、`web/src/pages/EventsPage.tsx`（徽标「分析已停止 · 查看」）。
- 验证: 后端 analysis-runner 4/4（含“运行中 cancel → cancelled、幂等、停止后不再发起上游调用”）、web 1237/1237、两端 tsc 0、build ✓；真机：running 底栏 `[停止][后台继续]` → 点停止 1s 内落 cancelled、tokens 0、标题「分析已停止」。