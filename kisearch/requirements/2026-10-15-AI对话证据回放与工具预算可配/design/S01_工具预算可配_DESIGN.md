---
id: REQ-20261015-001
feature: AI对话证据回放与工具预算可配
document_type: design
version: 1
created: 2026-10-15
author: AI
---

# S-01 工具预算可配 · 设计

> 父文档：`DESIGN.md` §3.2 共享术语。覆盖需求 **R3 + R4 + R7**。
> **⚠️ 需求验收标准修正**：`requirement.md` R4 写"AI 传超界值被拒并回可见错误"——实测实现口径是 **`asInt` 钳制（clamp）而非拒绝**（`src/lib/chat/mcp-tool-registry.ts:89-96`，宽松钳制是既有哲学：报错会让模型陷入"改参数→再试"循环，N19 要求收敛）。本设计按**钳制**执行，验收标准相应改为"超界被钳到硬上界并正常返回"。

## 1. 术语

| 术语 | 定义 |
|---|---|
| `toolResponseChars` | 用户覆盖的**工具返回字符上限**；缺省 = 未覆盖 → 内置 `CHAT_BUDGET.maxToolResponseChars`（10000） |
| `searchHitsPerCall` | 用户覆盖的 **`ki_search` 未传 limit 时的条数**；缺省 = 未覆盖 → 内置 `CHAT_BUDGET.maxHitsPerCall`（5） |
| 硬上界 / 下界 | 用户不可配的代码常量：返回上限 1000–100000、条数 1–50 |
| 生效值 | `覆盖值 ?? 内置默认`（两级，D1）；**每轮解析一次**，保存后下一次提问生效 |

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| `maxHitsPerCall = 5` 同时服务**工具默认值**与**页面 sources 投影上限** | `src/lib/chat/chat-contract.ts:417-418`、`retrieval/projection.ts:107,152` |
| `limit` 的 schema：`minimum 1 / maximum 5 / default 5` | `mcp-tool-registry.ts:318` |
| `limit` 的 spec：`min 1 / max 5 / default 5`（`asInt` 钳制） | `mcp-tool-registry.ts:327`、`:89-96` |
| 执行兜底 `a.limit ?? CHAT_BUDGET.maxHitsPerCall` | `mcp-tool-registry.ts:339` |
| `maxToolResponseChars = 10000` 硬常量，`serializeToolResponse` 无参数 | `chat-contract.ts:419-420`、`retrieval/tool-response.ts:4-20` |
| 三条序列化调用点 | `retrieval/tool-loop.ts:679`、`:706`、`:741` |
| 提示词写死 `limit 为 1–5，默认 5` 与 `超过 10000 字符` | `retrieval/retrieval-skill.ts:86-87` |
| 前端截断文案写死 10000 | `web/src/chat/ChatPanel.tsx:2455` |
| `PromptConfig` 只有 `contextChars` 一个可选覆盖值；`cloneConfig` 是**白名单拷贝** | `src/lib/chat/prompt-config.ts:152-176`、`web/src/chat/PromptConfigLayer.tsx:54-62` |
| `limits` 由服务端下发（前端不硬编码上限） | `chat-routes.ts:587-597`、`web/src/api/chatContract.ts:331-342` |

## 3. 方案（TO-BE）

### 3.1 契约常量（`src/lib/chat/chat-contract.ts`）

```ts
export const CHAT_BUDGET = {
  // …既有项不变…
  /** 单次检索条数的**内置默认**（用户可在对话配置覆盖）；同时是页面 sources 投影的取条上限（两者刻意同值） */
  maxHitsPerCall: 5,
  /** `ki_search.limit` 的**硬上界**（代码常量，用户不可配）—— 模型自主传值的天花板 */
  maxHitsPerCallHardMax: 50,
  /** 工具返回总长度的**内置默认**（用户可在对话配置覆盖） */
  maxToolResponseChars: 10000,
  /** 工具返回上限的配置边界（服务端强校验） */
  toolResponseCharsMin: 1000,
  toolResponseCharsMax: 100_000,
};
```

