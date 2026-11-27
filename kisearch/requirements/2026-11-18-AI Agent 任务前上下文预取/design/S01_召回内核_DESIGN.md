# S-01 召回内核（范围 · 线索 · 确定性检索 · 装配）

父文档：`DESIGN.md`｜依赖：无｜被依赖：S-02、S-03

## 1. 术语

| 术语 | 定义 |
|---|---|
| blocks | 从任务画像切出的语义查询块，每块 8~40 字、最多 4 块，用于 hybrid 语义检索 |
| tokens | 从任务画像与 hints 抽出的精确线索（错误码 / 路径 / 英文标识符 / 中文 n-gram），最多 12 个，用于二次检索与命中理由 |
| target | 参与检索的库名或视图名；装配时必须换成物理库（视图不是物理库） |
| 库内排名（rankInScope） | 同一 target 内按原始分降序的名次，1 = 最高。**跨库只比名次与理由，不比分** |
| 相对分位（score） | 该库本批次内归一化到 0~1 的分数（最高 1.00、最低 0.00），与「AI 查找」快速通道同口径 |

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 快速通道五步：取范围 → 提关键词 → 逐库检索 → 归一化 → 装配 | `src/lib/events/refs-service.ts:254-331` |
| 关键词只吃事件标题 + 关联文档名，**描述不参与** | `src/lib/events/refs-service.ts:324` |
| `extractKeywords` 按空白/标点切词 + 长度 ≥2 + 停用词，中文无标点长句整句成一个 token | `src/lib/events/refs-service.ts:173-180` |
| 范围解析（视图展开、权限剔除、缺失剔除、全有或全无） | `src/lib/events/find-targets.ts:93-143` |
| 候选装配形状（`RefCandidate`：group/name/score/why/visibility/weak） | `src/lib/events/refs-service.ts`（导出类型） |

**缺口**：以上全部以 `eventId` 为输入，且线索来源是短标题。任务画像是 100~2000 字的自然语言，直接套用会退化为「用整句话检索」。

## 3. 方案（TO-BE）

新增独立内核目录，**不修改 `find-runner.ts`**；仅在 `find-targets.ts` 抽出一个公共纯函数（行为等价）。

```
src/lib/recall/
├── types.ts          [新增] 内核共享类型（RecallRequest / RecallCandidate / CoreRecallResult）
├── keywords.ts       [新增] 任务画像 → blocks + tokens
├── targets.ts        [新增] 范围解析（基线库可配），内部调用 find-targets 的公共纯函数
├── fast-recall.ts    [新增] 确定性通道：两路检索 + 归一化 + 去重 + 配额 + 可见性过滤 + 装配
└── assemble.ts       [新增] nextActions / needMore / reason 生成（纯函数，便于单测）

src/lib/events/find-targets.ts   [修改] 新增导出 resolveScopeSet(bases, extras, deps)；
                                           resolveFindTargets 改为调用它（行为等价）
```

### 3.1 范围解析（`targets.ts`）

**范围只有一个来源：调用方显式传入的 `scope`**（库名或视图名，可多个）。服务端不提供默认库、不做任何隐式兜底 —— 这样「这次查了哪个库」永远能从入参复盘，不会出现「AI 心里想的是 A 库、工具实际查了 B 库」这类无法追责的错位。视图按成员库展开，视图本身保留在 `targets` 里（供模型/调用方理解范围），但装配阶段不得把视图名写进 `nextActions`。

**鉴权是硬要求**（`resolveFindTargets` 的基线恒由调用方单独鉴权，recall 没有这一层，必须自己做）：

