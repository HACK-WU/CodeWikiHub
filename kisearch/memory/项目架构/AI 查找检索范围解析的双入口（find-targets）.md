---
groupPath: 项目架构
relation: AI 查找检索范围解析的双入口（find-targets）
exportedAt: "2026-11-18T08:09:33.357Z"
---
检索范围解析收敛在 `src/lib/events/find-targets.ts` 一个文件、两个入口，判定逻辑只有一份（2026-11-18 抽 `resolveScopeSet` 时确立，供「AI 查找」与 `ki_recall` 共用）。

- 入口一 `resolveFindTargets(eventScope, cfg, deps)`：「AI 查找」用。事件库恒在首位且**由调用方单独鉴权**（事件库无权 → 403），配置里的 `find.ranges.extraScopes` 逐个判定。
- 入口二 `resolveScopeSet(bases, extras, deps)`：通用形态。`bases` 视为**已鉴权**原样纳入只去重；`extras` 逐个判定（missing / view-members-changed / forbidden → 进 `skipped` 且不抛错）。
- 关键行为：`extras` 为空时**提前返回**，不读 views.json、不列 scope —— 热路径与保存期预检（`chat-routes.ts` 用 `resolveFindTargets('')` 只取 `skipped`）都依赖这一点。
- 视图口径「全有或全无」复用 `isScopeAccessAllowed`（`src/lib/scope-access.ts`），**不要另写一份判定**，否则会漂移成越权口子；views.json 读不出来时不能当「没有视图」放行。
- 位置：`src/lib/events/find-targets.ts`；回归 `test/refs-multi-scope.test.ts`（③ 范围解析 3 例）。