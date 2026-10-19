---
groupPath: 错误库/Web前端界面
relation: AI 面板拖拽调宽一卡一卡（消息流每帧重排）
exportedAt: "2026-10-16T12:16:38.719Z"
---
【错误库｜AI 面板拖拽调宽一卡一卡（消息流每帧重排）】
- 报错原文片段：无控制台报错（性能缺陷）。用户口径原话「拖动AI对话框宽度时，一卡一卡的一点也不流畅」。可量测特征：拖拽 30 步中帧距中位数 30~33ms、掉帧（帧距>25ms）29/35 帧 ≈ 27fps；修复后 p50 16.6~22ms、掉帧 1~4/33。
- 现象：AI 对话面板左边缘拖拽调宽时明显卡顿、掉帧。现场：dock 并排态、28 条消息的真实会话、阅读区 1613 个正文节点、视口 1600、面板 380 拖到 500。
- 根因：面板每变一次宽，**整个消息流都要重新折行**（28 条消息、总高约 48800px、可视区只占 663px）≈9ms/帧，叠加阅读区重排重绘 ≈12ms/帧，超出 16.7ms 的单帧预算 ⇒ 每帧吃掉两个 vsync。React script 只占约 2ms/帧。**被实测证伪的假设**：最初怀疑「每帧同步写 localStorage（chatPanelPrefs.writeChatPanelWidth）」是主因，A/B 对照（把 Storage.prototype.setItem 打成空实现）后差值 −1.5ms，与噪声同量级 ⇒ 不成立，写盘不是元凶。另一条被否：拖拽期给消息加 content-visibility:auto（掉帧 9/33，且会改变屏外消息的估算高度、影响滚动位置）。
- 解法：拖拽期间**冻结消息流宽度** —— pointerdown 时把当前实测宽度写进面板元素上的 CSS 变量 --ki-chat-frozen-w，一条规则 `.ki-chat-panel[data-resizing="true"] .ki-chat-panel__body { width: var(--ki-chat-frozen-w, auto) }` 让消息内容在拖拽中不折行（面板边框照常跟随手指，视觉无突兀）；pointerup/pointercancel 与「手柄被卸载」的兑底 effect 三处都要 removeProperty 清除，否则冻结宽度残留。拖拽中面板拖窄时冻结宽度会溢出到面板右侧，靠既有 `.ki-shell { overflow: hidden }` 裁掉，松手即恢复，不产生横向滚动条。键盘调宽与双击复位不设该变量，不受影响。
- 验证方式：temp/verify-chat-drag-smooth.cjs 7/7（掉帧均值 ≤8、p50 ≤25ms、拖拽中消息流宽度未变、松手后冻结变量已清除、松手后消息流跟上新宽度、拖拽未松手期间滚动位置不漂移）；既有 temp/verify-chat-panel-persist.cjs 全部通过（A1~A11 拖拽/键盘/双击/钳制/窄屏收尾，含 380→480 实时改宽）；temp/verify-chat-layout-prefs.cjs 42/42；web 单测 384/384；tsc 与 build exit 0。⚠️ **测量方法学坑（首版探针结论全部作废）**：拖到宽度上限后 clampChatPanelWidth 恒等 ⇒ React bail-out ⇒ 零重排，量到的是“空拖拽”，指纹是 CDP 指标里 LayoutDuration ≈ 0；必须每轮先双击手柄复位宽度，并交替跑基线（基线三次漂移应 <2ms，首版实测漂移 −16.5ms / 是假基线）。
- 关联方案：无