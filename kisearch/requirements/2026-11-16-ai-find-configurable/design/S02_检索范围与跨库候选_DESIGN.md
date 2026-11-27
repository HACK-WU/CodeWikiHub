# S-02 检索范围与跨库候选

- 父文档：`DESIGN.md`
- 承接需求：R1（检索范围可配）、R2（跨库候选可回指/可加入）、R3（范围类失败可见）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 检索单元（target） | 一个参与检索的库名或视图名。视图在 `executeSearch` 内部展开为成员库 |
| 源库（`sourceScope`） | 候选 / 引用文档**实际所在**的库；缺省 = 事件所在库（老数据） |
| 批次分位 | 同一次查找内所有候选的 min-max 归一化分数（沿用现状口径，**不是**绝对相似度） |
| 库内排名 | 候选在其源库内的分数名次（1 = 该库最高），新增字段，用于缓解跨库分数不可比 |

## 2. 现状（AS-IS）

| 事实 | 证据 |
|---|---|
| 候选检索只接一个 `scope`，五步全在单库内完成 | `src/lib/events/refs-service.ts:181-353` |
| 分组缓存与文档总数只读事件库 | `refs-service.ts:206`、`group-cache.ts:436` |
| 可见性按事件库解析 | `refs-service.ts:309`、`visibility-index.ts:503` |
| 归属排除按 `group\0name`，无库维度 | `refs-service.ts:277-282` |
| 引用去重 key 是 `group\0name`（**跨库同名会误判已存在**） | `refs-store.ts:50` |
| 删除引用只按 `group + name`（**跨库会删错**） | `refs-store.ts:69`、`governance-http.ts:701-705` |
| 检索适配器丢弃 `hit.scope` | `refs-search.ts:71-76` |
| 请求侧 `assertScope` 只校验传入的那一个 scope | `governance-http.ts:221-244` |
| `executeSearch` 已支持多 scope 与视图展开，`SearchHit.scope` 已存在 | `search.ts:151`、`:345` |
| 分数口径：同批次 min-max 归一化，UI 已声明「批次内相对分位」 | `refs-service.ts:294`、`FindRefModal.tsx:196-201` |

## 3. 方案（TO-BE）

### 3.1 检索范围解析（新增 `src/lib/events/find-targets.ts`）

```ts
export interface FindTargetResolution {
  /** 实际参与检索的单元，顺序 = [事件库, ...extraScopes]（去重后） */
  targets: string[];
  /** 配置里存在但本次被剔除的项（无授权 / 已不存在 / 视图成员变更） */
  skipped: Array<{ name: string; reason: 'forbidden' | 'missing' | 'view-members-changed' }>;
}

/**
 * 解析检索范围。
 * @param eventScope 事件所在库（恒定在范围内）
 * @param cfg        find 配置（只读）
 * @param tokenScopes 当前请求的授权名字全集（含视图授权合并结果）
 */
export function resolveFindTargets(
  eventScope: string,
  cfg: FindConfig,
  tokenScopes: string[],
  opts?: { listScopes?: () => string[]; listViews?: () => string[] },
): FindTargetResolution;
```

规则：

1. `targets[0] = eventScope` 恒在（且**必须先通过鉴权**，否则整个请求 403）。
2. 遍历 `cfg.ranges.extraScopes`：
   - 逐个 `isScopeAccessAllowed(tokenScopes, name)`；不通过 → 计入 `skipped(forbidden)`（**运行期剔除，不抛错**；保存路径才抛 400）。
   - 名字已不在 `scopes ∪ views` → `skipped(missing)`。
   - 是视图且本次解析到 0 成员 → `skipped(view-members-changed)`。
3. 去重（同名只保留一次），保持 `[eventScope, ...extra]` 顺序。
4. `targets.length === 1 && extraScopes.length > 0` 时响应带 `skippedTargets`，前端提示「已按权限收窄到 1 个库」。
5. **不自建缓存**：`views.json` 与视图成员展开一律复用 `scope-access.ts:49` 的 mtime 快照（`loadViewsCached`），scopes 列表复用 `useScopeList` 的同一份数据源；本模块只做纯函数组装，禁止再写一套带 TTL 的缓存（会出现「授权用旧成员、展开用新成员」的越权窗口，该坑已在 `scope-access.ts:42-48` 记录）。

