---
groupPath: 决策记录
relation: AI对话引用抽屉化与整篇文档引用（PM需求结论）
exportedAt: "2026-11-20T10:18:56.742Z"
---
AI 对话「引用整篇文档」已实施（2026-11-20，未提交）；抽屉化（REQ-01）按用户拍板不做。
- 入口两条: ① 选择器（ReaderLinkComposer mode=ref）底部「引用整篇」（无选区也可点）；② 面板 refbar「+ 整篇」——**必须有**，因为「+ 加入引用」在有打开的文档（.ki-drawer）时只进入划选态，根本到不了选择器，否则最常见场景不可达。无打开文档时「+ 整篇」退回选择器。
- 契约: ChatRef 新增可选 `kind?: 'doc'` 与 `totalChars?`（web/src/api/chatContract.ts 与 src/lib/chat/chat-contract.ts 手工同源，须同改）；parseRefs 透传并只认 'doc'（其它值 400），非法 totalChars 丢弃；replay 不受影响（其 ReplayItem.kind 是另一套语义，只读 group/doc/text）。
- 预算: 抽 `refDocBudget(refs) = min(2000, 6000 - 已用)` 供两处共用——只看单条 2000 会在已有 5900 字引用时撞后端合计上限直接 400。选择器里按预算 slice，面板入口按预算 slice 后再交给守卫。
- 去重: 整篇按文档身份（group+doc），不按 text（text 随预算变化，文本比对会漏拦）；整篇与片段允许并存。
- 模型可见性: renderRefsBlock 在围栏标注「整篇文档：原文约 M 字，此处仅提供前 N 字，其余内容如需请调用检索工具查阅」，未截断时只标「（整篇文档）」。
- 展示: chip 与已发送回显加 `.ki-chat-refbar__kind` / `.ki-chat-refs__kind` 徽标；悬停卡 RefPreview 展示原文规模与截断结果；选择器头部显示「N/5 段 · 合计 X/6000 字」。
- 验证: 后端 test/chat/chat-refs.test.ts 全绿（新增 parseRefs 透传/非法 kind/非法 totalChars/注入块标注 4+1 例）；web ref-selection 27 例 + chat-ref-preview 等 42 例绿；根 tsc 仅 7 处既有错误、web build ✓。既有失败 e2e-sr02-sources（@/lib/authEvents 模块解析）与 find-config（edited 字段）与本次无关。