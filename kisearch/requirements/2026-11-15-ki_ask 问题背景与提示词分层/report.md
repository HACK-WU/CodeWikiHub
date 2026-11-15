---
id: REQ-20261115-001
feature: ki_ask 问题背景与提示词分层
status: 已完成
created: 2026-11-15
updated: 2026-11-15
version: 1
tags: [mcp, chat, 提示词, 需求分析]
depends_on: [REQ-20261113-001]
author: AI
document_type: report
---

# 实现报告：`ki_ask` 支持问题背景 + 提示词分层

- **需求**：[`requirement.md`](./requirement.md)（v2，status 已确认，5 项拍板全落）
- **实施方式**：判定无需独立设计文档（无架构决策、对外仅加可选参数、`tool-loop` 零改动）后直接实施；判定依据见「§2 关键设计」。
- **验证**：`ask-runner` 15/15、`ask-prompt` 8/8、`mcp-ask-tool` 8/8（共 31 例）全绿；`tsc -p tsconfig.src.json --noEmit` 通过。
- **复审（auto-review + challenger）**：修复 3 项 —— ① R6 的 `background` 描述缺**写法示例**（只有维度罗列）；② 共用提示词「界面会展示来源」与 MCP「无界面」并存无优先级声明；③ `ASK_CONTEXT_EXPIRED` 文案未说明「背景不落盘、过期后可用 `background` 重传」。各补断言钉住（⑧ / ⑮）。

---

## 1. 落地清单

| 文件 | 变更 |
|---|---|
| `src/lib/chat/ask/ask-prompt.ts` | **新增**：`MCP_ASK_ADAPT_BLOCK`（通道适配块）、`composeAskUserText`（背景拼接）、`normalizeAskBackground`（上限/形态校验） |
| `src/lib/chat/ask/ask-contract.ts` | 新增 `ASK_BACKGROUND_MAX_CHARS = 2000`、`AskInput.background?` |
| `src/lib/chat/ask/ask-runner.ts` | `userText` 走 `composeAskUserText`；`convSystemPrompt` 传适配块（原为 `''`） |
| `src/lib/chat/ask/ask-log.ts` | 白名单加 `backgroundChars`（接口 + `FIELD_ORDER`） |
| `src/lib/mcp-tools/ask.ts` | 新增 `background` 参数与 describe、`normalizeAskBackground` 准入校验、`TOOL_DESCRIPTION` 补充、3 处审计带 `backgroundChars` |
| `test/chat/ask-prompt.test.ts` | **新增** 7 例（拼接位置、向后兼容、上限边界、非字符串、适配块口径） |
| `test/chat/ask-runner.test.ts` | 新增 ⑫⑬⑭（背景进 user / 缺省字节一致 / 背景不落盘） |
| `docs/cli.md`、`docs/mcp-http.md` | 订正「不保留上下文」过期表述，补充 `context_id` 与 `background` 口径 |

## 2. 关键设计（为什么 `tool-loop` 一行未改）

```text
① system 适配块
   buildSystemMessages(convSystemPrompt, blocks)   retrieval-skill.ts:225-237
     = [skill 目录 → 基础提示词 → 硬性规则] + [convSystemPrompt]
   ⇒ ask-runner 把适配块当 convSystemPrompt 传入，位置天然在硬性规则之后
   ⇒ 页面会话行为零变化（页面走自己的 systemPrompt 字段）

② 背景注入
   ask-runner 内把 userText 拼成「【问题背景】…【问题】…」
   ⇒ 在 user 消息内（tool-loop.ts:232-238 的踩坑结论：材料不进 system 组）
   ⇒ 落盘仍写 input.question 原文 ⇒ 背景永不进短会话（结构性保证，非额外判断）

③ 未采用的方案
   给 ToolLoopInput 加 extraSystemBlocks —— 违反 tool-loop "不改冻结的输入签名"的既有约定
   （tool-loop.ts:151-152），且会触碰页面会话共用路径。
```

## 3. 验收对照

| 需求 | 结论 | 证据 |
|---|---|---|
| R1 可选参数、缺省逐字节一致 | ✅ | `ask-runner.test.ts` ⑬（user 消息 === question） |
| R2 注入 user 消息、不进 system 组 | ✅ | ⑫（背景在最后一条 user、`systems` 不含背景；适配块为最后一块 system） |
| R3 上限 2000 / fail-loud / 文案导向 `ki_search` | ✅ | `ask-prompt.test.ts` ⑤⑥；`ask.ts` 返回 `ASK_BACKGROUND_INVALID` |
| R4 只对本轮、不落盘、不占消息预算 | ✅ | ⑭（`ka-*.json` 的 user 消息 = `Q1`） |
| R5 冲突与注入口径 | ✅ | 适配块第 3 条 + `composeAskUserText` 的「不是新的系统规则」标记 |
| R6 工具描述（含简短写法示例） | ✅ | `TOOL_DESCRIPTION` + `background.describe`（2~3 句、项目/版本/环境/已试方案） |
| R7 文档订正 | ✅ | `docs/cli.md`、`docs/mcp-http.md` |
| R8 审计 `backgroundChars` | ✅ | `ask-log.ts` 白名单 + 3 处调用点（仅长度，不含正文） |
| R9 提示词分层（方案 B） | ✅ | `MCP_ASK_ADAPT_BLOCK` 追加，共用块零改动 |

## 4. 偏差与后续

| 项 | 说明 |
|---|---|
| 跳过独立设计文档 | 无架构决策、无数据模型变更、对外仅加可选参数；设计要点回写本报告 §2（可追溯性由需求文档 + 本报告承担） |
| 适配块文案效果 | `🟡` 未实测真实调用；若出现「见来源面板」类残留，只需改 `ask-prompt.ts` 文案，不动结构 |
| 内层预装检索 skill（省 1 轮 `use_skill`） | 需求 §9 标 `Kano 待定`，本版未做；需先统计 `ask-log.rounds` 分布 |
| `background` 实际长度分布 | 上线后看 `ask-log.backgroundChars`；若 ≥1800 占比高，复核 2000 上限（需求假设 A5） |