### 3.2 多库检索（改造 `searchRefCandidates`）

```ts
export async function searchRefCandidates(
  scope: string,
  eventRef: string,
  deps: RefSearchDeps,
  opts: { targets: string[]; topK?: number; limit?: number; threshold?: number },
): Promise<RefSearchResult>;
```

- **逐 target 调用 `deps.search({ scope: target, query, topK })`**，任一 target 抛错只标记该 target 失败（`targetErrors`），不让整次查找失败（唯一例外：**全部** target 都抛错 → `SEARCH_UNAVAILABLE` 503）。
- **失败与空库必须可区分**：`targetErrors` 非空时不判 `reason='empty-scope'`（"查不了"≠"没内容"）。`empty-scope` 只在**全部 target 均检索成功且文档总数为 0** 时给出；部分失败时 `reason` 保持 `undefined` 并由前端按 `targetErrors` 单独提示。
- 每个 target 的 `hits` 打上 `sourceScope = hit.scope ?? target`（视图展开后 `hit.scope` 是成员库，优先用它）。
- 文档聚合 key 改为 `sourceScope\0group\0name`；`chunkHits` 仍按该 key 累加。
- 文档总数 `total` = 各 target 的 `countAllDocs` 之和，同时返回 `totalByScope: Array<{ scope: string; docs: number }>`；`empty-scope` 判定改为全部 target 都为 0 篇。**多库时 `total` 的语义从「这个库有多少篇」变成「参与检索的库共多少篇」**，过程面板文案必须同步改为「共 N 篇（M 个库）」，否则用户会拿它跟单库数字对比而困惑。
- 可见性改为 `resolveVisibilityOfRelation(sourceScope, rel)`，`rel` 从 `readAllGroupCaches(sourceScope)` 取（按库缓存，避免 N×M 次读）。
- 排除已用：`members` 与 `refs` 的 key 统一为 `sourceScope\0group\0name`。

### 3.3 分数与排序

```ts
interface RefCandidate {
  /** 新增：通道来源，决定前端默认勾选策略（见 S-04 §3.4） */
  origin: 'fast' | 'deep';
  /** 新增：候选文档所在库（视图检索时是成员库，不是视图名） */
  scope: string;
  group: string;
  name: string;
  /** fast：批次分位；deep：库内最后一次命中分（模型未检索到则为 0，不代表无关） */
  score: number;
  /** 新增：该文档在其源库内的分数名次（1 = 库内最高；deep 通道无检索分时省略） */
  rankInScope?: number;
  /** 新增：该文档原始检索分（RRF 融合分，跨库不可比，仅供排障） */
  rawScore?: number;
  why: string;
  matchedKeywords: string[];
  weak: boolean;
  visibility: Visibility;
  /** 新增：`visibility='hidden'` 时给出原因与来源事件，供前端强提示（见 §3.4 可检索性） */
  visibilityReason?: { kind: 'event-open' | 'event-closed'; eventId: string; shortId: number; title: string };
  chunkHits: number;
}
```

- 排序：`score` 降序 → `scope` 字典序 → `group/name`（**加后两级是为了让同一输入的结果稳定可断言**）。
- `weak` / 默认勾选阈值仍按批次分位 0.6（现状值）。
- UI 文案补充一句：「跨库比较时分数为全批次相对分位，与单库查找的数值不可直接对照；可参考「库内排名」」。

### 3.4 引用读写

```ts
// src/lib/events/refs-store.ts
const refKey = (r: { scope?: string; sourceScope?: string; group: string; name: string }): string =>
  `${r.sourceScope ?? r.scope ?? ''}\u0000${r.group}\u0000${r.name}`;

export function addRefDocs(scope: string, eventId: string, incoming: EventRefDoc[], now: number)
  : { added: EventRefDoc[]; skipped: EventRefDoc[] };   // 内部改用 refKey

export function removeRefDoc(
  scope: string, eventId: string,
  target: { sourceScope?: string; group: string; name: string },
  now: number,
): boolean;   // 老调用方不传 sourceScope 时按「事件库」匹配，向后兼容
```

