---
groupPath: 错误库/Web前端界面
relation: ChatPanel 早退后误包 useCallback 导致点开对话整页白屏（复发）
exportedAt: "2026-11-25T09:53:12.183Z"
---
【错误库｜ChatPanel 早退后误包 useCallback，点开 AI 对话整页白屏（React #310；2026-11-25 已修复，第二次复发）】

- 报错原文：Rendered more hooks than during the previous render（生产压缩为 Minified React error #310），栈指向 ChatPanel 的 useCallback。
- 现象：点顶栏「AI 对话」→ 整页空白（#root 子节点 1→0、body 文本 0，连侧栏一起消失）；直接开 /chat（page 变体恒 open）与 /settings/ai 都正常。
- 根因：ChatPanel 在 `if (!open) return null` 早退之后又写了 hook —— b14c1045「对话支持上传图片」（2026-11-24）把 addImages / removePendingImage 包成 useCallback 放在早退之后。关闭态早退跳过它们、打开态执行 ⇒ hook 数量前后不一致，React 直接卸载整棵树。两处必须同批改：第二处会被第一处的崩溃掩盖。
- 解法（已落地，出口 E1）：两处改普通函数（与同文件 handleAddRef / addWholeDoc 同口径，并补 ⚠️ 注释），或把 hook 全部上移到早退之前。全站无 ErrorBoundary 是「白屏而不是报错页」的放大因素，已登记事件 #100。
- 验证方式：dev(5173) 与 7423 dist 点开均崩溃复现（.debug/ai-chat-blank-page-20261125）；改后点开与反复开关均 root=1、panel 380×900、console 全空；npx tsc --noEmit 退出码 0；chat 相关单测 89/89；全量失败均为 EventsPage 并行 WIP 既有红（还原 ChatPanel 后同批仍 10 红）。
- 复发提示：2026-10-09 archive.md 已记同一坑（handleAddRef/handleRemoveRef）。web 单测是源码正则断言、不做渲染，拦不住 hooks 顺序违规，建议加守卫断言：早退行之后不得出现任何 use* 调用。