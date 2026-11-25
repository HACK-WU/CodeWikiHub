---
groupPath: 错误库/Web前端界面
relation: 配置层入场动画的transform让浮层被后续卡片盖住
exportedAt: "2026-11-16T06:25:24.564Z"
---
配置层（PromptConfigLayer）里打开的选择器浮层只剩 1 行可见，其余被下面的卡片盖住；根因是入场动画 `animation: ki-cfg-in .26s ease both` 用 `both` 填充，浏览器把末帧 `transform: none` 保留成 `matrix(1,0,0,1,0,0)`，于是 `.ki-chat-cfg__field` 意外成为层叠上下文 + fixed 包含块。
- 现象: AI 设置 → AI 分析，点「搜索并选择 scope」候选面板从 200px 被压到只剩首行可见，`elementFromPoint` 在面板中点命中的却是后面卡片的 `.ki-chat-cfg__item-prev`。
- 判据: `getComputedStyle(.ki-chat-cfg__field).transform` 返回 `matrix(1, 0, 0, 1, 0, 0)` 而不是 `none`，即动画留下了非 none 的 transform。
- 修法: fill-mode 改 `backwards`（只在 delay 期间套用起始帧，结束即回默认样式）；不要用 `translateY(0)` 之类替代，仍是矩阵。
- 位置: `web/src/styles/ki.css` 的 `.ki-chat-cfg[data-open="true"] .ki-chat-cfg__head/__field`。
- 边界: 同类坑 —— 任何祖先带 transform/filter/will-change 都会让子孙的 `position: fixed` 以它为参照并被层叠上下文关住；此前的「确认浮层被 .ki-drawer 盖住」是同一族问题。