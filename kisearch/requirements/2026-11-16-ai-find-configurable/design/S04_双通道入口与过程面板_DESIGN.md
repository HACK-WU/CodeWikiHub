# S-04 双通道入口与过程面板

- 父文档：`DESIGN.md`
- 承接需求：R4（文案）、R5（双通道）、R10（过程面板真实记录）、R3（失败与退路）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 快速通道 | 确定性五步，秒级、可复现、零 LLM 成本（缺省模式） |
| 深度通道 | LLM + 只读工具，召回更高但慢且计费（显式选择） |
| 真实调用记录 | `RefSearchStep.calls` 里由后端写入的实际工具调用（名称、动作、耗时、备注） |
| 不完整结果 | 因轮次或超时提前结束时返回的候选，带 `partial` 标记 |

## 2. 现状（AS-IS）

| 事实 | 证据 |
|---|---|
| 弹窗打开即请求，无模式概念 | `web/src/components/governance/FindRefModal.tsx:68-85` |
| 前端 API 只支持 `topK` / `limit` | `web/src/api/governanceApi.ts:590-599` |
| `req()` 用裸 `fetch`，**无超时、无 AbortSignal** | `governanceApi.ts:40-60` |
| 过程面板步骤名写死 5 个（`Record<RefSearchStep['name'], string>`） | `web/src/components/governance/AiProcessPanel.tsx:44-50` |
| 面板明确「不伪造调用 chip」、结果出来后自动折叠 | `AiProcessPanel.tsx:1-12` |
| 候选行只显示 `group · 可见性 · 分数` | `FindRefModal.tsx:173-194` |
| 0 候选按 `reason` 四句不同文案 | `FindRefModal.tsx:205-207`、`AiProcessPanel.tsx:emptyReasonText` |
| 空态文案里已声明「分数是批次内相对分位」 | `FindRefModal.tsx:196-201` |

## 3. 方案（TO-BE）

### 3.1 模式入口

弹窗头部右侧新增分段切换，**缺省「快速查找」**：

```text
┌ AI 查找相关文档 ───────────────────── [ 快速 | 深度 ] ─┐
│ 基于事件标题与 3 篇关联文档，检索 2 个库（含 1 个视图）  │
```

| 行为 | 快速 | 深度 |
|---|---|---|
| 触发方式 | 弹窗打开自动执行（现状） | **点击「深度查找」才执行**（避免一开弹窗就计费） |
| 进行中 | 显示 loading + 已用时 | 显示 loading + 已用时 + 「停止」按钮 |
| 切换模式 | 切到深度 → 清空上次结果并提示「点深度查找开始」 | 切到快速 → 重新自动执行 |

### 3.2 前端接口

```ts
// web/src/api/governanceApi.ts
export function findRefCandidates(
  scope: string,
  eventId: string,
  opts: {
    mode?: 'fast' | 'deep';
    topK?: number;
    limit?: number;
    threshold?: number;
    /** 新增：可取消（关弹窗 / 点停止 / 切模式） */
    signal?: AbortSignal;
    /**
     * 新增：客户端超时。
     * fast 缺省 15s；deep 缺省 = `GET /api/chat/config` 的 `find.timeoutMs` **+ 10s 余量**。
     * 不用写死 60s：用户把服务端 timeoutMs 配到 60s 时，前端会先掐断，而后端仍在跑并计费。
     */
    timeoutMs?: number;
  } = {},
): Promise<RefSearchResult>;
```

```ts
async function req<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const ctrl = new AbortController();
  const timer = init?.timeoutMs ? setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), init.timeoutMs) : null;
  const signal = init?.signal ? AbortSignal.any([init.signal, ctrl.signal]) : ctrl.signal;
  try {
    const res = await fetch(path, { ...init, signal, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    // …既有解析逻辑不变
  } finally {
    if (timer) clearTimeout(timer);
  }
}
```