**为什么 `maxHitsPerCall` 不改名**：它被 `projection.ts`（页面 sources 取前 N 条）与 registry 共用；改名波及测试与前端语义。**投影口径不随配置变化**（避免来源列表随配置爆炸），仅工具默认值改走配置。

### 3.2 配置字段（`src/lib/chat/prompt-config.ts`）

```ts
export interface PromptConfig {
  // …既有字段…
  contextChars?: number;
  /** 用户覆盖的工具返回字符上限；缺省 = 未覆盖 → 内置 10000（D1：不写 config.yaml） */
  toolResponseChars?: number;
  /** 用户覆盖的检索条数默认值；缺省 = 未覆盖 → 内置 5 */
  searchHitsPerCall?: number;
}
```

`normalizePromptConfig` 追加校验（越界即 issue → 整份回退默认，与 `contextChars` 同语义）：

| 字段 | 校验 | 失败消息 |
|---|---|---|
| `toolResponseChars` | 整数且 `1000 ≤ v ≤ 100000` | `应为 1000–100000 的整数（字符数）` |
| `searchHitsPerCall` | 整数且 `1 ≤ v ≤ 50` | `应为 1–50 的整数（条）` |

**为什么设下限 1000**：低于此值几乎所有工具返回都被截断，功能不可用（防呆而非技术限制）。

### 3.3 工具 schema 与执行（`src/lib/chat/mcp-tool-registry.ts` + `retrieval/tool-loop.ts`）

| 变更点 | 改什么 | 改成什么 | 为什么 |
|---|---|---|---|
| `limit` schema | `maximum: CHAT_BUDGET.maxHitsPerCall` + `default: 5` | `maximum: CHAT_BUDGET.maxHitsPerCallHardMax`，**去掉 default**；描述改为"返回条数上限（1–50）；不传时使用系统默认条数" | 让 AI 在 1–50 内**自主**传值；不写死默认值，避免与配置漂移 |
| `limit` spec | `{ min:1, max:5, default:5 }` | `{ min:1, max: 50 }`（去 default） | 未传时由**执行前的预算补全**补值（见下） |
| `applyBudgetDefault` | 无 | **新增并导出**（纯函数，SSOT 在 registry：「哪些工具有 limit」是 registry 的知识） | 供 tool-loop 在**执行必经点**调用 |
| `enabledChatToolEntries` | `(tools: Record<string, boolean>)` | **签名不变** —— 工具面过滤是它的既有职责，不掺入预算逻辑 | 执行路径**不经过**它的返回值（见 §8 决策 5） |
| 执行兜底 | `a.limit ?? CHAT_BUDGET.maxHitsPerCall` | **保留** | 防御绕过注入的直接调用（测试路径） |

```ts
// src/lib/chat/mcp-tool-registry.ts —— 新增导出（纯函数）
/** 仅 ki_search 且未显式传 limit 时补配置默认值；其余工具与显式传值原样透传 */
export function applyBudgetDefault(name: string, args: ChatToolArgs, hitsDefault: number): ChatToolArgs {
  if (name !== 'ki_search' || args.limit !== undefined) return args;
  return { ...args, limit: hitsDefault };
}
```

```ts
// src/lib/chat/retrieval/tool-loop.ts:689-716 —— 执行必经点注入（entry.parse 之后、entry.run 之前）
parsed = entry.parse(call.arguments);
parsed = applyBudgetDefault(entry.name, parsed, runtime.budget.hitsPerCall);   // ← 新增
```

> ⚠️ **为什么必须在执行必经点、而不是包装 `enabledChatToolEntries` 的返回值**：`tool-loop` 执行工具时走 `getChatTool(call.name)`（`tool-loop.ts:676`）—— 注册表**原始 entry**，而 `runtime.toolEntries` 只用于 `toolDefs`（`:524`，喂 schema）。包装 `run` 永不被调用 ⇒ 配置**静默失效**（challenger 意见 1，🔴，已修订）。

### 3.4 返回序列化（`src/lib/chat/retrieval/tool-response.ts`）

