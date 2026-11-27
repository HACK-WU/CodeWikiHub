# S-01 `find` 配置域与设置界面

- 父文档：`DESIGN.md`
- 承接需求：R3（失败可见/退路，配置侧）、R4（文案）、R6（提示词）、R7（工具）、R8（Skill）、R9（预算）

## 1. 术语

| 术语 | 定义 |
|---|---|
| `find` 配置域 | `PromptConfig.find?: FindConfig`，与 `analysis` 同级、物理独立的配置块 |
| 老字段 `findPrompt` | 2026-11-15 预埋的平铺字段（无生效点）；本期**降级为只读兼容来源** |
| 软读取 | 该域字段非法时只忽略该字段并写 `softNotes`，不触发「整份回退默认」 |
| 检索定位提示词 | 原「检索词改写提示词」升级后的名字，深度通道的指令正文 |

## 2. 现状（AS-IS）

| 事实 | 证据 |
|---|---|
| `PromptConfig` 已有 `analysis` 独立域，`findPrompt` 是平铺占位字段 | `src/lib/chat/prompt-config.ts:310`、`:317` |
| 内置查找提示词只有「改写成 3-8 个关键词」，指向的方案（仅改写检索词）从未实现 | `prompt-config.ts:496-503` |
| find 分组只渲染一张 `CapabilityPromptPanel` | `web/src/chat/PromptConfigLayer.tsx:1798-1810` |
| 左栏能力项写死「确定性检索 · 未接入」 | `web/src/pages/AiSettingsPage.tsx:31` |
| 提示词弹窗 `kind: 'find'` 直接读写 `draft.findPrompt` | `PromptConfigLayer.tsx:1040-1048` |
| 保存路径对 `analysisPrompt`/`findPrompt` 做「缺失则沿用既有值」 | `prompt-config.ts:1283-1288` |
| 校验支持软读取开关（`capabilityPromptSoft` / `analysisSoft`） | `prompt-config.ts:649-660`、`:694` |

## 3. 方案（TO-BE）

### 3.1 配置结构

```ts
// src/lib/chat/prompt-config.ts

/** AI 查找专属工具分组（与 AI 分析共用 AnalysisToolGroup 形状，但不含 fs_*） */
export const FIND_TOOL_GROUPS: readonly AnalysisToolGroup[] = [
  {
    key: 'kb-read',
    label: '知识库只读',
    names: ['ki_search', 'ki_get_module_info', 'ki_group_list', 'ki_tag_list'],
    descs: {
      ki_search: '混合 / 全文检索知识库',
      ki_get_module_info: '按 group 与文档名读取正文',
      ki_group_list: '查看 Group 树结构与文档清单',
      ki_tag_list: '查看知识库标签',
    },
  },
];

export const FIND_MAX_ROUNDS_DEFAULT = 4;
export const FIND_MAX_ROUNDS_LIMIT = 8;
export const FIND_MAX_CANDIDATES_DEFAULT = 12;
export const FIND_MAX_CANDIDATES_LIMIT = 20;
export const FIND_TIMEOUT_DEFAULT_MS = 45_000;
export const FIND_TIMEOUT_MIN_MS = 10_000;
export const FIND_TIMEOUT_MAX_MS = 60_000;

export interface FindRangeConfig {
  /**
   * 额外放开的检索单元（scope 名或视图名）。
   * 当前事件所在库**恒定在范围内**，不写入本表 —— 否则"默认当前库"要靠在每个 scope 各配一次。
   */
  extraScopes: string[];
  /**
   * **预留（本期不实现、界面不暴露、校验时忽略）**：按事件所在库覆盖 `extraScopes`。
   *
   * 为什么要预留：`extraScopes` 是全局一份，而事件分散在不同库 —— 给 A 库事件配的「可查 B 库」
   * 会同样作用于 C 库事件。将来要做差异化时，有这个字段就只是「放开 UI + 解析时取覆盖值」，
   * 没有它则要改结构 + 迁移配置。
   */
  byScope?: Record<string, string[]>;
}

export interface FindConfig {
  ranges: FindRangeConfig;
  /** 检索定位提示词（深度通道注入；缺省即内置文案） */
  prompt: CapabilityPrompt;
  /** AI 查找专属 skill（与对话 / 分析的 skill 互相独立） */
  skills: PromptSkill[];
  /** 工具名 → 是否暴露，键必须是 FIND_TOOL_GROUPS 展开后的名字 */
  tools: Record<string, boolean>;
  /** 深度通道最大工具轮次；缺省 = FIND_MAX_ROUNDS_DEFAULT */
  maxRounds?: number;
  /** 单次查找的候选上限；缺省 = FIND_MAX_CANDIDATES_DEFAULT */
  maxCandidates?: number;
  /** 深度通道硬超时（ms）；缺省 = FIND_TIMEOUT_DEFAULT_MS */
  timeoutMs?: number;
  /** 思考级别（三级链同 analysis） */
  reasoningEffort?: string;
}

export interface PromptConfig {
  // …既有字段不变
  /** @deprecated 仅为兼容 2026-11-15 预埋字段；读取时迁移为 find.prompt，写入一律写 find */
  findPrompt?: CapabilityPrompt;
  find?: FindConfig;
}
```

