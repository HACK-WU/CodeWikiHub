---
groupPath: 决策记录/Agent 演进
relation: 架构设计-门面信号与providerError语义
exportedAt: "2026-10-16T05:00:01.790Z"
---
【决策记录｜架构设计：门面单点聚合与 providerError / error 双失败面语义】
- 分类：架构设计
- 动机：避坑：现象——`/changes` 或 `/changes/records` 失败时若与其余端点共用一个 error 面、且 UI 把失败渲染成空列表；后果——用户把「数据源不可用」读成「已无待办 / 发布为零」，排障时也无法区分「变更源挂了」与「某个治理动作失败了」（C0 坑①②）
- 决策（读面）：所有读聚合收敛到 `AgentEvolutionFacade`（壳 `providers` 提供、一工作台一实例），`load()` 一次 17 路 Promise.all 落成 dashboard + lifecycleRecords + changes + 三个分页对象，并以 `#scopeRevision` / `#loadRevision` 静默丢弃陈旧响应
- 决策（失败面）：`providerError` 仅 «/changes + /changes/records» 失败置位——静默存原文、不 toastr，由 evaluation / release 页以 role="alert" 横幅消费，恢复唯一入口是 Retry → `load()`；其余 15 路端点与全部写操作失败走 `error` + toastr（可命中 EVOLUTION_ERROR_I18N_KEYS）
- 决策（一致性）：分页三兄弟（eventPage / candidatePage / releasePage）与 dashboard 同批赋值；`loadLearningEvents()` 是唯一允许单独推进的路径，但必须同时写 eventPage 与 dashboard.events；`EMPTY_*` 只表「未加载 / 已重置」
- 背景约束：写操作统一经 `withMutation`（失败返回 null 而非抛错）；`refreshChanges()` 半失败即两源都不落库、保留上一快照；4s 轮询跳过 document.hidden 与 facade.loading()；waitForJob 60×1s 是等待窗口而非作业超时
- 被否决方案：无
- 重新评估触发条件：出现「同一条记录在评估页与发布页口径不一致」的线上反馈；或引入后端推送 / SSE 收敛替代 4s 轮询时
- 关联代码：agent-evolution.facade.ts（load / refreshChanges / providerError / EMPTY_PAGE / withMutation）、agent-evolution.component.ts（providers / effect / setInterval）、agent-evolution.types.ts（EMPTY_EVOLUTION_DASHBOARD）
- 证据来源：01-架构.md（关键设计约束 1–10）、C0-使用总览.md（已知坑 ①②③⑥⑦⑫）、agent-evolution.facade.spec.ts（providerError 与作用域切换丢弃响应两例行为断言）