---
groupPath: 项目架构
relation: 写入页与导入页合并为单一入口（AppShell 常驻双面板）
exportedAt: "2026-11-16T04:12:20.436Z"
---
侧栏「上传导入 / 知识写入」两项合并为一个入口「知识写入」，`/import` 与 `/write` 是同一页面的两个 tab（tab 由 URL 决定，不用 `?tab=`），H1 恒为「知识写入」。

- 承载：两个面板都在 AppShell 常驻、`display` 切换；**不能改由 `routes.tsx` 的 Outlet 渲染** —— 路由一离开组件就卸载，在途导入的轮询会中断（改造前 `ImportPage` 就是 AppShell 级无条件挂载）。`WritePage` 改为「首次进入后常驻」（懒挂载），避免无人使用时付 `useVectorAvailability` 等查询开销。`routes.tsx` 两条路径都只做能力门禁（`{null}`）。
- 判据集中在 `web/src/lib/writeTabs.ts`：`writeTabFromPath` / `isMergedWritePath` / `navItemActive`（支持 `also` 扩展路径、按分段边界匹配，`/imports` 不会点亮 `/import`）/ `shouldCleanupOnMergedEntry`（只在从别处回到合并页时清，tab 之间切不清）/ `shouldReconfirmScopeOnImportReturn`（仅 idle/done/failed/cancelled 时重确认目标）/ `tabBadgeVisible`（仅在导入 tab 未激活且忙时显示进度徽标）。
- 进度徽标：`web/src/lib/importProgress.ts` 是单向快照 store（`useSyncExternalStore`，同 theme.ts / codeLangPreference.ts 形态），ImportPage 发布 phase/percent/scope，写入页一侧的 tab 条订阅。
- 页面级 tab 复用 `.ki-segmented` + `aria-selected` 选中态（与「资源」页 `.res-tabs` 同口径），样式 `.ki-page-tabs` 在 ki.css，未新增 token。
- 写入页补了「每次进入写入 tab 重新确认目标 Scope」：该页改为常驻后不再随卸载清空，不补会出现「上次确认过的库 + 残留草稿」被一路保存写进错库。
- 验证：`web/test/write-merge-tabs.test.mjs` 18 例锁定上述判据；真机走查 24 项。需求 REQ-20261116-002。