**默认值与补齐**

```ts
const DEFAULT_FIND_PROMPT = `你是知识库文档检索助手。目标：在给定范围内找出与当前事件最相关的文档，供人勾选加入参考文档。

步骤：
1. 先看事件标题、描述、阶段与已有的关联/参考文档清单（只有名称与 group 路径）。
2. 用 ki_search 在指定范围内检索候选（可多轮改写检索词）；需要确认某篇是否真的相关时用 ki_get_module_info 读正文。
3. 只保留确有相关性的文档；同篇文档只报一次。
4. 只输出文档清单与一句话相关理由，不输出无关解释，不臆造不存在的 group / 文档名。

约束：只读。不修改任何文档，不臆造事件中未出现的信息。`;

function defaultFindTools(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const g of FIND_TOOL_GROUPS) for (const n of g.names) out[n] = true;
  return out;
}

export function defaultFindConfig(): FindConfig {
  return {
    ranges: { extraScopes: [] },
    prompt: { content: DEFAULT_FIND_PROMPT, at: BUILTIN_AT },
    skills: [builtinSkill('builtin-refs-locate')],
    tools: defaultFindTools(),
    // 三个预算字段缺省 = 未覆盖（与 contextChars / effort 同语义，恢复默认 = 删字段）
  };
}
```

**读取路径（关键）**

1. `find` 缺失 → 用 `defaultFindConfig()` 补齐（**不报 issue**，与内置 skill 缺失同一动机：报 issue 会触发整份回退，把对话配置也带成默认）。
2. **新增内置 skill `builtin-refs-locate` 会让所有老配置「凭空多出一条」** —— 沿用既有补齐口径（`BUILTIN_SKILL_NAMES` + 缺失即追加、不报错），默认**启用**；不得因缺失而报 issue（历史教训：`doc-editing` 那次若报 issue 会让全量老配置回退默认）。
3. `find.prompt` 缺失但老 `findPrompt` 存在 → 用老值填充并记 `softNotes: ['findPrompt 已迁移为 find.prompt']`；**不写盘**（读操作不改文件）。
4. `find` 内任一字段非法 → 仅忽略该字段（软），并在 `softNotes` 说明；`ranges.extraScopes` 非法时退化为 `[]` 而不是整域丢弃。
5. `findPrompt` 保留读取支持至少一个版本；写入路径不再产出该字段（保存时若 rawInput 无 find 而 existing 有 find，则沿用 existing.find）。

**保存路径（严格）**

- `find.tools` 的键必须属于 `FIND_TOOL_NAMES`，未知键 → 400 + 指明键名。
- `find.skills` 沿用既有 skill 校验（名称规则、上限、`SKILL_REQUIRED_TOOLS` 依赖）。
- `find.ranges.extraScopes` 逐项校验：① 必须存在（`ki_scope_list` 的 scopes ∪ views）；② 必须通过 `isScopeAccessAllowed`；③ 去重、去空、去当前默认库。任一失败 → 400 `FIND_TARGET_NOT_AUTHORIZED` 并列出失败项（**不静默丢弃**，否则用户以为配上了）。
- `maxRounds` / `maxCandidates` / `timeoutMs` 超范围 → 400。

