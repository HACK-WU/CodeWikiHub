---
groupPath: 决策记录
relation: 事件分析追问区复用 AI 分析排版
exportedAt: "2026-11-19T06:24:58.680Z"
---
AI 分析卡的「追问这次分析」不再用对话气泡：提问平铺成一行，过程与回答直接复用 AI 分析卡的排版与交互逻辑（2026-11-19 用户拍板）。
- 提问：`.gov-ask__q` + 「问」标签，平铺无气泡；`.gov-ask__msg/__demo/bubble` 三条样式删除，避免复活。
- 过程：复用 `.gov-ai-proc__head`（折叠头：转圈 + 步数 + 查看过程/收起 + ▾）、`.gov-ai-proc__steps` + `.gov-ai-step`（✓ 标记 + 加粗步骤名）、`ThinkingBlock`（`.ki-chat-reason*` 思考块）；运行中展开并贴底（stickRef），一轮结束后组件重挂 → open 初值 false 自动收起。`kind==='answer'` 的 AskStep 必须过滤（正文就是回答，渲染会重复一遍）。
- 回答：`.gov-ai-final gov-ask__answer`（紫色左竖线 + 7% 底 + 「回答」标题 + MarkdownPreview），覆盖 margin 的规则必须写在 `.gov-ai-final` 之后（同特异性靠顺序）。
- 不套 `.gov-ai-embed` 那层卡片：追问区自己就是容器，再套一层等于气泡。
- 约束：AI 分析组件（AiAnalyzePanel / EventAnalysisCard）零改动；改动面仅 `AskBlock.tsx` + governance.css 的 `.gov-ask` 段 + 新增 CSS 类 `.gov-ask__q/__q-mark/__q-text/__proc/__proc-steps/__proc-empty/__step-text`。
- 踩坑：pending → 完成的 AskProcess 会被 React 复用实例，展开态卡在 true ⇒ 必须显式 key（`pending-proc` / `${turnId}-proc`）。
- 验证：真机 #45 完成态截图（提问平铺 + 回答块）+ DOM 注入过程区走查（折叠头/步骤/思考块/光标）均正常、0 控制台错误；回归锁 `web/test/event-source-analysis.test.mjs` 新增 1 例；前端 1346 全绿、tsc 0、build ✓。
- 边界：历史轮次刷新后无过程（步骤不落盘），只显示「本次查证：N 次工具调用」。