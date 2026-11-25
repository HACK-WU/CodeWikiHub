---
groupPath: 专题记忆/AI对话链路
relation: AI 查找与 ki_recall 是同一链路（一套配置 + 两个场景 skill）
exportedAt: "2026-11-25T05:05:17.619Z"
---
口径（2026-11-25 用户澄清原设计，代码已核实成立）：**「AI 查找」是 `ki_recall` 在页面上的别名**，两者同一套配置、同一条执行链，差别只有过程是否可见——页面渲染检索过程（toolTrace / 步骤面板），MCP 调用只回最终 JSON。

**共享**：配置域 `prompt-config.find`（`mcp-tools/recall.ts:441` 与 `events/find-service.ts:150-153`）、内核 `runGroundedRecall`、工具执行器 `makeRecallToolRunner`。

⚠️ **被推翻的旧判断（2026-11-25 Q6）**：原口径是「1 份基础提示词 + 2 个场景 skill（refs-locate 给页面、task-recall 给 MCP）」。**task-recall 已移除** —— 预取不再加载任何 skill（`resolveRecallSection` 返回 `skills: []`），判断口径由基础提示词 + `buildRecallUserMessage`（任务画像/强线索/已读清单）承担。现在内置 skill 只剩 `refs-locate`（页面专属）。老配置里的 `builtin-task-recall` 由 `DEPRECATED_BUILTIN_SKILL_IDS` 静默过滤（`issue=null`）。

**已修的真缺陷**：G1 预取不吃 `maxToolCalls`（预取曾是内核唯一「不限制」档）、G2 次数未注入上下文 —— 均已接线并在真机验证（改 15→2 时 rounds 5→2、partial=true、8.2s）。

- 位置: `src/lib/mcp-tools/recall.ts`、`src/lib/events/deep-find-core.ts`、`src/lib/chat/prompt-config.ts`、`web/src/chat/PromptConfigLayer.tsx`
- 相关: 事件 #2（已收敛）、#3（已收敛）、REQ-20261125-001