### 3.2 界面（已确认布局）

**一期（深度通道未上线）的呈现**：检索范围可立即生效（S-02 快速通道也读它），而「基础提示词 / Skill / 检索预算 / 思考级别」四块**可编辑但当前路径不读取**。为避免把「改了没反应」换个位置，这四块统一挂一条横幅：

> ⚠ 深度查找上线后生效：当前「AI 查找」走确定性快速检索，不使用提示词 / Skill / 预算。

横幅与旧「未接入」**不混用**：旧文案含义是「功能没实现」，这里含义是「功能已实现、当前这条路径不经过它」——对用户意味着"可以配，但别指望立刻看到差别"。深度通道（S-03）上线后横幅自动消失（由后端返回 `find.deepAvailable` 决定）。

```text
┌─ 检索范围 ─────────────────────────── [默认：当前库 ＋ 已开放] ─┐
│ ① 当前事件所在库（恒定，不可移除）        kisearch-memory        │
│ ② 额外可查 scope / 视图                                         │
│    [ kisearch-docs（视图 · 2 成员）                          × ] │
│    [ 🔍 搜索并选择 scope 或视图…                          ▾ ]   │
│ ③ 只能选你有权访问的库；视图需其全部成员均已授权                │
└─────────────────────────────────────────────────────────────────┘
┌─ 基础提示词 ────────────────────────────────── [恒定生效] ─────┐
│ ┌ 📄 检索定位提示词 ─────────────── 默认 ▸ ──────────────────┐ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
┌─ Skill ─────────────────────────────── [1 / 20 可调用] ────────┐
│ ✦ refs-locate   按事件上下文找候选文档并按相关性排序    [开]   │
│                           ＋ 新增 skill                        │
└─────────────────────────────────────────────────────────────────┘
┌─ 检索预算 ──────────────────────── [默认 4 轮 / 12 候选] ──────┐
│ 最大轮次 [ 4 ]    候选上限 [ 12 ]    超时 [ 45 ] 秒            │
└─────────────────────────────────────────────────────────────────┘
┌─ 思考级别 ──────────────────────────── [跟随模型默认 ▾] ───────┐
└─────────────────────────────────────────────────────────────────┘
┌─ 工具与权限 ────────────────────── [知识库只读 · 默认全开] ────┐
│ ● 知识库只读                                                    │
│   ki_search           混合 / 全文检索知识库               [开]  │
│   ki_get_module_info  读取文档正文                        [开]  │
│   ki_group_list       查看 Group 结构与文档清单            [开]  │
│   ki_tag_list         查看知识库标签                      [开]  │
│ ④ 文件工具（fs_*）本期不提供                                    │
└─────────────────────────────────────────────────────────────────┘
```

| 变更点 | 现状 | 预期 | 类型 |
|---|---|---|---|
| 左栏 ③ 说明 | `确定性检索 · 未接入` | `范围 · 提示词 · Skill · 工具` | 修改 |
| 分组内容 | 1 张提示词卡 | 6 块 | 新增 |
| ① 当前库行 | 无 | 只读展示，不可移除 | 新增 |
| ② 额外范围 | 无 | `ScopeMultiPicker` 多选（选项含视图），逐个 × 移除 | 新增 |
| ③ 权限提示 | 无 | 一句说明 | 新增 |
| ④ 文件工具说明 | 无 | 一句说明 | 新增 |

**落地要点**（复用既有组件与交互范式）

- 复用 `ScopeMultiPicker`（`PromptConfigLayer.tsx:1487` 已在用），选项数据来自 `useScopeList()` 的 `scopes` **与 `views`**；`optionMeta` 显示「视图 · N 成员 / 只读」。
- 落盘时机沿用「映射行即改即存」范式（`PromptConfigLayer.tsx:1490-1502`）：选/删 scope 立即 `PUT`，失败保留草稿并 `fail-loud`。
- 新增 `analysis` → `find` 的 `mutateFind()`，与 `mutateAnalysis` 同构（草稿合并 + 串行落盘队列）。

