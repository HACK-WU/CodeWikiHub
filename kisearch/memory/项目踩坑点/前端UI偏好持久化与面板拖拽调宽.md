---
groupPath: 项目踩坑点
relation: 前端UI偏好持久化与面板拖拽调宽
exportedAt: "2026-10-13T10:09:48.784Z"
---
【前端｜UI 偏好持久化与面板拖拽调宽】2026-10-13 实现（未提交）。用户反馈 ①「AI 对话侧边栏希望可拖拽调宽」②「全屏开启 AI 对话后刷新页面，面板被关闭」。

## 根因（②）
面板开合态 `chatStore.open` 只存内存（`web/src/chat/chatStore.ts` 初始 `open:false`），刷新回落到初值 ⇒ `ChatPanel` 的 `if (!open) return null`；而同场景的「全屏阅读」早已由 URL 的 `reader=1` 持久化（`web/src/lib/browseUrl.ts`）⇒ 出现「全屏还在、AI 面板消失」的不对称。

## 实现与关键约定
- 新增 `web/src/lib/chatPanelPrefs.ts`：宽度/开合偏好 ⇄ localStorage（键 `ki.chatPanelWidth` / `ki.chatOpen`），读写全程 try/catch，坏值回默认；宽度钳制 `320 ~ min(720, 视口×50%)`。
- 面板宽度**三层口径**：`panelWidthPref`（用户偏好，持久化）→ `panelDisplayWidth`（按当前视口收敛；窗口变窄**只压缩显示、不回写偏好**）→ CSS 变量 `--ki-chat-dock-w` 写到 `.ki-shell`（**面板宽度与全屏阅读器让位宽度的唯一真相**，原先 380px 在 ki.css 两处硬编码）。
- 开合持久化只记**用户意图**（顶栏开关 / 全屏工具栏 / 面板关闭钮）；**路由派生不写**（AppShell 进 `/chat` 自动收起、离开恢复先态传 `{persist:false}`）——否则一次刷新就把派生状态写成用户意图。
- 拖拽手柄 `.ki-chat-panel__resize`：面板左边缘 6px、`z-index 1`（低于会话浮层 20，浮层 left 8px 不挡住它），pointer capture + 方向键 ±16（Shift ±48）+ 双击复位；拖拽期 `body.ki-resizing`（全局 col-resize + 禁选）。窄屏浮层（<1400px）**不渲染手柄**（宽度不参与布局）。
- 顺带：`sidebarHidden`（左侧导航收起态，`AppShell.tsx`）同类缺口一并持久化（键 `ki.sidebarHidden`）。

## 踩坑
1. `Number('')` 与 `Number([])` 均为 **0** —— 直接用它解析存储值会把空白脏值当成「合法但极小」钳到下限 320，而不是回默认；必须显式判定（本项目 `parseWidth`）。
2. 验证脚本若硬编码「让位 = 视口 − 380」，用户拖过宽度后会**误报**（`temp/verify-fullscreen-chat-coexist.cjs` 已改为读计算值 `--ki-chat-dock-w`）；同脚本的「面板打开时隐藏全屏导航」断言也与 2026-10 产品决策（保留导航）矛盾，属过期断言。

## 验证
`tsc` 0 错；web 单测 **175/175**；`temp/verify-chat-panel-persist.cjs`（A–H 八组 40 项）在 5173 与 7423（用户实际界面）**各全绿**（含用户报的 Bug：全屏+面板+宽度刷新后同时恢复、阅读器让位 = 视口 − 面板宽）。