| 情况 | 行为 | 理由 |
|---|---|---|
| 传入的 scope 不存在 | 收集进 `forbiddenRequested[]`（`reason:'missing'`），由 S-02 抛 `RECALL_SCOPE_UNKNOWN` | 拼错了要立刻知道，不能当成"没有相关文档" |
| 传入的 scope 无权 | 收集进 `forbiddenRequested[]`（`reason:'forbidden'`），由 S-02 抛 `RECALL_SCOPE_FORBIDDEN` | 与 `find-targets.ts:7-9` 相反：那里是配置错、这里是人点名，人点名必须报错 |
| 全部 scope 都被剔除 | 抛 `NO_TARGETS` 交 S-02 映射 `RECALL_TARGETS_EMPTY` | 无范围可查 |
| 未传 scope | 内核直接判非法（`SCOPE_REQUIRED`），由 S-02 直接拒绝并回可用清单 | 见 D-01-5 |

**视图必须展开成物理库再做 IO**（实现期发现的硬约束，2026-11-18）：`targets` 保留视图名只为回显与报错，**检索与可见性判定一律在 `physicalTargets`（成员库）上做** —— 视图不是物理库，`cachesOf(视图)` 恒为空，若拿视图名去读缓存，每一篇命中都会被判成「索引里已不存在」而全部丢弃（候选恒为 0，且不报错）。

**规模上限**：去重后 `targets` 最多 **6** 个（schema 允许 8，解析时截断并进 `skipped{reason:'truncated'}`）；展开后 `physicalTargets` 最多 **12** 个（超出同样置 `truncated`）。两个上限分开的原因：前者限「调用方点了几个」，后者限「最终要查几个库」，而 IO 成本只看后者（检索次数 = 2 × physicalTargets）。

**不得隐式扩库**：范围只来自入参，绝不回退成「该 Token 授权的全部库」，也不读任何服务端默认库——那会把一次误调用变成全库扫描，且让「查了哪个库」不可复盘。

### 3.2 线索抽取（`keywords.ts`）

两路输出，各自承担不同职责：

| 输出 | 生成规则 | 用途 |
|---|---|---|
| `blocks` | 按 `。！？!?;\n` 切句 → 相邻短句合并到 8~40 字 → 超长句 40 字硬切 → 最多 4 块；纯标点段丢弃 | 语义检索 query（hybrid 路） |
| **`strong`** | ① hints 原样（去重） → ② 文件路径 `\S+\.[a-z]{2,4}` → ③ 错误码 `[A-Z]+[-_]?\d{2,}` → ④ 英文标识符 `[A-Za-z][A-Za-z0-9_.-]{1,}` | **主检索 query**（字面路 fulltext + 语义路 hybrid 都用它） |
| **`weak`** | 中文 3-gram 再 2-gram（首尾不得为虚字，去重，≤12） | **只作兜底与理由**，绝不进主 query（碎片会稀释强线索） |

> `tokens = strong + weak`，保留给 `why` 的命中匹配与 `needMore` 判据使用。

**虚字表**（n-gram 首尾过滤，避免「的了和」「是什么」类噪声）：`的 了 和 与 及 在 是 有 不 为 对 把 被 会 要 就 也 都 没 个 这 那 什 么 怎 样 吗 呢 请 帮 我 你 它`

### 3.3 确定性检索（`fast-recall.ts`）

