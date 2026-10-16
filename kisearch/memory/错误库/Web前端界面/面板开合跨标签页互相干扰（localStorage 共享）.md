---
groupPath: 错误库/Web前端界面
relation: 面板开合跨标签页互相干扰（localStorage 共享）
exportedAt: "2026-10-14T08:56:20.869Z"
---
【错误库｜面板开合跨标签页互相干扰（localStorage 共享）】
- 现象：两个标签页都开着 AI 对话面板时，其中一个关掉面板，再去刷新另一个标签页，另一个标签页的面板也被关掉（用户 2026-10-14 报的 bug）。
- 根因：面板开合态写在 localStorage 的 ki.chatOpen（同源跨标签页共享），且只在新页面挂载时读一次；关闭动作写入 0，另一个标签页刷新时读到 0 就不再打开。localStorage 天然无法让两个标签页各持一份。
- 解法：把「这一页在用什么面板」这类状态从 localStorage 搬到本标签页 URL —— 参数 chat：值为 1 表示打开、缺失表示关闭、关闭时移除参数（不写 0）、合并写保留页面其它参数。AppShell 挂载时从 URL 取初值，并加镜像 effect 在站内跳转（导航链接不带参数）后把标记补回当前地址；只改读取端不够，旧存储键的读写函数与调用点要一并删除。个人偏好（面板宽度 ki.chatPanelWidth）仍留 localStorage，因为它不该被分享链接继承。
- 验证方式：同一 browser context 开两个 page（共享 localStorage），A/B 各自开面板后 A 关闭，刷新 B 仍打开 —— temp/verify-chat-open-per-tab.cjs；单测 web/test/chat-open-url.test.mjs；既有回归 temp/verify-chat-panel-persist.cjs 已把断言从 localStorage 改为地址栏参数。
- 关联方案：.solutions/frontend/ui-state-url-vs-localstorage/