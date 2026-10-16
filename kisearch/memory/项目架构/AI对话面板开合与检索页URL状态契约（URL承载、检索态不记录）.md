---
groupPath: 项目架构
relation: AI对话面板开合与检索页URL状态契约（URL承载、检索态不记录）
exportedAt: "2026-10-14T08:53:48.625Z"
---
【项目架构｜AI对话面板开合与检索页URL状态契约（URL承载、检索态不记录）】
- 面板开合（2026-10-14 用户裁决）：跨刷新载体是本标签页 URL 的 chat=1，不再用 localStorage —— 后者同源跨标签页共享，会让一个标签页的关闭连带关掉另一个标签页（见错误库 Web前端界面条目）。判据纯函数在 web/src/lib/chatOpenUrl.ts（chatOpenFromSearch / withChatOpenParam：只有 1 为开、关闭移除参数、合并写保留页面参数）。store 仍是渲染来源（D15 关闭不卸载、不丢对话态），AppShell 负责镜像：挂载取 URL 初值 + effect 在站内跳转后把标记补回当前地址；/chat 上镜像的是「进入前的意图」（Q4/Q5 路由派生不写意图）。宽度偏好仍走 localStorage（web/src/lib/chatPanelPrefs.ts），个人偏好不该被分享链接继承。
- 检索页（2026-10-14 用户裁决）：语义检索页不再用 URL 记录检索态 —— 输入框清空后地址栏不留 q，刷新重置为干净页面，复用上次查询走「最近检索」（localStorage 按 scope 分桶）。旧链接参数（q/mode/tags/threshold/limit）由 web/src/lib/searchUrlCleanup.ts::cleanSearchUrl 在进页时清掉且不触发检索；scope 跨页深链（导入页等入口）保留。
- 护栏：任何页面级 URL 写入都要考虑与本页无关的参数 —— BrowsePage 用 browseUrl.browseLinkKey()（剔除 chat）做目标变化判定；SearchPage 的清理只删旧检索参数与失效 scope，不动其它参数。
- 涉及文件：web/src/lib/chatOpenUrl.ts、web/src/lib/searchUrlCleanup.ts、web/src/lib/chatPanelPrefs.ts、web/src/lib/browseUrl.ts、web/src/layouts/AppShell.tsx、web/src/chat/chatStoreContext.ts、web/src/pages/SearchPage.tsx、web/src/pages/BrowsePage.tsx
- 相关测试：web/test/chat-open-url.test.mjs、web/test/search-url-cleanup.test.mjs、web/test/browse-url.test.mjs、web/test/chat-panel-prefs.test.mjs