```ts
export function serializeToolResponse(
  value: unknown,
  limit: number = CHAT_BUDGET.maxToolResponseChars,   // ← 缺省保持旧行为（其他调用方零改动）
): ChatToolResponse
```

返回值新增 `limit` 字段（本次序列化使用的上限），供前端文案与事后追溯。截断标记文案不变（已含实际 `limit` 数字）。

### 3.5 运行时读取（`src/lib/chat/retrieval/tool-loop.ts`）

- `LoopRuntime` 新增 `budget: { responseChars: number; hitsPerCall: number }`
- `resolveRuntime()`：`responseChars = promptConfig.toolResponseChars ?? CHAT_BUDGET.maxToolResponseChars`；`hitsPerCall` 同名规则
- 三处 `serializeToolResponse(x)` → `serializeToolResponse(x, runtime.budget.responseChars)`（`:679` 未知工具 / `:706` 参数解析失败 / `:741` 正常返回）
- `enabledChatToolEntries(promptConfig.tools)` **保持原签名**（工具面过滤职责不变，预算不在此注入）
- **新增执行前补全**：`parsed = applyBudgetDefault(entry.name, parsed, runtime.budget.hitsPerCall)`（紧接 `entry.parse()` 之后，`:690`）
- **生成中改配置**：本轮 `runtime` 在生成开始时已固定（`resolveRuntime()` 每次生成调用一次）⇒ 本轮不生效，**下一次提问生效**（与工具开关口径一致；场景推演发现，2026-10-15 补）

### 3.6 配置界面（`web/src/chat/PromptConfigLayer.tsx`）

新增分组「**工具预算**」，位置：**「上下文窗口」之后、「工具与权限」之前**。

```
┌──────────────────────────────────────┐
│ 工具预算              默认 10 / 5     │
│ 工具返回上限  [ 10 ] 千字符  [恢复默认]│
│ 检索条数默认  [  5 ] 条      [恢复默认]│
│ 说明：仅作用于 AI 对话内的工具调用…    │
└──────────────────────────────────────┘
```

- 输入单位：返回上限用**千字符**（与「上下文窗口」的 K 口径一致）；条数用**条**
- 「恢复默认」= **删掉对应字段**（回内置默认，与 `contextChars` 同语义）
- `cloneConfig` **必须显式搬运两个新字段**（白名单拷贝坑，已由 `context-limit-config` E2 案例锁定同族缺陷）
- 非法值（非整数/越界）→ 禁用保存 + 内联提示；极值（贴边）只提示不拦截
- **组合提示（场景推演发现，🟡）**：两个旋钮在同一分组里天然会被一起调 —— 当「条数默认值 × 典型单条长度」预计超过「返回上限」时（如条数 8 × 单条约 1.5K > 10K），提示"按当前组合，多数检索返回会被截断，建议同时调大返回上限"，避免"调大条数反而答得更差"
- 降级：`limits.toolResponseCharsMax === undefined`（旧 daemon）→ 提示"服务端未返回上限，本项保存可能不生效"
- footer 作用域文案更新为"提示词与 skill 对之后新建的会话生效，工具开关、上下文上限与工具预算保存后生效"

### 3.7 前端截断文案（`web/src/chat/ChatPanel.tsx:2455`）

`原返回 {originalChars} 字符，超过 {limit} 字符已截断。AI 收到相同内容。`
`limit` 缺失（旧记录）→ 退化为 `原返回 {originalChars} 字符，已截断。AI 收到相同内容。`

### 3.8 提示词数字（与 S-03 协同）

`retrieval-skill.ts:86-87` 去掉具体数字（见 S-03 §3）：`limit 为 1–5，默认 5` → 「limit 可在允许范围内自主选择，不传时使用系统默认条数」；`超过 10000 字符` → 「超过上限时」。

## 4. 接口设计

### 4.1 `GET /api/chat/prompt-config`（增量）

`limits` 新增 6 字段（前端**不硬编码**任何数字）：