```
① 解析 targets（失败 → 抛内核错误，由 S-02 映射成工具错误码）
② 抽线索；若 blocks 为空：`tokens` 非空（hints 给了错误码/路径）则**只用 tokens 走一次全文检索**；`tokens` 也为空才返回 needMore（不发起检索）
③ **双路并行**（逐 target，各自 topK 20）：
     · 字面路 = `search({ query: strong || weak, mode: 'fulltext' })`
     · 语义路 = `search({ query: strong || blocks || weak })`（hybrid）
   两条路各有盲区：`archive.md` 这类几千行归档会把 hybrid 前几名全占满，
   而 fulltext 能把「名字里就带 `delete-relation`」的目标捞回来（2026-11-18 实测）
④ 逐库把两路结果**交替合并**（fts[0], hybrid[0], fts[1], hybrid[1]…，按 `(group,name)` 去重）
⑤ 归一化：per-target 相对分位 + rankInScope
⑥ 去重：同 (scope, group, name) 保留最高分；**不跨库合并**（不同库的同名文档是不同文档）
⑦ 可见性：resolveVisibilityOfRelation → hidden 剔除（只计数，不暴露名字）
⑧ 配额：每 target ≤3 条，总数 ≤ limit（默认 8）
⑨ 排序：**相关性分级（tier）→ 库内名次 → score → 名称字典序**（保证同输入稳定可复现）
     · tier 1 = 名字或 group 路径含线索词（有证据）；tier 2 = 由线索词召回但名字不含；tier 3 = 纯语义
     · **相关性下限**：优先只留 tier1/2；一条强候选都没有时，才补 ≤2 条 tier3 并标 `weak`
       （没有下限时每库必凑满 3 条，未命中语料永远拿不到「确实没找到」）
⑩ 装配 reason：命中的 tokens（≤3 个）+ 库内名次；无交集写「仅语义相近」
⑪ 同名提示：**只从已通过 ⑦ 可见性过滤的候选集合**里按 `(group, name)` 比对——同一文档在其他库也命中且**同样通过可见性**时才填 `alsoIn: [库名…]`，并在 reason 追加「同名文档还出现在 X 库」；**不合并、不代选权威**（见 D-01-2）。hidden 不得经 `alsoIn` 泄漏（V7）
```

> 不引入模型、不读 prompt-config：一期确定性通道完全不依赖 `llm` 段。

## 4. 接口设计

### 4.1 内核入口

```ts
// src/lib/recall/fast-recall.ts
export interface FastRecallDeps {
  /** 授权名字全集；null = 本机不限权（stdio / 回环） */
  tokenScopes: string[] | null;
  /** 检索适配器（生产用 createSearchAdapter()；测试注入 fake） */
  search: (args: { scope: string; query: string; topK: number; mode?: 'hybrid' | 'fulltext' }) => Promise<RefSearchOutcome | Array<{ group: string; name: string; score: number }>>;
  /** 分片缓存读取（判断文档是否还存在 + 取 lifecycle/eventId 算可见性） */
  cachesOf: (scope: string) => Map<string, { hot_relations: Array<{ text: string; eventId?: string }> }>;
  /** 可见性判定；缺省走 resolveVisibilityOfRelation（注入便于单测） */
  resolveVisibility?: (scope: string, rel: unknown) => Visibility;
  /** 范围解析注入点（listScopes / listViews / config），测试用 */
  scopeDeps?: Omit<FindTargetDeps, 'tokenScopes'>;
  now?: () => number;
}

export async function runFastRecall(req: RecallRequest, deps: FastRecallDeps): Promise<CoreRecallResult>;
```

### 4.2 线索抽取

```ts
// src/lib/recall/keywords.ts
export interface RecallTerms { blocks: string[]; tokens: string[] }

export function extractRecallTerms(args: {
  task: string;
  hints?: string[];
  maxBlocks?: number;    // 默认 4
  maxTokens?: number;    // 默认 12
}): RecallTerms;
```

### 4.3 范围解析

```ts
// src/lib/recall/targets.ts
export interface ResolveRecallTargetsResult {
  targets: string[];                    // 已去重、已鉴权、截断到 ≤6；**可能是视图名（仅回显）**
  physicalTargets: string[];            // 视图已展开为成员库，截断到 ≤12；检索与可见性判定只用它
  skipped: RecallSkipped[];             // 被剔除的（含 {reason:'truncated'}）
  forbiddenRequested: RecallSkipped[];  // 传入的 scope 里无权 / 不存在的（由 S-02 直接报错）
  truncated: boolean;                   // targets 或 physicalTargets 被截断
}

export function resolveRecallTargets(args: {
  requested: string[];             // 必填；空数组 → 抛 SCOPE_REQUIRED
  tokenScopes: string[] | null;    // null = 本机不限
  maxTargets?: number;             // 默认 6
  deps?: { listScopes?: () => string[]; listViews?: () => Record<string, { members: string[] }> };
  viewMembers?: (name: string) => string[] | null;   // 测试注入；缺省读 views.json
}): ResolveRecallTargetsResult;
```

