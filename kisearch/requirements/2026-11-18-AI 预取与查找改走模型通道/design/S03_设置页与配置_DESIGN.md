# S-03 设置页与配置域

## 1. 术语

| 术语 | 含义 |
|---|---|
| 能力页 | AI 设置左栏的一项（AI 对话 / AI 分析 / AI 查找 / **AI 预取**） |
| `recall` 域 | `prompt-config.json` 里承载 AI 预取配置的顶层对象 |
| 锁定工具 | 工具列表中不可取消勾选的项（`ki_get_module_info`） |
| limits 下发 | 服务端在 `GET /api/chat/prompt-config` 里给出的字段上下界，前端不硬编码 |

## 2. 现状（AS-IS）

| 现状 | 位置 |
|---|---|
| 左栏 3 项能力（常量数组） | `web/src/pages/AiSettingsPage.tsx:28` |
| 能力类型只有 3 值 | `web/src/chat/PromptConfigLayer.tsx:194` |
| 每能力的小节是**硬编码 JSX 三段分支** | `PromptConfigLayer.tsx:1130` / `:1462` / `:1776` |
| 工具预算两个输入框 | `PromptConfigLayer.tsx:730` / `:750` |
| 工具开关（白名单校验） | `PromptConfigLayer.tsx:1422`；服务端 `prompt-config.ts:1555` |
| `findDeep` 能力位与两处前端分支 | `chat-routes.ts:687`、`PromptConfigLayer.tsx:1779` / `:1855` |
| limits 下发 | `chat-routes.ts:639` |
| 配置文件与读取（无缓存） | `prompt-config.ts:746` / `:763` |
| 校验：缺字段回默认、硬 issue 整份回退 | `prompt-config.ts:785` / `:794` |

## 3. 方案（TO-BE）

```
prompt-config.json
├── prompt / skills / tools / …        （对话域，不动）
├── analysis{…}
├── find{…}
└── recall{                            ← 新增
      prompt: string                   ← S-01 §4.3 的提示词全文
      skills: string[]                 ← 循环内可加载的 skill
      tools: Record<string, boolean>   ← 工具白名单（含锁定项）
      reasoningEffort?: string
      maxRounds?: number               ← 轮次上限，默认 6
      toolResponseChars?: number       ← 单条工具结果字符上限，默认 12000
    }
```

**前端**：左栏加第 4 项「AI 预取」；`CapabilitySection` 加 `'recall'`；新增一段 JSX，**结构与 AI 查找段完全一致**（六块同顺序），差异只有：标题文案、无「检索范围」块、`ki_get_module_info` 锁定。

## 4. 接口设计

### 4.1 契约变化（复用现有 GET/PUT）

```ts
// GET /api/chat/prompt-config  (chat-routes.ts:687 附近)
{
  config: PromptConfig & { recall: RecallConfig },
  limits: {
    …,
    recallMaxRoundsMin: 2, recallMaxRoundsMax: 12,
    recallToolCharsMin: 2000, recallToolCharsMax: 40000,
    // 候选条数不在此下发：它只由工具入参 limit 决定（1..20，见 S-02 §4.1），
    // 放进 recall 域会与"调用方自己传 limit"形成两个来源
  },
  // capabilities.findDeep 删除
}

// PUT /api/chat/prompt-config  — 请求体多一个 recall 域
```

### 4.2 工具白名单（新增常量）

```ts
// src/lib/chat/prompt-config.ts
export const RECALL_TOOL_GROUPS = [{ names: [
  'ki_search', 'ki_get_module_info', 'ki_group_list', 'ki_scope_list', 'ki_tag_list',
], danger: false }];
/** 锁定项：不可取消勾选（取消后「必须读正文」无法执行） */
export const RECALL_LOCKED_TOOLS = ['ki_get_module_info'] as const;
```

### 4.3 前端（新增第四段，结构复用）