```json
{
  "ok": true,
  "limits": {
    "promptMaxChars": 4000, "skillMaxChars": 8000,
    "toolResponseCharsMin": 1000,
    "toolResponseCharsMax": 100000,
    "toolResponseCharsDefault": 10000,
    "searchHitsMin": 1,
    "searchHitsMax": 50,
    "searchHitsDefault": 5
  },
  "config": { "prompt": { "content": "…", "at": "…" }, "skills": [], "tools": {},
              "toolResponseChars": 20000, "searchHitsPerCall": 8 },
  "defaults": { "prompt": {}, "skills": [], "tools": {} },
  "issue": null
}
```

> Demo 返回示例（仅示意格式）：`config` 里两个字段**存在 = 已覆盖**、**缺失 = 未覆盖**；`defaults` 恒不含二者。

### 4.2 `PUT /api/chat/prompt-config`（增量）

请求体新增两个**可选**字段；整体替换语义不变（调用方必须带全字段，否则覆盖值被清——已由既有测试 ④ 锁定）：

```json
{ "prompt": { "content": "…", "at": "…" }, "skills": [], "tools": {},
  "contextChars": 1000000, "toolResponseChars": 20000, "searchHitsPerCall": 8 }
```

错误：`400 PROMPT_CONFIG_INVALID`（附 `details[].path`），未落盘。

### 4.3 `ChatToolResponse`（契约增量，前后端双副本）

```ts
export interface ChatToolResponse {
  text: string;
  originalChars: number;
  truncated: boolean;
  /** 本次序列化使用的字符上限（配置生效值）；旧记录缺失 → 前端回退文案 */
  limit?: number;
}
```

## 5. 数据模型

| 层 | 结构 | 落盘位置 |
|---|---|---|
| 用户覆盖值 | `PromptConfig.toolResponseChars?: number`、`searchHitsPerCall?: number` | `{chatDir}/prompt-config.json` |
| 内置默认 | `CHAT_BUDGET.maxToolResponseChars = 10000`、`maxHitsPerCall = 5` | 代码常量 |
| 硬上界 | `toolResponseCharsMin/Max`、`maxHitsPerCallHardMax` | 代码常量（不经 HTTP 下发为"可配范围"以外的语义） |
| 展示用 | `progress[].response.limit` | 会话文件（随 `ChatToolResponse` 落盘） |

