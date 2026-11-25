---
groupPath: 专题记忆/AI对话链路
relation: A 方案：ki_recall 配置统一到「AI 查找」域（2026-11-25 实施）
exportedAt: "2026-11-25T03:51:19.492Z"
---
决策：用户拍板 A 方案——不新增「AI 预取」配置域，而是把已有的 `find` 域（页面「AI 查找」）真正接到 MCP 的 `ki_recall`，并删除历史残留的 `PromptConfig.recall` 域。

**改了什么**
1. G1：`resolveRecallSection()` 增 `maxToolCalls = find.maxToolCalls ?? FIND_DEFAULT_TOOL_CALLS(15)`，并透传 `runGroundedRecall` —— 页面「工具调用上限」终于对 MCP 生效（此前预取是内核唯一「不限制」档）。
2. G2：`toolCallBudgetNote()` 从 `deep-find-core` 搬到 `recall/recall-prompt.ts` 导出，`buildRecallSystemPrompt` 在 skill 与输出规格之间注入（顺序：提示词 → skill → 预算 → 输出格式）；查找侧改为复用，两条链路同一文案。
3. G5：skill 卡说明改「作用于 AI 查找与 MCP 工具 ki_recall（同一套配置、同一条链路）」；左栏「AI 查找」副标题补「含 ki_recall」。
4. G6：删除 `PromptConfig.recall` 全套（接口/默认值/DEFAULT_RECALL_PROMPT/normalizeRecallSection/软读取/保存保留与时间戳/RECALL_TOOL_GROUPS·NAMES·LOCKED/轮次字符上下界/契约字段/limits 四项/单测文件）。

**接口影响**：GET /api/chat/prompt-config 不再有 `recall` 域，limits 少 4 项（前端契约同批删除）。

**未做**：G3（轮次/字符上限是否纳入 find 域，属设计取舍）、G4（工具卡补 ki_scope_list，随 scope 解耦一起改）、scope 解耦 Q1-Q7、真机验证。

**验证**：recall-tool 13 例（含新增 ⑥ 两例）绿；chat 目录 2 红与 events 批量 2 红均经 stash 隔离/复跑证实为既有基线或状态污染；后端 tsc 9 基线、build ✓；web 1548/1537 同基线、tsc+build ✓。

- 位置: `src/lib/mcp-tools/recall.ts`、`src/lib/recall/recall-prompt.ts`、`src/lib/events/deep-find-core.ts`、`src/lib/chat/prompt-config.ts`、`src/lib/chat/chat-routes.ts`、`web/src/chat/PromptConfigLayer.tsx`、`web/src/pages/AiSettingsPage.tsx`、`web/src/api/chatContract.ts`
- 相关: 事件 #2（→ 偿还中）、REQ-20261125-001（实施中）