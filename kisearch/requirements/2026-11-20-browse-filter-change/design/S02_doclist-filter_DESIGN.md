# S-02 列表接口过滤（since / tags / event / sort · 视图）

> 父文档：`DESIGN.md` ｜ 依赖：S-01 ｜ 被依赖：S-03

## 1. 术语

| 术语 | 定义 |
|---|---|
| `since` | 时间窗口枚举 `1h / 6h / 24h / 7d`；命中判据 `max(createdAt, updatedAt) ≥ now - 窗口` |
| `tags` | 逗号分隔的自定义标签，**OR** 组合（同字段多值） |
| `event` | `evt_xxx` = 该事件成员文档（`Relation.eventId` 相等）；`none` = 未关联任何事件 |
| `sort=recent` | 按 `max(createdAt, updatedAt)` 倒序，仅在筛选态由前端显式请求 |
| 视图逐成员 | 同一 URL 对每个成员库各跑一次过滤，结果按成员分桶 |
| `undatedExcluded` | 被"未知时间"排除的条数（仅 `since` 存在时返回），用于前端提示"另有 N 篇" |

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 只认 `q` / `group` / `tag` 三个过滤维度，AND 组合 | `src/lib/mcp-http-api.ts:2301-2304`、`:2327-2332`、`:2349`、`:2366` |
| `tag` 为**单值**精确匹配 | `:2304`、`:2327-2328` |
| 响应 DTO 无任何时间字段、无 `eventId` | `:524-538`、`:581-593` |
| 列表缓存按 scope 存**全量** docs，过滤在其后执行 | `:540-598` |
| 视图分支对每个成员用**同一个 URL** 调 `buildDocListPayload(url, member)` | `:2405-2441` |
| 前端：`getDocList` 逐参数拼 query；`fetchGroupDocsAll` 翻页取全 | `web/src/api/httpApi.ts:322-335`、`:389-406` |
| 前端树：`useGroupDocs(scope, group, tag)` 按组取数，queryKey 固定三参 | `web/src/lib/hooks.ts:199-207` |

## 3. 方案（TO-BE）

### 3.1 参数解析上移（保证视图也只解析一次、非法值只 400 一次）

`handleDocList`（`src/lib/mcp-http-api.ts:2392`）在 `isViewRequest(targets)` 分支**之前**解析并校验，失败直接 400；解析结果作为 `DocFilters` 传给每个成员：

```ts
export interface DocFilters {
  q: string;
  group: string | null;
  tags: string[];            // 归一化小写；`tag` 已并入
  since?: { key: '1h'|'6h'|'24h'|'7d'; fromMs: number };
  event?: string;            // 'none' 或 evt id
  sort: 'default' | 'recent';
}
```

新增 `src/lib/doc-filters.ts`（纯函数，便于单测）：

```ts
export function parseDocFilters(url: URL, now = Date.now()): DocFilters; // 非法 since/sort → 抛 BadRequestError
export function matchSince(doc: ListedDoc, since?: DocFilters['since']): boolean;
export function matchTags(doc: ListedDoc, tags: string[]): boolean;
export function matchEvent(doc: ListedDoc, event?: string): boolean;
export function sortRecent(docs: ListedDoc[]): ListedDoc[];
```

### 3.2 过滤链改造（`buildDocListPayload`）

```ts
const matchAll = (d: ListedDoc): boolean =>
  (!q || matchDocQuery(d, q) !== null)
  && matchTags(d, filters.tags)          // tags 多值 OR；空数组 = 不过滤
  && matchSince(d, filters.since)        // 缺时间字段 → false（不命中）
  && matchEvent(d, filters.event);
```

- 两个分支（带 `group` 的 `:2347-2360`、全局的 `:2362-2377`）统一使用 `matchAll`，**`total` / `truncated` 均为过滤后计数**（现有分页语义不变）。
- `sort === 'recent'` 时在 `slice` 之前排序：`max(updatedAt, createdAt)` 倒序，时间相同按 `group`+`name` 稳定排序。
- `since` 存在时附带 `undatedExcluded`：`all.filter(matchAllWithoutSince → 通过).filter(d => !hasTime(d)).length`，即"本该命中但因无时间被排除"的条数。

