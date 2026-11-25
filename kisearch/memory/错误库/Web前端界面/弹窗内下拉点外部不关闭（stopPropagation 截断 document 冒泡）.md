---
groupPath: 错误库/Web前端界面
relation: 弹窗内下拉点外部不关闭（stopPropagation 截断 document 冒泡）
exportedAt: "2026-11-23T12:01:56.456Z"
---
弹窗（`.gov-modal` 家族）里的 Group 路径下拉（GroupPathSelect）展开后，点击弹窗内其它区域选项列表不消失；点遮罩会直接关整个弹窗。已于 2026-11-23 双向根治（组件侧捕获阶段 + 弹窗侧改 target===currentTarget）。
- 现象：展开下拉 → 点弹窗标题 / body 空白 → `.ki-combobox__panel--open` 仍在；`/import` 页同一组件点外部正常
- 证据：document 捕获阶段 click 计数 1、冒泡阶段计数 0（playwright 注入探针实测）
- 根因：GroupPathSelect 把「点外部关闭」挂在 document **冒泡**阶段 click；React 18 事件委托在 `#root` 上，弹窗内容区 `onClick={(e) => e.stopPropagation()}` 调用的是原生 stopPropagation，原生 click 被截在 root，永远到不了 document → 监听不触发。组件把「点外部」建立在「祖先不阻断冒泡」这个可被撤销的假设上
- 解法一（组件侧）：document 监听改**捕获阶段**（`addEventListener('click', onDocClick, true)`，移除同步带 true）。document 是链上最顶层，祖先 stopPropagation 拦不住。影响面 5 个使用方（ImportPage / WritePage / DatasourceMappingsEditor / DocMoveDialog / EventsPage）
- 解法二（弹窗侧，事件 #85 已收敛）：11 处 `.gov-modal` 去掉内容区 stopPropagation，改为遮罩自身判断 `onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`，与 DocMoveDialog / DatasourceEditDialog 既有写法统一；document/window 冒泡阶段的全局监听（下拉、浮层、埋点、快捷键）在弹窗内恢复
- 验证方式：playwright 走查 —— 组件侧 19 项（弹窗内点标题/正文 → panel 1→0、点树节点收起并写值、toggle、点遮罩关窗、/import 与「移动」弹窗对照）；弹窗侧 20 项覆盖 9 个弹窗（流转/新建事件/选文档/上传参考文档/新建分类/编辑分类/回收站设置/追加阶段/新建类型），含**嵌套弹窗**（点内层遮罩只关内层、点内层内容区两层都不关）与 document 冒泡计数恢复断言；web tsc 0 / build ✓ / 全量单测无新增失败
- 位置：`web/src/components/GroupPathSelect.tsx`、`web/src/pages/EventsPage.tsx`、`web/src/pages/LifecyclePage.tsx`、`web/src/pages/TrashPage.tsx`、`web/src/components/governance/*.tsx`
- 回归护栏：`web/test/event-ref-upload-ui.test.mjs` ⑪（遮罩自身判断 + 捕获阶段）、`web/test/event-source-analysis.test.mjs`（重置确认弹窗的同一判断）