### 4.4 返回示例（内核层，非最终工具响应）

```json
{
  "targets": ["kisearch-memory", "kisearch-docs"],
  "skipped": [{ "name": "old-kb", "reason": "missing" }],
  "query": "事件参考文档上传失败 报错 422 上传文件",
  "candidates": [
    {
      "scope": "kisearch-memory",
      "group": "错误库/Web前端界面",
      "name": "上传通道的 wiki 回写口径",
      "score": 0.87,
      "rankInScope": 1,
      "why": "命中：上传 · 回写 · 422",
      "visibility": "full",
      "weak": false
    }
  ],
  "excludedHidden": 1,
  "durationMs": 412
}
```

## 5. 数据模型

```ts
export interface RecallRequest {
  scope: string[];        // **必填**：库名或视图名，≥1 项；S-02 已把 string|string[] 归一化为数组
  task: string;
  hints?: string[];
  exclude?: string[];     // "scope::group::name" | "group::name"
  limit: number;          // 1..20
}

export interface RecallCandidate {
  scope: string;          // 物理库（视图已展开）
  group: string;
  name: string;
  score: number;          // 库内相对分位 0..1
  rankInScope: number;    // 1 = 库内最高
  why: string;            // 命中线索 / 库内名次 / 仅语义相近 / 同名提示
  alsoIn?: string[];      // 其他库里存在 (group,name) 相同的文档（只提示，不合并、不代选）
  visibility: 'full' | 'fts-only' | 'hidden';
  weak: boolean;          // score < 0.6
}

export interface CoreRecallResult {
  targets: string[];                    // 回显用（可能是视图名）
  skipped: RecallSkipped[];             // 含 reason='truncated'
  forbiddenRequested: RecallSkipped[];  // 点名却不存在/无权（工具层据此报错）
  query: string;
  candidates: RecallCandidate[];        // 每条 scope 恒为**物理库**
  excludedHidden: number;               // hidden 剔除计数（只给数）
  dropped: number;                      // 已读/索引中已不存在
  needMore: NeedMoreItem[];
  truncated: boolean;
  durationMs: number;
  partial?: boolean;
}
```

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `task` 抽出 0 个 blocks（纯符号 / 纯停用词） | 不发起检索，返回空候选 + `needMore: ['symptom']` | 是（作为数据返回，不抛错） |
| 所有 target 被权限/缺失剔除 | 抛内核错误 `NO_TARGETS`，由 S-02 映射为 `RECALL_TARGETS_EMPTY` | 是 |
| 单个 target 检索失败 | 记 `targetErrors`，其余照常；全部失败才抛 `ALL_TARGETS_FAILED` | 是（部分失败只体现在候选数） |
| 同库同名候选来自多个分块 | 合并取最高分，`chunkHits` 计数 | 否（内部去重） |
| 文档已 hidden | 剔除并计入 `excludedHidden`（不返回名字） | 计数暴露，名字不暴露 |
| 候选文档在 caches 中不存在 | 剔除（防幻觉命中） | 否 |

## 7. 性能安全

| 项 | 取值 | 说明 |
|---|---|---|
| 每次调用检索次数 | ≤ 2 × targets.length（主 + 备） | 主检索命中充足时不发起备检索 |
| `topK` | 20 | 与快速通道一致 |
| 候选装配规模 | ≤ 20（limit 上限） | 单条 reason ≤ 80 字 |
| 线索抽取耗时 | 目标 < 5ms / 2000 字 | 纯字符串扫描，无正则回溯风险（正则均为线性） |
| 依赖文档数扫描 | 只读 `hot_relations` 文本匹配 | 与 `refs-service` 同口径 |

## 8. 影响范围

| 文件 | 类型 | 影响面 | 回归要求 |
|---|---|---|---|
| `src/lib/recall/{types,keywords,targets,fast-recall,assemble}.ts` | 新增 | 无既有调用方 | 新增单测（见 §8 验收） |
| `src/lib/events/find-targets.ts` | 修改 | **「AI 查找」快速与深度通道共用**该文件的范围解析 | `resolveFindTargets` 行为必须逐字等价：跑 find 相关的现有测试 + 范围解析单测 |
| `src/lib/events/refs-service.ts` | 只读复用（`RefSearchOutcome` 类型与分块口径） | 不改代码 | — |

