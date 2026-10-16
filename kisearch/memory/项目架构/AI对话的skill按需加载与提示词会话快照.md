---
groupPath: 项目架构
relation: AI对话的skill按需加载与提示词会话快照
exportedAt: "2026-10-13T12:54:12.474Z"
---
# AI 对话：skill 按需加载 + 提示词会话快照（2026-10-13）

## 注入模型（改造后的口径）
恒定注入的 system 块 = **skill 目录 → 基础提示词 → 硬性反幻觉规则**，由 `prompt-config.ts::promptSnapshotBlocks(cfg)` 产出；
**skill 正文不再常驻**，由 AI 调 `use_skill(skill_id)` 按需加载（`tool-loop.ts::USE_SKILL_TOOL_NAME` / `resolveUseSkill` / `renderSkillLoadedBlock`）。
- 目录：`retrieval-skill.ts::renderSkillCatalog(skills)`，每行 `- 名称（id）：描述`，并写明「未加载的 skill 正文不在本次上下文中」；**id 是调用键，必须出现**。
- 硬规则：`HARD_RULES_BLOCK`（反幻觉 4 条）**从 skill 正文拆出恒注入**，N17 依赖它 —— 若留在正文里，未加载时会出现无约束窗口。
- 描述缺失回退：`deriveSkillSummary(content)`（取「用途：」/「**目的**：」首句，≤120 字）。

## 会话快照（用户口径：提示词只在新建会话注入一次）
- `ConversationFile.injected{version,at,blocks,skillIds}` + `loadedSkillIds`（契约两侧副本同步）。
- **在生成之前前置固化**（`chat-routes.ts` ①.5 段，`applyInjectionState`），随后重读会话交给本轮 loop ⇒ 不变量「**首轮实际注入的 system 段 === 落盘快照**」。
  反例（已修）：流结束后才写快照 ⇒ 生成期间改配置会让快照记下"第 1 轮没用过的版本"。
- 只在**无快照**时写（幂等）；配置改动因此只影响**新建会话**；工具开关仍是下一次提问生效。
- 已加载 skill 的正文**每轮以 system 块重放**（上游无状态，`tool` 消息不会自动重现；不重放模型会反复调 `use_skill`）。重放走 `findEnabledSkill` ⇒ **停用即从上下文移除**。

## 可见性链路
`skill` SSE 事件（单事件，无 start/end）→ `ChatProgressStep{kind:'skill',skillId,skillDescription,chars,alreadyLoaded}`（**不落正文**）→ 前端 `useChatStream::skillStep` / `answerFlow` TimelineNode kind=`skill` / `ChatPanel::SkillRow`+`SkillCard`（紫色方点 + 紫底名称胶囊 + 「加载 skill」措辞，与工具行绿点/灰 mono 胶囊刻意不同）。

## 配置层
`PromptSkill.description`（≤200 硬上限、建议 120，服务端 `normalizePromptConfig` 强校验）+ 卡片内启用开关（`role="switch"`）+ 预览走 `MarkdownPreview`；内置「知识库检索」正文按 SKILL.md 规范重写（概述：目的/功能/使用场景 + 指令）。

## 关键文件
- `src/lib/chat/prompt-config.ts`（`promptSnapshotBlocks` / `buildInjectionSnapshot` / `enabledSkillIds` / `findEnabledSkill` / `SKILL_DESC_*`）
- `src/lib/chat/retrieval/retrieval-skill.ts`（目录 / 硬规则 / 描述默认值 / 正文）
- `src/lib/chat/retrieval/tool-loop.ts`（`injectionBlocks` 快照优先 / `loadedSkillBlocks` 重放 / `use_skill` 分支）
- `src/lib/chat/chat-store.ts::applyInjectionState`、`src/lib/chat/chat-routes.ts`（①.5 前置快照 + ③ 已加载 id 落盘）
- `web/src/chat/{useChatStream,answerFlow,chatStore,ChatPanel,PromptConfigLayer,PromptConfigModal}.tsx`