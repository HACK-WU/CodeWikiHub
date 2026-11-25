---
groupPath: 决策记录
relation: AI 分析思考改为增量落盘（liveThinking）
exportedAt: "2026-11-18T03:35:28.898Z"
---
事件「AI 分析」的模型思考从「一轮结束才随 step 落盘」改为运行中按 ~1s 节流增量写 draft.liveThinking，前端边跑边渲染（2026-11-18 用户选方案 A）。

- 数据形状：`AnalysisDraft.liveThinking?: { round, text, chars }`；`AnalysisStepRecord` 新增 `thinkingChars`（截断前原文长度）。
- 写入：analysis-runner 的 streamFn 循环里 part.type==='reasoning' 时累积，`now - lastLiveWrite >= 1000ms` 才 `updateDraftIfMatch` 写一次（前端轮询 1.5s，写更快无意义）；首段必写（lastLiveWrite 初值 0）。写盘失败**必须 try/catch 吞掉**，否则会掉进外层 catch 变成 fatalError 中断分析。
- 清空三处必须成对：轮末 steps.push 后的写盘、收尾终态写盘、僵尸恢复（normalizeAnalysisDocForRead 的 ANALYSIS_INTERRUPTED 分支）。漏任一处 → 同一段思考展示两遍，或中断态永远转圈。
- 上限：`THINKING_MAX_CHARS = 20_000`（analysis-runner 导出，find-runner 共用）。**2026-11-18 由 2000 放宽**：用户反馈「思考内容没必要截断」，一段 2015 字的思考被砍尾毫无意义 —— 思考是纯文本给人读的，不存在工具响应那种“结果集过大”问题。20000 只作异常兜底（单轮吐几十万字时，1s 一次的增量写盘会把 draft 撑到 MB 级）。live 与轮末同值，不做「流式多留、结束裁短」（收尾正文会突然变短）。
- 前端：ThinkingBlock 支持 `live`（旋转）+ `truncated`（原文长度提示）+ 贴底跟随（stickRef，回看时不拽回底部）；AiAnalyzePanel 在步骤列表末尾渲染 gov-ai-live（虚线左框），条件 `status === 'running'`；无 liveThinking 时也渲染占位转圈（“正在思考…”），否则首包未到那段过程区完全静止。
- 口径澄清（易混淆）：工具响应展示截断 2000（response/responseChars）、思考上限 20000（thinking/thinkingChars）、喂给模型的工具正文上限 10000（ANALYSIS_TOOL_RESPONSE_CHARS）—— 三个数字互不相干。
- 测试：analysis-runner ⑥ 在 fake stream 的两段 reasoning 间读 draft 验证增量可见、轮末清空、thinkingChars>20000。