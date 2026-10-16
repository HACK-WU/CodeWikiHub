# 探索广场专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/探索广场专家/`
- **入口路由**：`/explore/*`（`canActivate: [authGuard]`）
- **职责**：本域是「**一壳 + 作用域单点 + 四类市场内容**」的结构：壳 `ExploreComponent` 把 `tab`（`skills` / `agent-square`，`connectors` 是伪页签＝跳转）与 `mode`（`square` / `mine`）、`search` 全部映射到 URL query；广场组件再分 `experts` / `applications` / `templates` 三个目录（`catalog` 进 URL）。作用域 `ExploreScopeService` 被壳、广场、应用详情、模板详情共同消费，任何页面都不自行读取 `ScopeServic
- **覆盖目录**：
  - `apps/cloud/src/app/features/explore（31 非 spec / 13 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改入口/页签/搜索**：`/explore` 壳的 tab 合法性 → `explore-route-state.ts` 的 `normalizeExploreTab`；页签切换副作用（连接器跳转、技能广场重置）→ `ExploreComponent.setTab`。
  - 改作用域行为**（新增作用域级别、改切换入口、改 `key` 组成）→ `ExploreScopeService` + `explore-scope-dialog.component.ts`，并复核四个消费页的 `scope.key()` effect。
  - 技能市场列表/分页/热榜/筛选** → `ExploreSkillsComponent`（`getMarketplace`、`PAGE_SIZE=20`、`skillHotScore`）。
  - 技能安装**（装到哪个工作区、无工作区的兜底对话框）→ `install()` / `installToWorkspace()` 与 `ExploreSkillInstallComponent`。
  - 技能分享到组织市场** → `openShareDialog`（仅 `isLocalSkill`）与 `ExploreSkillShareDialogComponent`。
  - 应用详情与初始化**（preflight、模型与工具集选择、`operationId`、`setup=1` 深链）→ `ApplicationDetailComponent` 与 `ApplicationToolsetsComponent`。
- **测试状态**：13 spec = 11 PASS / 1 FAIL（环境级 @xpert-ai/store 缺依赖；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