## 4. 接口设计

### `GET /api/chat/config`（响应增量）

```json
{
  "ok": true,
  "config": { "prompt": { }, "skills": [ ], "tools": { }, "analysis": { } },
  "find": {
    "ranges": { "extraScopes": ["kisearch-docs"] },
    "prompt": { "content": "你是知识库文档检索助手…", "at": "2026-11-16T02:00:00.000Z" },
    "skills": [{ "id": "builtin-refs-locate", "name": "refs-locate", "enabled": true, "builtin": true }],
    "tools": { "ki_search": true, "ki_get_module_info": true, "ki_group_list": true, "ki_tag_list": true },
    "maxRounds": 4, "maxCandidates": 12, "timeoutMs": 45000
  },
  "defaults": { "find": { "ranges": { "extraScopes": [] }, "prompt": { }, "skills": [ ], "tools": { } } },
  "limits": { "findMaxRounds": 8, "findMaxCandidates": 20, "findPromptMaxChars": 8000 },
  "capabilities": { "findDeep": false },
  "softNotes": ["findPrompt 已迁移为 find.prompt"]
}
```

> Demo 返回示例仅示意形状，非最终数据。
>
> `capabilities.findDeep` 是**能力标记**（不是可写配置）：一期后端没有 deep 分支时为 `false`，设置页据此显示"深度查找上线后生效"横幅并禁用模式切换；二期改为 `true` 后横幅自动消失。回写时该字段被忽略。

### `PUT /api/chat/config`（请求增量）

```json
{
  "find": {
    "ranges": { "extraScopes": ["kisearch-docs"] },
    "tools": { "ki_search": false },
    "maxRounds": 6
  }
}
```

- 未出现的子字段 = 沿用既有值（与 `analysisPrompt` 现有语义一致）。
- `find.tools` 采用**增量合并**而非整表替换：只改传入的键，避免前端少传导致工具被静默关闭。

### 失败返回示例