```ts
// src/lib/events/refs-service.ts —— 签名与加入前校验
export interface AddRefsInput {
  docs: Array<{ sourceScope?: string; group: string; name: string; score?: number }>;
  addedBy: 'ai' | 'manual';
  /**
   * 授权名字全集（含视图授权合并结果）。
   * 由 HTTP 层从鉴权上下文注入（与 `assertScope` 同一来源，见 `governance-http.ts:222`）；
   * 缺省 = 跳过跨库鉴权，仅用于 CLI / 内部调用与测试 —— HTTP 路由**必须**传。
   */
  tokenScopes?: string[];
}

export function addRefs(scope: string, eventRef: string, input: AddRefsInput): { added: number; skipped: string[] } {
  for (const doc of input.docs) {
    const src = doc.sourceScope ?? scope;
    if (input.tokenScopes && !isScopeAccessAllowed(input.tokenScopes, src)) {
      throw new GovernanceError('FIND_TARGET_NOT_AUTHORIZED', `无权引用库「${src}」中的文档`, { sourceScope: src });
    }
    // 存在性校验：目标库分片里找不到该 relation → REF_DOC_NOT_FOUND（防止伪造路径写脏数据）

    // 可检索性校验：源文档被某个事件绑定在不可检索阶段时，分两种情况处理
    const vis = resolveVisibilityOfRelation(src, rel);   // rel 来自 readAllGroupCaches(src)
    if (vis.mode === 'hidden') {
      const owner = rel.eventId ? findEventIn(readAllEvents(src), rel.eventId) : null;
      if (!owner || isEventClosed(owner)) {
        throw new GovernanceError(
          'REF_DOC_NOT_SEARCHABLE',
          `「${doc.name}」被已收口事件 ${owner ? `#${owner.shortId}` : ''} 锁在不可检索阶段，加入后 AI 也读不到`,
          { sourceScope: src, eventId: owner?.id ?? null },
        );
      }
      // 源事件未收口：允许加入（阶段流转到可检索后即可用），前端在候选行强提示，不拦
    }
  }
  // …其余逻辑不变
}
```

> `removeRef` 同样接收 `tokenScopes`（删除他人库的引用与加入同样危险），签名与 `addRefs` 保持一致。

**为什么「未收口放行、已收口拒绝」而不是一律禁止或一律放行**：

- 一律放行 → 用户加了却永远检索不到（幽灵引用），且跨库后源事件不可见，用户无法自查；
- 一律禁止 → 挡住合法场景：文档只是因为所在事件"排查中"暂时不可检索，事件流转后就能用；
- 分界线取「事件是否已收口」：收口是**不可逆**的终点（`isEventClosed`），未收口是**可逆**的中间态。

## 4. 数据模型

| 结构 | 变更 | 兼容策略 |
|---|---|---|
| `EventRefDoc` | 新增可选 `sourceScope?: string` | 老 `refs.json` 无该字段 → 读取时视同 `scope`；**不做批量回写**（避免启动时全量改盘） |
| `RefCandidate`（响应） | 新增 `origin` / `scope` / `rankInScope?` / `rawScore?` / `visibilityReason?` | 新增字段，前端旧版本忽略；`rankInScope` / `rawScore` 在 deep 通道可缺省 |
| `RefSearchResult` | 新增 `targets: string[]`、`skippedTargets?`、`targetErrors?`、`totalByScope?` | 同上 |
| `ListRefsResult.refs[].staleReason` | 新增 `'doc-deleted' \| 'scope-missing'` | 仅当 `stale=true` 时出现；老前端读不到该字段时仍按「文档已删除」展示（现状行为） |
| `.refs.json` 版本 | 仍为 `version: 1` | 新字段可选，无需 migrate |

## 5. 接口设计

### `POST /api/governance/events/:ref/refs/search`

请求（`mode` 一期只接受 `fast`，传 `deep` 返回 `FIND_DEEP_NOT_READY`）：

```json
{ "scope": "kisearch-memory", "mode": "fast", "topK": 12, "limit": 5, "threshold": 0.6 }
```