- abort 与超时**必须区分**：`TimeoutError` → 提示「查找超时，可改用快速查找」；用户主动 abort → 静默丢弃（不弹错）。
- 关弹窗时 `abort()`：后端收到连接关闭会中止上游（S-03 的 `signal`）。

### 3.3 过程面板

**契约变更**：`RefSearchStepName` 联合类型由 5 个扩为 7 个。

```ts
type RefSearchStepName = 'understand' | 'extract' | 'search' | 'exclude' | 'rank' | 'tools' | 'verify';
```

| 模式 | steps 组成 |
|---|---|
| 快速 | `understand → extract → search → exclude → rank`（**与现状逐字段一致**） |
| 深度 | `understand → tools×N（每轮一条，含 calls）→ verify → rank` |

```ts
// STEP_TITLES 增量（前端）
tools: '工具调用',
verify: '校验候选',
```

深度模式的一条 `tools` 步骤示例（每个数字都来自后端）：

```json
{
  "name": "tools",
  "ms": 3120,
  "metrics": { "round": 1, "calls": 2, "hits": 14 },
  "calls": [
    { "kind": "tool", "name": "ki_search", "label": "检索候选", "ms": 1804, "note": "范围：kisearch-memory,kisearch-docs" },
    { "kind": "tool", "name": "ki_get_module_info", "label": "读取正文", "ms": 1316 }
  ]
}
```

**面板硬约束（沿用现状三条，不放宽）**：

1. 所有数字来自后端 `steps`，前端不推算；
2. 不做逐步回放动画（同步请求无中间事件），loading 期间只显示**客户端真实已用时**；
3. 不标后端未发生的 skill / 工具调用。

**新增呈现态**：

| 态 | 呈现 |
|---|---|
| `partial.reason='timeout'` | 候选列表上方黄色提示条：「超出 45 秒，已返回部分结果；可缩小检索范围或改用快速查找」 |
| `partial.reason='rounds'` | 「已达最大轮次 N，结果可能不完整」 |
| `skippedTargets` 非空 | 灰色提示：「已按权限收窄：`kisearch-xperts` 无访问权限」 |
| `targetErrors` 非空 | 「`kisearch-docs` 本次检索失败（HTTP 503），其余库结果正常」 |
| `unconfirmedCount > 0`（深度） | 折叠区：「模型给出 N 项未通过校验（越界 / 不存在 / 已关联）」，展开可见明细 |
| 深度 0 候选 | 文案区分：「模型在范围内未找到相关文档」/「模型给出的候选均未通过校验」 |

### 3.4 候选行（跨库）

```text
[x] 部署回滚手册
    部署运维 · ①kisearch-memory · 语义+全文 · 0.87 · 库内 #1
    命中「回滚」· 2 处命中
[ ] 发布检查清单
    运维规范 · ①kisearch-docs · 语义+全文 · 0.74 · 库内 #1
```

**默认勾选策略按通道区分**（依据 `origin`）：

| origin | 策略 | 理由 |
|---|---|---|
| `fast` | 沿用现状 `score >= 0.6` | 分数是检索真实产出，可直接当相关度 |
| `deep` | 勾选**模型输出顺序的前 K 条**（K = `min(candidates.length, limit)`），**不看 score** | 模型可能完全没调 `ki_search`（score 全 0），按分数会把全部候选默认不勾，用户要逐条手动勾；模型已经做过一轮筛选，顺序就是它的置信排序 |

- 库名徽标仅在 `targets.length > 1` 时显示（单库查找保持现状视觉）。
- 「库内 #N」仅在多库且 `rankInScope` 存在时显示。
- `visibility === 'hidden'` 的候选行显示来源事件：
  - `visibilityReason.kind === 'event-open'` → 可勾选 + 提示「当前不可检索（事件 #N 排查中），流转到可检索阶段后可用」；
  - `event-closed` → 勾选框禁用 + 提示「被已收口事件 #N 锁定，加入后也读不到」（后端仍 409 兜底）。

