---
groupPath: 项目踩坑点
relation: 强制作答会让上游把工具调用写成文本（DSML污染）
exportedAt: "2026-11-13T04:52:42.298Z"
---
拿掉 tools 做「强制作答」后，部分上游仍想调工具，会把调用意图以**自家标记**写成普通文本混进 content。实测 deepseek-flash 输出 `<｜｜DSML｜｜ invoke name="ki_search">...` 这类片段，导致答案 100% 是标记、完全不可用。
- 触发条件: `tool-loop` 达 `maxToolRounds` 上限 → 本轮传 `tools: undefined` 再调一次（强制作答）
- 实测: `ki_ask` 6 轮用尽的复杂问题（13 个工具调用）答案全是 DSML，零真实内容
- 修法: 强制作答那一轮往 `messages` 末尾追加一条 system 提示——「本轮已达到检索轮次/时间上限，不再提供任何工具，立即基于上文作答，禁止输出工具调用、函数调用或任何自定义标记」→ 同题复测答案恢复正常（3/3 可用）
- 位置: `src/lib/chat/retrieval/tool-loop.ts` 的 `if (reachedLimit)` 分支（在 `yield context` 之前 push，保证计入上下文用量）
- 边界: 对话链路 `maxToolRounds = Infinity` 永不触发 ⇒ 页面行为不变；只在长任务工具（`ki_ask`）上生效
- 复现: `ki_ask` 问需要 >6 轮检索的问题（如「ki 导入流程分几个阶段」）