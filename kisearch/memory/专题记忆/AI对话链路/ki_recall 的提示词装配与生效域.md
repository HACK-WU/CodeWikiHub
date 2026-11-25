---
groupPath: 专题记忆/AI对话链路
relation: ki_recall 的提示词装配与生效域
exportedAt: "2026-11-25T03:07:58.776Z"
---
`ki_recall`（MCP 任务前预取）不是一条写死的提示词，而是运行时三段拼装 + 一段用户消息；理解实现或改文案时要按这四处定位。

**系统提示词**（`src/lib/recall/recall-prompt.ts::buildRecallSystemPrompt`，顺序即优先级）：
1. 域基础提示词（内置文案 = `prompt-config.ts` 的 `DEFAULT_FIND_PROMPT`，AI 查找与预取共用）；
2. 该域启用的 skill 正文（预取固定注入 `builtin-task-recall` → `chat/retrieval/task-recall-skill.ts`，默认 enabled，承载「场景怎么判断」，不重复基础规则）；
3. `GROUNDED_OUTPUT_SPEC`（`recall/run-recall.ts`，代码追加的 JSON 输出格式，用户改不到）。

**用户消息**（`buildRecallUserMessage`）：任务画像 / 强线索 / 已读清单 / 种子候选（引擎初筛 ≤10）+ 固定收尾「先读正文再判断，宁少勿滥」。

**对外工具描述**另有 `mcp-tools/recall.ts::TOOL_DESCRIPTION`，是外部 AI 决定要不要调用的唯一依据。

⚠️ 生效域口径：`resolveRecallSection()` 读的是 `cfg.find`（不是 `cfg.recall`），轮次/字符上限用硬编码 `RECALL_DEFAULT_ROUNDS` / `RECALL_DEFAULT_TOOL_CHARS`；`PromptConfig.recall` 独立域只有配置层（默认值/校验/保存）在维护，执行链路不消费 → 见事件 #2。

- 位置: `src/lib/mcp-tools/recall.ts`、`src/lib/recall/recall-prompt.ts`、`src/lib/recall/run-recall.ts`、`src/lib/chat/prompt-config.ts`、`src/lib/chat/retrieval/task-recall-skill.ts`
- 改文案口径: 改代码默认后老配置不会自动跟（靠 `edited` 标记），详见「内置提示词与 skill 未改动则跟随代码升级」