### 3.5 加入引用

- 提交体带 `sourceScope`（`RefCandidate.scope`）。
- 成功后局部刷新参考文档区（现状 `onAdded` 逻辑不变）。
- 失败码处理：`FIND_TARGET_NOT_AUTHORIZED` → 提示「已失去该库权限，请刷新」；`REF_DOC_NOT_FOUND` → 「该文档已被删除」；`REF_DOC_NOT_SEARCHABLE` → 「该文档被已收口事件锁定，加入后 AI 也读不到」。

### 3.6 文案统一（R4）

| 位置 | 现状 | 预期 |
|---|---|---|
| `AiSettingsPage` 左栏 ③ | `确定性检索 · 未接入` | `范围 · 提示词 · Skill · 工具` |
| find 分组说明 | 「当前是确定性检索……这里暂时没有生效点」 | 「深度查找时注入；快速查找不使用提示词」 |
| 弹窗底部按钮 | `⚙ 提示词设置` | `⚙ AI 查找设置` |
| 页面级说明 | 「提示词与 Skill 对之后新建的会话 / 调用生效」 | 追加「AI 查找的改动对下一次查找生效」 |

## 4. 接口设计（前端 DTO 增量）

```ts
export interface RefCandidateDto {
  origin: 'fast' | 'deep';  // 新增：决定默认勾选策略
  scope: string;            // 新增
  rankInScope?: number;     // 新增（deep 通道可缺省）
  rawScore?: number;        // 新增（deep 通道可缺省）
  group: string; name: string; score: number; why: string;
  matchedKeywords: string[]; weak: boolean; visibility: Visibility;
  visibilityReason?: { kind: 'event-open' | 'event-closed'; eventId: string; shortId: number; title: string };  // 新增
  chunkHits: number;
}

export interface RefSearchResultDto {
  targets: string[];                                   // 新增
  skippedTargets?: Array<{ name: string; reason: 'forbidden'|'missing'|'view-members-changed' }>;
  targetErrors?: Array<{ name: string; error: string }>;
  totalByScope?: Array<{ scope: string; docs: number }>;  // 新增：多库时按库计数
  unconfirmedCount?: number;                           // 新增（深度）
  partial?: { reason: 'rounds' | 'timeout'; usedRounds: number };  // 新增
  candidates: RefCandidateDto[]; steps: RefSearchStepDto[];
  total: number; durationMs: number; query: string;
  mode?: 'hybrid' | 'fulltext'; reason?: RefSearchReason;
  degraded?: boolean; degradedReason?: string;
}
```

Demo 响应（深度、部分成功）：

