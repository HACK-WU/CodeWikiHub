---
groupPath: 项目架构
relation: AI对话流的中止时机契约（挂载≠切scope）
exportedAt: "2026-10-14T04:43:53.324Z"
---
【前端｜AI 对话流的中止时机契约（挂载 ≠ 切 scope）】2026-10-14 修复后登记。

## 契约：谁有权中止全局流
useChatStream 的 AbortController 是**模块级单例**（activeCtrlBox，web/src/chat/useChatStream.ts:62-74）—— dock 与 page 两个 ChatPanel 实例的 abort() 都能掐断「当前流」。因此任何重置动作必须按语义精确触发：

| 时机 | 是否 abort | 位置 |
| --- | --- | --- |
| 首次挂载 / 从其它 tab 回到 /chat | **否**（2026-10-14 修复点） | ChatPanel.tsx:291-307（scopeInitRef 分支） |
| 切 scope（含切回原 scope） | 是 | 同上 |
| 切会话 / 新建会话 / 删除当前会话 | 是 | ChatPanel.tsx:331 / :378,:386 / :1135 |
| dock 列表对齐（mount 或切 scope） | 是 | ChatPanel.tsx:691-694 |
| 用户点「停止」 | 是 | ChatPanel.tsx:1042 |
| 新流取代旧流 | 是 | useChatStream.ts:255-259 |
| 组件卸载（切路由） | **否**（N2 切路由不断流） | useChatStream.ts:100-111 |

## 关键坑（改这块必看）
- **abort 与 setActiveConv(null) 必须同进同退**：后者把 store.streaming 重置为初值（chatStore.ts:271-286），isCurrent() 的 store 令牌失配会让消费循环 break 并 cancel 连接 —— 只删 abort 仍会「静默打断」。
- page 变体每次进 /chat 都重新挂载 ⇒ 「挂载即重置」在 page 上等价于「每次点开 AI 对话都杀流」；dock 变体常驻，所以缺陷只在 page 上暴露。
- 导航链接 to="/chat" 不带 convId ⇒ 从 dock 切到 /chat 不会用陈旧 URL 深链抢走当前会话（temp/probe-tab-switch-adjacent.cjs 实测「未打断」）。
- 进入 /chat 仍会 setRefs([]) 清空引用（既有行为，遗留观察点）。

## 可见性（用户需求 2）
AppShell 订阅 streaming.active（useSyncExternalStore，只订阅布尔 ⇒ 不随每个 chunk 重渲染）→ .ki-nav-item__busy 脉冲点（挂在 .ki-nav-item__icon 上 ⇒ 窄轨收起态可见）+ title="AI 正在生成回答"。

## 相关文件
- web/src/chat/ChatPanel.tsx（scopeInitRef / 全部 abort 点）
- web/src/chat/useChatStream.ts（模块级 ctrl、seq 令牌、卸载语义）
- web/src/layouts/AppShell.tsx（chatStreaming 订阅 + NavLink 提示点）
- web/src/styles/ki.css（.ki-nav-item__busy / @keyframes ki-nav-busy / prefers-reduced-motion 降级）

## 验证锚点
- temp/verify-chat-tab-switch-keepalive.cjs（26 项：A 切到 /chat 不打断 · B 切走切回不打断 · C 停止与切 scope 仍中止 · E 切 scope 不残留 · F 刷新深链）
- 复现证据：temp/repro-chat-tab-switch.cjs、temp/repro-chat-tab-switch-dock.cjs
- 提示点视觉：temp/shots/nav-busy-{expanded,narrow,page}.png

⚠️ 纯前端改动 ⇒ 刷新页面即生效，不需要重启 daemon。