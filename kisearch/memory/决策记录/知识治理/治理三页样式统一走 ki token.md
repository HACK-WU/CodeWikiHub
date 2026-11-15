---
groupPath: 决策记录/知识治理
relation: 治理三页样式统一走 ki token
exportedAt: "2026-11-15T10:24:18.151Z"
---
2026-11-15 定稿：知识治理三页（分类 / 事件 / 回收站）样式一律取自 ki.css 的 `--ki-*` token，`governance.css` 内禁止字面色值。

- 原状：169 处字面色值、0 处 var(--ki-*)；自建 `--gov-accent: #14715b` 偏青，与 demo（#2d6755 暖绿中性）和全站都对不上，深色还要手写第二套 → 漂移根源。
- 规则：颜色 / 圆角 / 间距 / 字号只许 `var(--ki-*)`；半透明底用 `color-mix()` 派生；深色只留 token 表达不了的 2 处（主色实心块字色 #10231b）。
- 形态：三档可见性 = `gov-seg--vis`（灰轨 #f0f2ee + 选中 primary-soft/primary，11px、高 24）；阶段序号 `gov-stage-row__idx` 18px 圆徽标（当前行实心）；阶段线 done 打 ✓；可见性圆点 `gov-vis`（实心 / 半环 / 空心）；表头 bg-secondary + 11px/600；卡片 radius 14。
- 坑 1：全局 `:focus-visible` 2px 主色描边套在白底行内控件上像报错态 → `gov-inline-select` 自定义 focus（主色边框 + primary-soft 环）。
- 坑 2：demo 事件名短，168px 列照搬会把「· 已定位」挤成竖排、行高 45→56 → 徽标截断 + `.gov-days` 不收缩。
- 坑 3（并发改动回收）：governance.css 曾被并行会话追加一批字面色值与 `.gov-vispills` / `.gov-pill` 覆盖，三档被打回「灰底黑字、无轨道」，且 `var(--gov-accent)` 已无定义，导致 `.gov-ev--active` 左条与 `.gov-dot--solid` 静默失效（CSS 变量缺失不报错）。回收口径：三档只认 `gov-seg--vis`，`gov-pill` / `gov-vispills` 一律删除；收尾必 grep `gov-accent`、`gov-pill` 确认无残留。
- 验收：tsc 0 错、build ✓、web 单测 fail 0；真机量到 th #f9faf8、三档轨道 #f0f2ee + 选中 #e8f3ed/#2d6755/11px/24px、卡片 radius 14、当前行徽标 #2d6755 白字。