### 3.3 DTO 透出（只加字段，不改既有字段）

`DocListCache['docs']`（`:524-538`）与装配处（`:581-593`）追加：

```ts
/** 首次进入本库；老数据缺省 = 未知 */
createdAt?: number;
/** 正文最近变更；元数据变更不刷新 */
updatedAt?: number;
/** 仅 lifecycle='event' 的成员文档才有 */
eventId?: string;
```

条件写法保持"缺省不写键"（与 `path/tags/groupSource` 一致），避免给绝大多数文档加冗余键。

### 3.4 事件过滤语义（成员，不含参考文档）

- 判据：`doc.eventId === event`；`event=none` → `!doc.eventId`。
- **不含** `refs.json` 里的参考文档（`EventRefDoc`）——跨库 join 成本高且无索引，本期不做。
- 服务端**不校验**事件是否存在（保持 doc list 与 governance 解耦）：查不到时返回空集 + `filters` 回显；前端据自己的事件候选判断"已失效"。

## 4. 接口契约

```
GET /api/doc/list
```

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scope` | string | 是 | 单库名或视图名 |
| `group` | string | 否 | 指定组（走分页分支） |
| `q` | string | 否 | 名称 / 逻辑路径模糊匹配 |
| `tags` | string | 否 | **新增**：逗号分隔，OR，小写比较 |
| `tag` | string | 否 | 兼容保留（等价 `tags` 单值；两者同时传以 `tags` 为准） |
| `since` | enum | 否 | **新增**：`1h` / `6h` / `24h` / `7d` |
| `event` | string | 否 | **新增**：`evt_xxx` 或 `none` |
| `sort` | enum | 否 | **新增**：`default`（缺省）/ `recent` |
| `offset` / `limit` | number | 否 | 既有分页 |

**错误**：`since` / `sort` 非法 → `400 { ok:false, error:'INVALID_SINCE' | 'INVALID_SORT', hint }`（fail-loud，不静默按"不过滤"处理）。

**Demo 返回示例（单库）**

```json
{
  "ok": true,
  "scope": "kisearch-memory",
  "docs": [
    {
      "name": "收尾汇报定为四要素固定格式",
      "group": "专题记忆/Web前端界面",
      "tags": ["ui"],
      "vectorized": true,
      "fullTextIndexed": false,
      "createdAt": 1794998400000,
      "updatedAt": 1794998400000,
      "eventId": "evt_48"
    }
  ],
  "offset": 0,
  "total": 12,
  "truncated": false,
  "groups": [{ "name": "专题记忆/Web前端界面", "count": 42 }],
  "tags": ["api", "memory", "ui"],
  "filters": { "since": "6h", "tags": ["ui"], "event": "evt_48", "sort": "recent" },
  "undatedExcluded": 196
}
```

**Demo 返回示例（视图）**

```json
{
  "ok": true,
  "view": "kisearch-docs",
  "members": ["kisearch-memory", "kisearch-xperts"],
  "buckets": [
    { "scope": "kisearch-memory", "docs": [], "total": 8, "undatedExcluded": 40, "groups": [], "tags": [] },
    { "scope": "kisearch-xperts", "error": "EMFILE: too many open files" }
  ],
  "tags": ["api", "memory", "ui"]
}
```

> `filters` 回显便于前端与排障核对"这次到底按什么筛的"；`undatedExcluded` 在视图下**按桶返回**，前端累加显示。

## 5. 视图支持（本需求硬约束）

| 点 | 设计 | 依据 |
|---|---|---|
| 过滤下发 | 视图分支对每个成员用**同一个 `filters`** 调 payload | `mcp-http-api.ts:2405-2432`（既有结构，零改动） |
| 过滤只读 URL | 新增过滤一律从 query 解析，**不读"当前 scope 上下文"**，否则视图必然漏 | 本次新增的 `parseDocFilters` |
| 无效值 400 只一次 | 解析上移到视图分支之前 | §3.1 |
| 成员失败隔离 | 保持"单成员失败污染自己的桶" | `:2426-2431` |
| 计数口径 | 各桶 `total` 为**该成员过滤后**条数；顶层 `tags` 仍为全量合并（供下拉，不受过滤影响） | 现有 `tagSet` 合并 |
| 事件候选 | 接口层**不感知**视图；前端逐成员调 `/api/governance/events` | S-03 §3.5 |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `since` / `sort` 非法值 | 400 + 错误码 + hint | 是 |
| `tags` 全为空白（如 `tags=,,`） | 归一化为空数组 = 不过滤 | 否 |
| `event` 指向不存在的事件 | 200 + 空 `docs` + `filters` 回显 | 是（结果空） |
| 视图某成员读盘失败 | 该桶 `{scope, error}`，其余桶正常 | 是 |
| 视图全部成员被跳过 | 400 `视图 X 没有可用的成员库` | 是（既有行为） |
| 文档缺时间字段且带 `since` | 不命中，计入 `undatedExcluded` | 是（数字） |
| `since` 与 `group` 同时存在 | 组内分页分支同样应用全部条件 | 否 |

## 7. 关键决策

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D3 | 过滤在服务端 | 前端本地过滤 | 撞 500 条截断（`hooks.ts:127-131` 明确警告），超 500 篇的库永远筛不全 | 无（后者在数据量上先天不成立） |
| D4 | 视图 = 逐成员过滤，不新增聚合层 | 视图层跨库 join + 统一排序 | 权限、排序、分页口径都要重定义；现分支已天然逐成员，聚合层无收益 | 若用户要求"跨库统一按时间排序的单一列表"，则需新增聚合端点 |
| D6 | `since` 用枚举 | 传绝对时间戳（`sinceMs`） | 前端档位固定、无自定义需求；绝对时间会受客户端时钟影响 | 需要"自定义区间"时改为 `sinceMs` 并保留枚举作为快捷值 |
| D7 | 标签多值走新参数 `tags` | 扩 `tag` 支持逗号 | 旧消费方可能把 `tag` 当单值传入含逗号的 tag 名（历史数据里允许），复用会歧义 | 若确认全网无含逗号 tag，可合并为单参数 |
| D8 | 服务端不校验事件归属 | 服务端查事件表校验 | doc list 会依赖 governance 存储，视图下还要逐成员查，破坏层次 | 若前端无法判定失效（例如未来出现无事件的库），再下沉 |

## 8. 性能

- 过滤在内存全量 docs 上做，`O(n)`，与现有 `tag` / `q` 同量级；不新增 IO、不改缓存键。
- `sort=recent` 仅对**过滤后**数组排序（`n log n`，n ≤ 单库文档数）。
- 视图 = 与现状相同的成员数次调用，过滤不增加 per-member 次数。

## 9. 影响范围

```
src/lib/
├── doc-filters.ts            [新增] 解析与匹配纯函数
└── mcp-http-api.ts           [修改] 解析上移 / DocListCache.docs 字段 / matchAll 过滤链 /
                                   sort / undatedExcluded / filters 回显 / 视图分支传 filters