## 6. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 保存值非整数 / 越界 | `normalizePromptConfig` 记 issue → **整份回退默认**、不落盘 | 是（400 + `details`） |
| 手工改坏 JSON | 读取整体回退默认 + `issue` | 是（界面可见） |
| AI 传 `limit > 50` | `asInt` **钳制到 50**（不报错） | 否（模型无感知） |
| 旧 daemon 不返回新 limits | 前端提示"服务端未返回上限，保存可能不生效" | 是 |
| 写盘失败 | `500 CHAT_WRITE_FAILED`，**文件未改动** | 是 |
| 配置值贴边（如 1000 字符） | 允许保存 + 提示"几乎所有工具返回都会被截断" | 是（提示） |
| 模型可见命中数 ≠ 页面来源列表条数 | AI 传 20 时模型可看到 20 条命中，页面 `sources` 仍按 `CHAT_BUDGET.maxHitsPerCall`（5）投影（`retrieval/projection.ts:107`）—— 刻意如此，避免来源列表随配置爆炸 | 是（既有「来源」入口展示前 5 条） |

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/chat/chat-contract.ts` | 新增 4 个常量；`ChatToolResponse.limit?` |
| `src/lib/chat/prompt-config.ts` | 2 个可选字段 + 校验 |
| `src/lib/chat/chat-routes.ts` | `limits` 下发 6 字段 |
| `src/lib/chat/mcp-tool-registry.ts` | schema/spec 调整 + **新增导出 `applyBudgetDefault`**（`enabledChatToolEntries` 签名不变） |
| `src/lib/chat/retrieval/tool-response.ts` | `limit` 参数 + 返回值字段 |
| `src/lib/chat/retrieval/tool-loop.ts` | `LoopRuntime.budget` + 3 处 `serializeToolResponse` 传参 + **执行前预算补全 1 处**（`:690` 后） |
| `src/lib/chat/retrieval/retrieval-skill.ts` | 文案去数字（见 S-03） |
| `web/src/api/chatContract.ts` | 契约副本同步（字段 + limits + `ChatToolResponse.limit`） |
| `web/src/chat/PromptConfigLayer.tsx` | 新分组 + `cloneConfig` + footer 文案 |
| `web/src/chat/ChatPanel.tsx` | 截断文案读 `limit` |
| 测试 | `test/chat/{prompt-config,tool-response,mcp-tool-registry}.test.ts` 改造；新增 `test/chat/tool-budget.test.ts`；`web/test/tool-budget.test.mjs`；`contract-parity` |

## 8. 关键决策点

| 决策 | 选择 | 理由 | 被否决方案 | 否决原因 | 重新评估触发条件 |
|---|---|---|---|---|---|
| 配置字段结构 | **平铺两个可选字段** | 与 `contextChars` 同构；`cloneConfig` 白名单搬运简单 | 嵌套 `toolBudget: {}` | 多一层结构、前端搬运更易漏字段 | 若后续新增 ≥3 个预算旋钮 → 改嵌套 |
| `limit` schema 的 `maximum` | **固定硬上界 50** | schema 是模块级常量，动态化需把 `def` 改工厂，波及 registry/测试 | 随配置 = 用户配的默认值 | 用户把默认调到 5 时 AI 就再也传不大，与"AI 自主"矛盾 | 若需求变为"AI 也不得超过我的配置值" → 需 def 工厂化 |
| spec 的 `default` | **移除，改运行时注入** | 保留会与配置漂移（模型看到 5、实际 20） | 保留 `default: 5` | 配置改了模型看到的默认值仍写死 | 无 |
| `ChatToolResponse.limit` | **新增可选字段** | 数字准确、可追溯"按哪个上限截的" | 前端文案不写数字 | 用户看不到上限是多少，与"数字不说谎"冲突 | 无 |
| **预算注入点** | **tool-loop 执行必经点**（`entry.parse()` 之后） | 执行路径走 `getChatTool(call.name)`（注册表原始 entry，`tool-loop.ts:676`），只有必经点保证被调用 | 包装 `enabledChatToolEntries` 返回值的 `run` | `runtime.toolEntries` 只喂 schema（`:524`），其 `run` 永不被执行 ⇒ 配置**静默失效**（challenger 意见 1，🔴） | 若执行查找改为 `runtime.toolEntries.find(...)` → 注入点可回归 registry（并顺带修"被关闭工具仍可执行"的既有隐患） |
| **`limit` 是否放开上界**（D5） | **放开到 50，默认仍 5** | 需求要求"AI 可自主控制"；**demo 实测**：长证据场景模型主动传 `limit=10`（> 默认 5），按问题复杂度自调已获执行性证据（`../demo/verify-report.md` T4） | 保持 `maximum=5`（维持原暴露面收窄） | 与"AI 可自主传 limit"的需求直接矛盾 | 若实测出现滥用（持续传 50 致返回频繁被截断）→ 下压上界 |
| 注入的验证方式 | **单测断言 `executeSearch` 收到的 limit = 配置值** | 直接锁在数据实际流向处，防止未来新增执行路径再次绕过 | 只断言 UI 保存成功 | 保存成功 ≠ 生效（本次 challenger 发现的正是这类"纸面功能"） | 无 |

## 9. 待定问题

| # | 问题 | 当前处理 | 解除条件 |
|---|---|---|---|
| Q1 | 回放预算是否也要可配（第三个旋钮） | 暂不做（见 S-02） | 用户提出需要 |
| Q2 | `progress.response.limit` 是否需要在时间线上展示 | 暂不展示（仅截断提示用） | 用户提出需要 |
| Q3 | 前端单位"千字符"是否够用 | 沿用 K 口径 | 用户反馈不易读 |