```json
{
  "ok": true,
  "scope": "kisearch-memory",
  "targets": ["kisearch-memory", "kisearch-docs"],
  "skippedTargets": [{ "name": "kisearch-xperts", "reason": "forbidden" }],
  "targetErrors": [{ "name": "kisearch-docs", "error": "HTTP 503" }],
  "partial": { "reason": "timeout", "usedRounds": 2 },
  "unconfirmedCount": 3,
  "candidates": [],
  "steps": [{ "name": "tools", "ms": 3120, "metrics": { "round": 1, "calls": 2 } }],
  "total": 2143,
  "durationMs": 45210,
  "query": "登录 白屏"
}
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 用户点「停止」 | abort → 关闭 loading → 回到上次结果（若有） | 是（按钮态） |
| 关闭弹窗（进行中） | abort，不弹错、不写库 | 否 |
| 客户端超时（deep = 服务端 `find.timeoutMs` + 10s） | 提示「查找超时」+「改用快速查找」按钮 | 是 |
| 服务端 504 `FIND_TIMEOUT` | 同上 | 是 |
| 409 `FIND_BUSY` | 「已有一次查找在进行中，请稍后」 | 是 |
| 429 配额 | 「今日深度查找次数已用完，可改用快速查找」 | 是 |
| 409 `REF_DOC_NOT_SEARCHABLE` | 「该文档被已收口事件锁定，加入后 AI 也读不到」；候选行本应已禁用勾选，属兜底 | 是 |
| `capabilities.findDeep === false`（一期） | 模式切换整体禁用并显示 tooltip「深度查找上线后生效」，不给点击后才报错 | 是 |
| 快速通道 503 | 沿用现状「重试 / 改用手动添加」 | 是 |

## 6. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-04-1 | 缺省走快速通道，深度需显式点击 | 缺省深度（召回优先） | 打开弹窗即计费且等 10–45s，属"最常用动作被最贵路径承接" | 若实测深度命中率显著高于快速且用户每次都切，改为记忆上次选择 |
| D-04-2 | 深度模式不自动执行，需点击 | 切到深度即执行 | 切换是浏览行为，不是承诺；误触即产生成本 | 无 |
| D-04-3 | 步骤名扩展 2 个（`tools` / `verify`）而非复用 `search`/`rank` | 复用既有 5 个名字承载深度语义 | 面板会把「工具调用」显示成「语义检索」，属标签撒谎 | 无 |
| D-04-4 | loading 期间只显示客户端计时，不做轮次进度 | 轮询 / SSE 推送真实进度 | 需要把同步请求改成异步草稿（回退 D-03-1）或加 SSE 通道，成本远大于收益 | 若实测平均等待 > 30s 且中途放弃率 > 20%，改异步 + 进度 |
| D-04-5 | 库名徽标仅多库时显示 | 永远显示库名 | 单库查找是绝大多数场景，常驻库名等于噪声 | 无 |
| D-04-6 | deep 客户端超时 = 服务端 `find.timeoutMs` **+10s**（动态取） | 前端写死 60s | 服务端上限也是 60s，写死会在用户配 60s 时先掐断，而后端仍在跑并计费（用户看到超时、账单照走） | 无 |
| D-04-7 | deep 默认勾选按模型输出顺序 | 沿用 `score >= 0.6` | 同 S-03 D-03-7：模型可能没走检索，score 全 0，按分数会全部默认不勾 | 同 S-03 D-03-7 |
| D-04-8 | `findDeep=false` 时模式切换整体禁用 + tooltip | 允许点击后报错 | 点击后才报错属「先给希望再打脸」；禁用 + 说明是同一信息的更早暴露 | 无 |

## 7. 影响范围

| 文件 | 改动 |
|---|---|
| `web/src/api/governanceApi.ts` | `req` 支持 `signal`/`timeoutMs`；`findRefCandidates` 增 `mode`/`signal`；`addRefs` 带 `sourceScope`；新增 `removeRef` 传 `sourceScope` |
| `web/src/api/governanceContract.ts` | DTO 增量（见 §4） |
| `web/src/components/governance/FindRefModal.tsx` | 模式切换、停止按钮、跨库候选行、新增提示态 |
| `web/src/components/governance/AiProcessPanel.tsx` | `STEP_TITLES` 扩两项；`partial` / `skippedTargets` / `targetErrors` / `unconfirmed` 呈现 |
| `web/src/pages/EventsPage.tsx` | 参考文档行显示库名（跨库引用）；删除传 `sourceScope` |
| `web/src/pages/AiSettingsPage.tsx` | 左栏与页面级文案（与 S-01 合并改） |
| `web/test/*` | 新增：模式切换不自动执行、abort 不弹错、partial 文案、跨库徽标条件渲染 |

## 8. 待定问题

| # | 问题 | 当前处理 |
|---|---|---|
| U-04-1 | 深度查找的「停止」是否需要二次确认 | 缺省不需要（可重复操作，无副作用） |
| U-04-2 | 是否记忆上次选择的模式（localStorage） | 一期不记忆，缺省快速；若用户抱怨频繁切换再加 |
