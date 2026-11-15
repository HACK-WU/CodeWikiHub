---
groupPath: 决策记录/页面头部
relation: 顶栏 H1 是页面身份唯一出口，页级容器不再补横向 padding
exportedAt: "2026-11-15T13:32:20.534Z"
---
【口径】页面身份只由 AppShell 顶栏 H1 承载（24px），页内不重复页面名。

- 新页面路由必须让 AppShell 的 `currentLabel` 查得到：工作空间页走 `NAV_MAIN`；不在 `NAV_MAIN` 的（如 `/governance/*`）在 `GOVERNANCE_LABELS` 表登记。**禁止对整段路由返回空串把 H1 藏起来**（曾用 `.ki-workspace-title:empty{display:none}` 收起，用户报「这三页怎么没有标题」）。
- 页内头部只留「scope 徽标 + 一句口径说明（计数 / 保留天数 / 当前 Group）」，已写作 `.gov-head` 副标题行，不再写「事件」「回收站」等页面名。
- 横向留白全站统一由 `.ki-content` 的 `8px 16px 16px` 提供；页级容器（`.gov-page`、`.ki-datasource-page`）**禁止再补 padding-left/right**。治理三页曾照搬 demo `.page-body` 的 24px，比其它 tab 右移 8px（2026-11-15 用户报障）。
- **副标题字号 = 12px（`--ki-font-size-sm`）**，与 `.ki-page-head p` 同口径。`.gov-head__path` 原用 14px 正文口径，与 11px 徽标差 3px，同一行「不是一套字号」且比其它 tab 大一档（2026-11-15 用户报障）。徽标同步对齐 `.ki-badge`：`.gov-head__path .gov-badge{min-height:20px;padding:0 7px;font-weight:650}`，**仅限页头**，表格内 `.gov-badge`（分类 / 删除原因）保持紧凑。
- 保留的一处差异：治理页页头徽标是主色系（`gov-badge--kb`），浏览页同位置是灰色 `ki-badge--kb`；用户只要求对齐「徽标右边的文字」，未要求改配色。
- 验证口径：`agent-browser eval` 量 `.gov-page` / `.ki-datasource-page` 的 `getBoundingClientRect().left` 应相等（1440 视口实测均为 212）；字号改动在 7423 常驻实例上**必须 `cd web && npm run build` 重建 dist** 才可见（dev 5173 走 HMR 无需重建）。
- 位置：`web/src/layouts/AppShell.tsx`（`GOVERNANCE_LABELS`）、`web/src/styles/governance.css`（`.gov-page` / `.gov-head` / `.gov-head__path`）。
- 证据：`.debug/governance-page-header-align-20261115/evidence.md`。