> ⚠️ **不接受前端传 `targets`**：检索范围一律后端按配置解析，防止前端指定任意库绕过权限。

响应（跨库示例）：

```json
{
  "ok": true,
  "scope": "kisearch-memory",
  "targets": ["kisearch-memory", "kisearch-docs"],
  "skippedTargets": [{ "name": "kisearch-xperts", "reason": "forbidden" }],
  "candidates": [
    {
      "scope": "kisearch-docs",
      "group": "部署运维",
      "name": "部署回滚手册",
      "score": 0.87,
      "rankInScope": 1,
      "rawScore": 0.0312,
      "why": "命中「回滚」",
      "matchedKeywords": ["回滚"],
      "weak": false,
      "visibility": "full",
      "chunkHits": 2
    }
  ],
  "steps": [],
  "total": 2143,
  "durationMs": 412,
  "query": "回滚 发布",
  "mode": "hybrid",
  "reason": null
}
```

### `DELETE /api/governance/events/:ref/refs`

```
?scope=kisearch-memory&sourceScope=kisearch-docs&group=部署运维&name=部署回滚手册
```

- `sourceScope` 缺省 = `scope`（兼容老前端）。
- 未匹配到记录 → `REF_NOT_FOUND`（现有）。

### `POST /api/governance/events/:ref/refs`（加入）

```json
{ "scope": "kisearch-memory", "addedBy": "ai",
  "docs": [{ "sourceScope": "kisearch-docs", "group": "部署运维", "name": "部署回滚手册", "score": 0.87 }] }
```

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 事件库本身无权限 | 403 `FORBIDDEN_SCOPE`（现有） | 是 |
| 配置里的额外库无权限 | 运行期剔除 + `skippedTargets`；保存期 400 `FIND_TARGET_NOT_AUTHORIZED` | 是 |
| 额外库已被删除 | 剔除 + `skippedTargets(missing)` | 是 |
| 视图成员变更导致 0 成员 | 剔除 + `skippedTargets(view-members-changed)` | 是 |
| 部分 target 检索抛错 | 记录 `targetErrors`，其余正常返回；全部失败才 503 `SEARCH_UNAVAILABLE` | 是 |
| 加入的文档在源库不存在 | 400 `REF_DOC_NOT_FOUND`（新增码） | 是 |
| 引用数超 50 | 409 `REF_LIMIT_EXCEEDED`（现有） | 是 |
| 跨库同名不同库的重复加入 | 不视为重复（key 含库），两条都保留 | 否 |
| 源文档被**已收口**事件锁在不可检索阶段 | 409 `REF_DOC_NOT_SEARCHABLE`；候选行预先禁用勾选并说明来源事件 | 是 |
| 源文档被**未收口**事件临时锁在不可检索阶段 | 允许加入；候选行标「当前不可检索（事件 #N 排查中）」 | 是 |
| 源库已不存在 | 引用读取标 `stale` + `staleReason: 'scope-missing'`；查找时该 target 进 `skippedTargets(missing)` | 是 |
| 引用文档被删（源库仍在） | 标 `stale` + `staleReason: 'doc-deleted'`（现状行为，只是补了原因） | 是 |

## 7. 迁移策略

1. **不做数据迁移**：`sourceScope` 缺省即事件库，读写两侧统一用 `?? scope` 归一。
2. 老的 `removeRefDoc(scope, eventId, group, name)` 调用点（`governance-http.ts:703`）改为传对象形式；旧参数组合仍可匹配（按事件库）。
3. 前端 `RefCandidateDto` 新增可选字段，未升级的后端响应也能被新前端渲染（缺字段时 `scope` 回退请求 scope、`rankInScope` 隐藏）。

