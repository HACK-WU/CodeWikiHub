---
groupPath: 错误库/Web前端界面
relation: inline-flex 分段控件在 grid 与 flex 父容器中被拉伸成全宽（已复发三次）
exportedAt: "2026-11-16T04:16:25.829Z"
---
ki 前端的 `.ki-segmented`（以及由它派生的页级 tab、配置分段）是 `display:inline-flex`，但**只有当父级是普通块级流时才会收缩到内容宽**。一旦父级是 grid 或 flex 列，子项默认 `stretch`（grid 的 `justify-self` / flex 的 `align-items`），控件会被拉成整页宽的空壳：右侧一大片空白 + 一整圈边框，观感像坏掉的容器。

已复发的三处：
1. 对话配置模态框 `.ki-chat-cfg__seg`（flex column 的 modal-body 内）→ 修 `align-self: flex-start`；
2. 页级 tab 条 `.ki-page-tabs`（父 `.ki-content-inner` 是 `display:grid`、单列 1fr）→ 修 `justify-self: start` + `width: fit-content`；
3. 同一控件的窄屏分支反过来需要拉满 → 在 media query 里显式 `justify-self: stretch; width: 100%`。

判据与写法：
- 新加一个 inline-flex 控件到 grid/flex 容器里，先设 **`width: fit-content`**（对两种父级都稳），再按需补 `justify-self: start`（grid）/ `align-self: flex-start`（flex）；
- 只想局部生效时**别改全局 `.ki-segmented`**，在派生类（如 `.ki-page-tabs`）上收敛，避免动到其它页面的分段控件；
- 窄屏若要铺满，就在同一个 media query 里覆盖回 `stretch`/`100%`，否则两套规则打架。

自检：视觉类改动必须真机量一次宽度（`getBoundingClientRect`），只读 CSS 看不出来 —— 本次就是用户截图先发现、再定位到 grid stretch。