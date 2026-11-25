---
groupPath: 错误库/Web前端界面
relation: 事件页带 event 深链进入后切筛选误报「未找到事件」
exportedAt: "2026-11-19T04:43:22.611Z"
---
事件页带 `?event=` 进入后，切任何会排除该事件的筛选都会弹红条「未找到事件 …：它可能已被删除，或不在当前知识库「X」中」；切「未收口」还会把筛选弹回「全部」。事件其实存在。
- 现象: 红条不自动消失（错误提示设计如此），因此常被当成"切换筛选引起的新报错"
- 根因: 深链兜底 effect 依赖 `[entryDeepLink, events, status]`，只做到「值读一次」而没做「判定只做一次」。切「未收口」时 `status==='open'` 分支 `setStatus('all')` → effect 立即以**仍是上一份（未收口）列表**的 `events` 重跑，此刻 `status` 已变 `'all'` → 进告警分支
- 解法: 判定入口先置 `deepLinkWarned = true` 再 `matchDeepLink`（找到也置）；删掉自动放宽筛选的分支；依赖数组去掉 `status`
- 验证: `.debug/events-filter-deeplink-20261119/artifacts/repro.mjs` 三场景（深链=已收口 #46 / 深链=未收口 #47 / 无深链）均无 toast、筛选不弹回；真不存在的 id 仍提示一次；`web/test/governance-events-toolbar.test.mjs` 第 ⑨ 组锁死
- 关联: 决策记录/事件页/列表选中态持久化与状态徽标（坑1）