## 8. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-02-1 | 分数用**全批次统一 min-max** + 新增 `rankInScope` | ① 按库分组各自 min-max；② 原始 RRF 分直接排序 | ① 每个库第一名恒为 1.00，弱库高分会被默认勾选（比"不可比"更危险）；② 不同 embedding 空间原始分不可比，且与现有 UI 声明冲突 | 若实测出现「弱库第一名频繁被用户取消勾选」超过 20% 的反馈，改为按库分组并调整默认勾选策略 |
| D-02-2 | 逐 target 调用检索（N 次） | 一次 `executeSearch({ scope: "a,b" })` 多库请求 | 单次多库的局部失败会整体降级，且无法分库统计 `targetErrors`；逐库还能让单个库的 `topK` 语义等价单库查找 | 若 target 数 > 5 且延迟成为主要投诉，改为一次多库 + 后置分库统计 |
| D-02-3 | 引用去重 key 含 `sourceScope` | 继续用 `group\0name` | 跨库同名文档会被静默跳过，用户以为加入失败；删除会删错库 | 无（正确性缺陷，必须改） |
| D-02-4 | `targets` 由后端解析、前端不可传 | 前端传 targets（更灵活） | 前端传等于把越权入口开放给浏览器；且前端拿不到完整授权集 | 无 |
| D-02-5 | 不做 `refs.json` 批量回写迁移 | 启动时把所有 refs 补上 `sourceScope` | 启动期全量改盘既慢又危险（写坏无法回滚），且缺省归一已足够 | 若有下游消费方要求字段必填，改为惰性回写（读取时补写该文件） |
| D-02-6 | 不可检索文档按「源事件是否已收口」分界（收口拒绝、未收口放行+提示） | ① 一律禁止加入；② 一律放行 | ① 挡住合法场景（事件流转后文档即可用）；② 产生幽灵引用且跨库后用户无法自查 | 若实测「未收口放行」的引用长期不恢复可检索（>30 天），改为默认拒绝 |
| D-02-7 | `stale` 拆出 `staleReason`（`doc-deleted` / `scope-missing`） | 沿用单一 `stale` 布尔 | 两种原因的用户下一步动作完全不同（找文档 vs 找库/权限），合成一个只能给含糊文案 | 无 |
| D-02-8 | 范围解析不自建缓存，复用 `scope-access` 的 mtime 快照 | 本模块加 TTL 缓存（简单） | TTL 窗口内会出现「授权用旧成员、展开用新成员」的越权窗口（该坑已在 `scope-access.ts:42-48` 记录） | 若 `resolveFindTargets` 成为 P99 热点（>50ms），在**同一份 mtime 快照**上做记忆化而非另建缓存 |

## 9. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/events/find-targets.ts` | **新增**：`resolveFindTargets` |
| `src/lib/events/refs-service.ts` | `searchRefCandidates` 收 `targets`、多库聚合、按源库可见性、加入前鉴权 + 存在性 + 可检索性校验；`listRefs` 增加 `staleReason` |
| `src/lib/events/event-service.ts` / 回收站路径 | **核查项（无功能改动则不动）**：事件关闭 / 进回收站 / 删除 / 恢复只操作**本库** `refs.json`，不触碰被引文档（跨库后该判据必须仍成立）。若发现跨库写入或删除，本期必须修正 |
| `src/lib/events/refs-store.ts` | 去重 key 含库、`removeRefDoc` 入参改对象 |
| `src/lib/events/refs-search.ts` | `AdapterHit` 保留 `scope` |
| `src/lib/events/types.ts` | `EventRefDoc.sourceScope` |
| `src/lib/governance-http.ts` | `refs/search` 接 `mode`、回显 `targets`、`DELETE` 接 `sourceScope` |
| `web/src/api/governanceContract.ts` | `RefCandidateDto` / `RefSearchResultDto` 新增字段 |
| `web/src/components/governance/FindRefModal.tsx` | 候选行显示库名 + 库内排名；空态文案区分 `skippedTargets` |
| `test/refs-sr05-search.test.ts` 等 | 新增多库用例：跨库回指、同名不同库、部分库失败、权限剔除 |

## 10. 待定问题

| # | 问题 | 当前处理 |
|---|---|---|
| U-02-1 | 视图作为 target 时，`rankInScope` 以「成员库」还是「视图」为范围 | 以成员库（`hit.scope`），因为视图不是物理库，跨成员排名没有意义 |
| U-02-2 | `skippedTargets` 的 UI 呈现（横幅 / 行内提示 / 仅 tooltip） | 默认用候选列表上方的行内提示；若过长折叠 |