**会被波及的既有功能**：事件详情「AI 查找」的全部候选数量、跳过提示、库统计口径（一旦 `resolveScopeSet` 抽错，报错会出现在 find 侧而不是 recall 侧）。因此该改动必须单独一个提交、单独验证，不与 recall 其余部分混提交。

**不受影响**：`find-runner.ts`（一行不改）、`find-service.ts`、`refs-service` 的快速五步逻辑。

## 9. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-01-1 | 两路检索（语义块 + 精确词），备路仅在命中不足时触发 | 单路 `keywords.join(' ')`（照抄 find 快速通道） | 长句拼成一个 query 会让语义与字面互相稀释 | 真机 10 个任务中 ≥3 个出现「备路贡献 0 条」 |
| D-01-2 | 跨库**不合并**同名文档，但用 `alsoIn` 显式提示「这些库还有同名文档」 | 按 `(group,name)` 合并为一条 | 不同库的同名文档是不同版本，合并会让 Agent 以为只有一篇，直接拿其中一份下结论 | 试点出现 ≥3 次「读到两个版本仍不知以谁为准」 |
| D-01-3 | 只读 `find-targets.ts` 抽公共纯函数，不改 `find-runner.ts` | 抽公共 tool-loop core 供两边复用 | find 900 行事件耦合，回归面覆盖全部 find 测试；一期不值 | 两份循环出现第 2 次需同步修改 |
| D-01-4 | 排序用「库内名次优先、分数次之」 | 直接按归一化分跨库排序 | 不同库分数量纲不同，横比会误排 | 无（与 `docs/ai-find.md:34-40` 既有口径一致） |
| D-01-5 | **范围只来自入参，`scope` 必填** | 服务端 `recall.defaultScopes` 兜底 / 回退 `default` 库 | 范围有两个来源 ⇒ 查错库时无法判断是"传错"还是"默认选错"；后台多库部署下这种错位几乎不可复盘（用户 2026-11-18 拍板） | 出现「同一次会话内必须换库」频率 ≥30%（说明 scope 粒度太粗） |
| D-01-6 | 主检索用**强线索**，中文 n-gram 只作兜底 | 用整句任务描述做主 query（首版做法） | 真机：长句 90% 是虚词，语义侧被 `archive.md` 等泛化文档占满，目标文档连 top5 都进不去 | 强线索为空时自动回落语义块（已实现），无需再评估 |
| D-01-7 | **字面 + 语义双路并行、逐库交替合并** | 主路 + 命中不足才跑备路 | 真机：同一 query 下 hybrid 找不到的目标，fulltext 排第 2；只在"命中 < 3"时才补，等于永不触发 | 检索延迟翻倍不可接受时（当前单次 ~200–800ms） |
| D-01-8 | **相关性分级 + 下限**（tier1/2 才返回，tier3 仅兜底 ≤2 条并标 weak）；tier1 另需**检索强度下限**（库内 ≤10 名 或 相对分 ≥0.5） | 只按 `score`（库内相对分位）排序并每库凑满 3 条 | `score` 是**库内相对分位**，噪声文档只要库内第一就是 1.00；无下限时未命中语料 5/5 都能凑出 3 条"看似相关"。而只按「名字含线索」判 tier1 又会让弱命中上位（M2 实测 top1 是库内第 28、分 0.16 的文档） | tier1 误报率仍高时（如 M5 型「字面像、语义不同」），转二期 deep 读正文 |

## 10. 待定问题

| # | 问题 | 影响 | 结论来源 |
|---|---|---|---|
| 1 | 中文 n-gram 是否需要按部署语言切换（纯英文库） | 英文场景 tokens 仍可用标识符路径覆盖，n-gram 分支自然为空 | 一期不做，观察试点 |
