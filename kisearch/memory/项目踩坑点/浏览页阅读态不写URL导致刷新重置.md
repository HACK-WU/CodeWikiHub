---
groupPath: 项目踩坑点
relation: 浏览页阅读态不写URL导致刷新重置
exportedAt: "2026-10-13T03:12:20.752Z"
---
【前端｜知识库浏览页刷新重置】2026-10-13 修复（未提交）。

- 现象：/browse 点击不同文档后刷新，重置为默认第一篇；全屏阅读同样（刷新后丢全屏）。用户截图反馈。
- 根因：深链接只实现了单向「URL → 页面」—— 读取侧完整（web/src/pages/BrowsePage.tsx 的 directTarget effect + web/src/lib/kiLinks.ts::deepLink 定义 `/browse?scope=&group=&relation=[&anchor=]`），**写入侧从未实现**（此前全站无 setSearchParams 调用）；viewing / readerFullscreen 都是组件内 state，刷新即清零。

修复（3 处）：
1. 新增 web/src/lib/browseUrl.ts：`browseSearch(view, fullscreen)` / `browseFullscreenFromSearch(search)`，契约与 deepLink 对齐，`reader=1` 标记全屏阅读。
2. BrowsePage 新增 `writeBrowseUrl`：`{replace:true}`（不产生浏览器历史，文档导航仍由阅读器「上一级/下一级」承担）；写入前与 `currentSearchRef` 比较保证幂等；写入时同步 `appliedDirectTarget.current`，让深链接 effect 早退、不重复应用同一目标。接线 6 个写入点：openDocument / goBack / goForward / handleLocalLink / closeDocument / onFullscreenChange；深链接应用时恢复 `reader=1`。
3. 切换 scope 时清掉「上一个 scope 的文档参数」（判据 `searchParams.get('scope') !== scope`），否则刷新会被旧深链接拉回旧 scope。

相邻修复（同源）：刷新 / 深链接恢复未置 `autoOpenRef` ⇒ 用户关闭文档后又被 autoOpen 抢回第一篇（与该标记「主动关闭后不再抢回焦点」的设计意图相悖）；改为深链接 effect 置位 + 重置 effect 在「URL 带完整文档目标」时跳过（依赖只取 scope —— 加 searchParams 会在关闭文档清空 URL 时误重置）。

验证：新增 web/test/browse-url.test.mjs 8/8；web 全量 111/111；tsc 0 错；vite build 通过；真实页面 temp/verify-browse-refresh-persist.cjs 18/18（A 刷新保持 / A3 幂等 / B 全屏保持 / C 退出全屏移除 reader / D 关闭清参数且不被抢回 / E 切 scope 不被拉回 / F 同 scope 深链接 / G 跨 scope 深链接 / H 浏览入口参数不被误清），连跑 3 次稳定。

── 第二轮：同源扩展（2026-10-13 同日，用户拍板「按照你的建议进行修复」）──

① 浏览页左树状态持久化（节点展开/折叠、选中 Group、左列收起）
- 新增 web/src/lib/browseTreeState.ts：按 scope 分桶存 localStorage（key `ki.browseTree:<scope>`）；`openPaths: null` = 从未保存（区别于「全部折叠」）；展开路径截断 MAX_OPEN_PATHS=500；读写 try/catch 降级。
- web/src/lib/groupTree.ts 补纯函数 collectOpenPaths / applyOpenPaths（遵守既有「无变更返回原引用」约定）。
- BrowsePage 接线：惰性初值读取、树重建时套用 openPaths、变化即写回（仅当 `data?.scope === scope`，防切 scope 过渡帧把旧布局写到新 scope）。
- **冲突修复 A**：深链接分支原本 `setTreeCollapsed(false)` + `setActiveGroup(文档组)`，刷新时（URL 是页面自己写的）会把本地目录布局覆盖 ⇒ browseUrl.ts 增 sessionStorage「本页自写」标记（markBrowseUrlSelfWritten / isBrowseUrlSelfWritten，用 sessionStorage 使「新标签页打开链接」自然落到外部深链接一侧）；自写=刷新恢复 → 保持本地布局；外部深链接 / 新标签页（sessionStorage 空）→ 仍展开左列并按 URL 定位。
- **冲突修复 B**：`revealGroupPath + toggleNodeOpen(activeGroup)` 的 effect 在任何重渲染（数据刷新、布局变化）都会把用户手动折叠的当前选中目录抢回展开 ⇒ 加 revealedActiveGroupRef 早退（只有选中项真正变化才动树；切 scope 时同步为恢复值）。

② 检索页检索态 URL 化（刷新保留结果）
- 新增 web/src/lib/searchUrl.ts：参数 q / mode / tags / threshold / limit；默认值（hybrid、threshold=0、limit=10、空 tags）省略；无 q → null（非检索态）；scope 属于跨页深链参数、写入时保留。
- SearchPage：提交检索时 writeSearchUrl（replace + 幂等比较）；带 q 进入时按同参数自动重跑（urlRestoreAppliedRef 门闩；跨 scope 深链先等 scope 切换落地）；切 scope 清理判据 = `searchParams.get('scope') !== scope`（本页自写 URL 不带 scope，旧的「存在即清」判据会漏清）。
- 注意：刷新自动重跑会消耗一次 embedding（这是「保留结果」的必然代价）。

③ 验证与脚本踩坑
- 新增 web/test/browse-tree-state.test.mjs（8 例）、web/test/search-url.test.mjs（8 例）、browse-url.test.mjs 补 self-written 标记 2 例；web 全量 136/136；tsc 0 错；vite build 通过。
- 真实页面：temp/verify-browse-tree-persist.cjs 17/17、temp/verify-search-url-persist.cjs 12/12、temp/verify-browse-refresh-persist.cjs 18/18（连跑 9 次 8 次全过，1 次单点失败未复现）。
- **测试脚本踩坑**：验证脚本初始化不能用 page.reload() —— reload 会带上页写入的 `?scope=&group=&relation`，深链接逻辑把 scope 改回参数里的值，导致后续断言全部落空；必须用 goto 干净 URL 重新加载。