```
AI 预取
├── 基础提示词            [恢复默认]
├── Skill                 已加载 N 个
├── 上下文窗口            （与其他能力一致，恒定值）
├── 工具预算              单次返回 K 字符 / 条
├── 思考级别              （沿用 llm.reasoningEfforts）
└── MCP 工具              勾选列表；ki_get_module_info 锁定
```

> 不新增「检索范围」块 —— 范围由调用方传 `scope`，服务端不设默认库。页面上写一行说明。

## 5. 数据模型

```ts
export interface RecallSectionConfig {
  prompt: string;                      // 默认 = DEFAULT_RECALL_PROMPT（S-01 §4.3）
  skills: string[];                    // 默认 []
  tools: Record<string, boolean>;      // 默认：RECALL_TOOL_GROUPS 全部 true，锁定项恒 true
  reasoningEffort?: string;
  maxRounds: number;                   // 默认 6，2..12
  toolResponseChars: number;           // 默认 8000，2000..40000
}
```

**校验规则（与现有域一致但更宽容）**：
- 缺字段 → 用默认，**不**产生 issue
- 类型错误 → issue（保存 400 不落盘；读取回退默认并透出提示）
- `tools` 里的键必须在 `RECALL_TOOL_GROUPS` 内，且锁定项强制 true（后端归一化，不报错）

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `recall` 域缺失 | 用默认值，不报错 | 否 |
| `prompt` 为空串 | 视为未配置 → 用默认 | 否 |
| `tools` 全关 | 保存成功，但 `ki_get_module_info` 仍强制为 true；运行时若只剩锁定项，正常执行 | 否 |
| `maxRounds` 越界 | 保存 400（不静默钳制） | 是 |
| 旧配置文件无 `recall` 域 | 读取时补默认，写回时不主动加（下次保存才落） | 否 |

## 7. 影响范围

| 文件 | 改动 | 回归 |
|---|---|---|
| `src/lib/chat/prompt-config.ts` | 新增 `RecallSectionConfig` + 默认值 + 归一化 + 白名单常量 | `test/chat/prompt-config-*` 全量 |
| `src/lib/chat/chat-routes.ts` | limits 扩展（`recall` 三组边界）；**`findDeep` 的删除归 S-04**，本文不改 | `test/chat/prompt-config-routes.test.ts` |
| `web/src/pages/AiSettingsPage.tsx` | `CAPABILITIES` 加第 4 项 | 前端路由测试 |
| `web/src/chat/PromptConfigLayer.tsx` | `CapabilitySection` 加 `'recall'`；新增第四段 JSX；**`findDeep` 两处分支归 S-04**（本子需求不碰，避免同一文件两批重复改） | `web/test/*` 契约 |
| `web/src/api/chatContract.ts` | 加 `RecallSectionConfig`；**`findDeep` 类型删除归 S-04** | — |

**关键约束**：`prompt-config.json` 是四块能力共用的单文件，`recall` 域**任何情况下不得导致硬 issue**（否则整份回退，连累对话与分析）。

## 8. 关键决策点

| # | 决策 | 被否决 | 理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-03-1 | 配置落 `prompt-config.json`（UI 写），不写 `config.yaml` | 让设置页直读 config.yaml | 既有边界是「UI 不写运维级文件」（`prompt-config.ts:303`）；直写会让 UI 与运维抢同一份文件 | 无 |
| D-03-2 | 页面完全复用 AI 查找段结构 | 新造"参数页" | 零成本、心智一致；新形态要教用户重新理解 | 出现"运维参数也想上页"的需求 |
| D-03-3 | `ki_get_module_info` 锁定勾选 | 允许取消 | 取消后"必须读正文"的硬规则无法执行；宁可少一个自由度 | 无 |
| D-03-4 | 不新增 `capabilities.recallDeep` | 加能力位 | 只有一个通道时能力位无意义（`findDeep` 就是因为双通道才存在） | 无 |
| D-03-5 | `tools` 全关时仍保留锁定项 | 全关即报错 | 报错不如"至少能读正文"；N6 只针对"连锁定项都没有"的异常场景 | 用户反馈"想彻底禁用"时 |
