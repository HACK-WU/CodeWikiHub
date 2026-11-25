---
groupPath: 错误库/AI对话链路
relation: 事件AI分析报未配置模型（llm明明配好）
exportedAt: "2026-11-16T06:57:48.441Z"
---
AI 分析弹窗报 `[ANALYSIS_LLM_UNAVAILABLE] 未配置模型：请在配置文件的 llm 段填写 baseURL / model / apiKey`，但 `/api/chat/config` 返回 enabled:true、AI 对话一切正常。
- 判据: 门禁放行（HTTP 202 + draft running，而非 503），28ms 后 draft 变 failed；注入探针可见「loadConfig 的 llm 齐全 / resolveLlmStatus enabled=true / 传给上游的 llmOpts 全空」三者同屏矛盾。
- 根因: `src/lib/events/analysis-runner.ts` 调 `streamChat` 时参数形状错 —— 写成 `streamFn({ messages, tools, llm })`（把 StreamChatOptions 当第一个参数 messages 传），而契约是 `streamChat(messages, opts)`，于是 `opts?.llm` 恒为 undefined，streamChat 第一行就抛 ChatDisabledError。
- 为什么没被测出来: `test/events/analysis-runner.test.ts` 的 fakeStream 签名也写成单参数 `(opts)`，与错误调用**同形**，测试一路绿；根目录 `tsc --noEmit` 当时没纳入日常验证。
- 解法: 改为 `streamFn(messages, { tools, signal, requestTimeoutMs, firstByteTimeoutMs, llm: llmOpts })`；测试 fake 改成真实契约签名 `(messages: ChatTurn[], opts?: StreamChatOptions)`，并加两条断言（第一参数必须是数组、第二参数必须带 `llm.model`）。
- 验证方式: 同一探针修复后打印 `model: deepseek-flash | base: true | key: true`，跑完 status=partial、turns=6、tokens=84069、候选 11 条；`test/events/*.test.ts` 6+3+4 全绿。
- 关联: 同类坑见「配置层入场动画的transform让浮层被后续卡片盖住」（都是同一族“测试与错误实现同形”）；证据台账 `.debug/analysis-llm-unavailable-20261116/`。