web/src/
├── api/httpApi.ts            [修改] DocItem 加 createdAt/updatedAt/eventId；getDocList 支持
│                                   tags/since/event/sort；fetchGroupDocsAll 透传 filters
└── lib/hooks.ts              [修改] useGroupDocs(scope, group, filters) → 请求 + queryKey
test/
└── doc-list-filter.test.ts   [新增] 解析/匹配/排序/视图桶/undatedExcluded 共 ≥ 12 例
```

## 10. 验收标准（可执行）

1. `since=6h`：只返回 `max(createdAt,updatedAt) ≥ now-6h` 的文档，`total` 为过滤后条数。
2. `tags=ui,api`：命中 ui **或** api；`tags=` 空 → 不过滤。
3. `event=evt_48`：只返回 `eventId === 'evt_48'`；`event=none`：只返回无 `eventId`。
4. `sort=recent`：时间严格不增；`default` 时顺序与改造前逐字节一致。
5. 视图：`buckets[i].total` 各自为过滤后计数；顶层 `tags` 不变；某成员注入失败 → 该桶含 `error` 且其余桶正常。
6. `since=xx` → 400 `INVALID_SINCE`，且视图请求也只返回一次 400（不是每桶各报一次）。
7. 不传任何新参数：单库响应除 `docs[]` 新增可选字段外，其余字段与改造前一致。
