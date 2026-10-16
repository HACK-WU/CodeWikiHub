---
groupPath: 错误库/Web前端界面
relation: 生成中切换标签页打断AI回答（挂载即abort）
exportedAt: "2026-10-14T04:54:03.860Z"
---
【错误库｜生成中切换标签页打断 AI 回答（挂载即 abort）】2026-10-14

- 报错原文片段：无控制台报错。用户口径原话「当AI正在输出结果，或者正在执行mcp工具时……这时候我切换了tab，调到了其他的内容，比如语言检索时。AI的生成内容就被打断了」。可量测特征：切换页面后回到「AI 对话」，回答停在半截并出现「已中止」徽标；mock 上游侧可观测到连接被提前 close（chunks=6/24）。
- 现象：流式生成（含 MCP 工具轮次）期间切换标签页/路由，回答被中断 —— 精确结论是「切走不打断，点开或切回「AI 对话」tab 时立刻被 abort」。
- 根因：web/src/chat/ChatPanel.tsx:276 的 useLayoutEffect（依赖 [scope, store, stream]）把「组件挂载」当成「切 scope」，无条件执行 stream.abort() + dispatch setActiveConv(null)。/chat 是 variant="page" 独立页，每次从其它 tab 进入都重新挂载（dock 变体常驻，不受影响）；abort 掐断的是模块级单例 ctrl（useChatStream 的 activeCtrlBox，:62-74），跨实例全局生效。另一半同样致命：setActiveConv(null) 把 store.streaming 重置为初值（chatStore.ts:271-286），isCurrent() 的 store 令牌失配 → 消费循环 break 并 reader.cancel()（chatApi.ts:308）⇒ 只删 abort 不删 setActiveConv 仍会打断。该行为与 useChatStream.ts:100-111「组件卸载不中止流」/ ChatPage.tsx:6 注释的 N2「切路由不断流」设计口径直接相反，属回归缺陷。
- 解法：新增 scopeInitRef（null = 未挂载过），仅当 scopeInitRef.current !== null && scopeInitRef.current !== scope（真正的切 scope）才 abort + 清 activeConv；首次挂载保留全局态（activeConvId / streaming 不被清）。同时在 AppShell 用 useSyncExternalStore 订阅 streaming.active，给导航项「AI 对话」加脉冲点提示（跨页面可见、生成结束自动消失）。
- 验证方式：隔离实例 + mock 慢速上游 + web/dist（不碰 7423）。修复前 temp/repro-chat-tab-switch{,-dock}.cjs 实测「点 AI 对话」1.5s 内 1 次 abort + mock client-abort@chunks=6；修复后 temp/verify-chat-tab-switch-keepalive.cjs 26/26（A 段切到 /chat 内容继续推进至【END】、B 段切走再切回 0 次 abort、C 段停止按钮与切 scope 仍中止、E1 切 scope 不残留、F1/F2 刷新深链仍打开原会话）；相邻回归 verify-chat-panel-persist / verify-context-limit-config 全绿；web 单测 222/222。
- 关联方案：.solutions/frontend/global-stream-abort-on-remount/（含运行时取证方法、修复模式与防过度修复清单）