```json
{
  "ok": false,
  "code": "FIND_TARGET_NOT_AUTHORIZED",
  "error": "无权访问检索范围「kisearch-xperts」，请联系管理员授权",
  "details": { "denied": ["kisearch-xperts"], "scope": "kisearch-memory" }
}
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 老配置只有 `findPrompt` | 读取时迁移为 `find.prompt` + `softNotes`，**不写盘** | 是（软提示，不阻断） |
| `find` 内字段类型错误 | 只忽略该字段 + `softNotes`，其余照常 | 是（软提示） |
| `extraScopes` 含不存在的库 / 视图 | PUT 400 `FIND_TARGET_NOT_AUTHORIZED`，`details.missing` 列出 | 是 |
| `extraScopes` 含无权限的库 | PUT **400**（不是 403）：403 会被前端解读成"你不能改配置"，实际是"这个值不可选" | 是 |
| `find.tools` 含未知键 | PUT 400，`details.unknown` 列出键名 | 是 |
| `maxRounds` / `maxCandidates` / `timeoutMs` 越界 | PUT 400，`details.range` 给出合法区间 | 是 |
| 只读账号保存 | 403（沿用现有 `ops.write` 门禁） | 是 |
| 保存请求失败（网络 / 5xx） | 保留草稿 + 底栏红字 + 可重试（沿用现有落盘队列） | 是 |
| 前端拿不到 `find`（旧后端） | 分组显示"服务端未返回 AI 查找配置：通常是后端尚未重启"，控件禁用 | 是 |

## 6. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-01-1 | `find` 独立配置域（不复用 `analysis` 域加字段） | 复用 `analysis` 域放 `ranges`/`findPrompt` | 两能力的 prompt / skills / tools / 预算互不相干，混域会导致「改查找把分析的工具关掉」 | 若两者最终共享同一套工具与预算模型，可合并 |
| D-01-2 | 老 `findPrompt` 只做读取兼容、写入统一进 `find` | 双写两处 | 双写必然漂移；读取侧只需一个版本过渡 | 老字段最后一个使用方下线后可删 |
| D-01-3 | 非法 `extraScopes` 保存即 400（不静默过滤） | 静默丢弃无权项 | 用户会以为配上了，运行期才发现查的是 1 个库，属静默失败 | 若出现「配置后权限被收回」的高频场景，运行期改为剔除 + `skippedTargets` 提示（已在父文档 4.2 定义） |
| D-01-4 | 预算三字段缺省 = 未覆盖（删字段即恢复默认） | 存显式数值 | 运维改默认后，用户侧的"恢复默认"应回到新默认（同 `contextChars` 口径） | 无 |
| D-01-5 | 工具表增量合并 | 整表替换 | 前端漏传一键关全部工具，且后端无法区分「未传」与「全关」 | 无 |
| D-01-6 | 内置 skill `builtin-refs-locate` 默认**启用** | 默认停用（对齐 `doc-editing`） | `doc-editing` 默认停用是因为它依赖写工具且会改文档；查找 skill 只读、是深度通道发挥作用的必要条件，默认关会让"配置了却没用" | 若深度通道上线后该 skill 的加载率 < 30%，改为默认停用 |
| D-01-7 | `extraScopes` 无权限时 PUT 返回 **400** | 返回 403 | 403 与"你不能改配置"同码，前端只能显示一句笼统错误，用户不知道是"值不可选" | 无 |
| D-01-8 | `FindRangeConfig.byScope` **预留但本期不实现** | ① 不预留，届时改结构；② 本期直接实现差异化 | ① 事后加字段要迁移配置，多写一行可选字段几乎零成本；② 需求侧已拍板"全局一份"（Q5），本期上线就做差异化属超范围 | 出现「同一台机器上多个库的事件需要不同检索范围」的实际诉求时 |
| D-01-9 | 一期给四块未生效配置挂**统一横幅**（由后端 `find.deepAvailable` 决定显隐） | ① 沿用「未接入」文案；② 一期先不渲染这四块 | ① 旧文案含义是"功能没实现"，与事实不符（已实现、只是这条路径不读）；② 会让设置页与最终形态差异过大，二期又要整体重做 | 深度通道上线后横幅自动消失，无需评估 |
| D-01-10 | `deepAvailable` 由**后端**返回而非前端按版本猜 | 前端写死开关 | 前后端不同步时前端会撒谎（显示"已生效"但后端没有 deep 分支）；后端一处判断即可 | 无 |

## 7. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/chat/prompt-config.ts` | 新增 `FindConfig` / `defaultFindConfig` / `FIND_TOOL_GROUPS` / 校验与软读取 / `findPrompt` 迁移 |
| `src/lib/chat/retrieval/refs-locate-skill.ts` | **新增**：内置 skill `builtin-refs-locate` 正文（按工具真实语义写） |
| `src/lib/chat/chat-routes.ts` | `GET/PUT /api/chat/config` 透出与接收 `find` |
| `web/src/chat/PromptConfigLayer.tsx` | find 分组 6 块 + `mutateFind` + `kind:'find'` 弹窗改读 `find.prompt` |
| `web/src/chat/promptConfigClone.ts` | 草稿克隆纳入 `find` |
| `web/src/api/chatContract.ts` | 契约类型（`FindConfigDto`、`limits.find*`） |
| `web/src/pages/AiSettingsPage.tsx` | 左栏文案与分组说明 |
| `test/chat/prompt-config.test.ts` | `find` 域读写、老字段迁移、非法值软/硬两路 |

## 8. 待定问题

| # | 问题 | 当前处理 |
|---|---|---|
| U-01-1 | 内置 skill 最终命名（`refs-locate` vs `find-refs`） | 暂定 `refs-locate`，实现时同步界面文案与 `SKILL_REQUIRED_TOOLS` |
| U-01-2 | 提示词上限 `findPromptMaxChars` 取值 | 沿用 `analysisPrompt` 同值（8000），如需差异化再调 |
