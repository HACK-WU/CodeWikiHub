# S-02 读端点逐库合并（docs / counts / trash）

父文档：`DESIGN.md` ｜ 依赖：S-01（范围解析与鉴权）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 合并视图响应 | `view` 非空时的响应结构：`{view, members, total, items, buckets, ...}` |
| 单库响应 | `view` 缺省时的结构，**与改造前完全一致**（仅新增 `scope` 字段） |
| `lifecycleCounts` | 各档全量计数（服务端算，不受 200 条截断影响） |
| `settingsByScope` | 视图下各成员库的回收站设置（不再返回单一 `settings`） |

## 2. 现状（AS-IS）

| 端点 | 位置 | 现状 |
|---|---|---|
| `GET /governance/docs` | `src/lib/governance-http.ts:1270-1324` | `readAllGroupCaches(scope)` 逐组遍历；`items` 无 `scope`；`total=all.length`；`limit` 上限 200 |
| `GET /governance/counts` | `:1440-1454` | `docs=Σhot_relations`、`eventsOpen/Closed=readAllEvents`、`trash=listTrash().total`、`pendingIndex=pendingCount()` |
| `GET /governance/trash` | `:1341-1356` | `listTrash(scope)` → `items` 已含 `scope`（`trash-store.ts:30-51`），同一响应给 `settings` |

三者都直接吃 `scopeFromQuery()` 的原始值，视图下读到空。前端对应代码：`web/src/api/governanceApi.ts:507-517`（docs）、`:465-467`（counts）、`:404-413`（trash）。

## 3. 方案（TO-BE）

### 3.1 抽出可复用的单库构建函数

把 `governance-http.ts:1279-1322` 的循环原样搬进：

```ts
function buildDocsPayload(
  scope: string,
  groupFilter: string | undefined,
  keyword: string,
  now: number,
): {
  total: number;
  items: GovernanceDocItem[];
  lifecycleCounts: { all: number; wiki: number; temp: number; event: number };
}
```

要点：

- 每库各自建 `eventIndex`（`readAllEvents(scope)`）与 `typeStageNames`（`listTypes(scope)`）——事件绑定是**库内**关系，不存在跨库合并事件的问题；
- 每条 item 新增 `scope`（单库也返回，前端键统一三段）；
- `lifecycleCounts` 在遍历时同步累加（不额外遍历）。

### 3.2 三个端点的视图分支

| 端点 | 视图分支行为 |
|---|---|
| `/docs` | 逐成员 `buildDocsPayload` → 合并 `items`（按成员顺序分组，不跨库重排）→ `total=Σtotal` → `items.slice(offset, offset+limit)`；`buckets=[{scope,total}\|{scope,error}]`；`lifecycleCounts` 累加 |
| `/counts` | 逐成员累加 `docs / eventsOpen / eventsClosed / trash / pendingIndex`；`buckets` 给每库明细 |
| `/trash` | 逐成员 `listTrash(member, {reason, limit, offset:0})` → 合并 `items` → `total=Σtotal`；`settingsByScope=[{scope, settings}]`；**不返回单一 `settings`** |

单库分支：沿用原逻辑，只加 `scope`（items）与 `lifecycleCounts`（顶层），其余字段与顺序不变。

### 3.3 合并分页与过滤口径（必须显式）

- 视图下 `limit` 是**每库上限**：逐成员各取前 `limit` 条后直接拼接，**不做二次总截断**；
- **真机教训（2026-11-20 实施期修正）**：原设计「合并后再 `slice(0, limit)`」在「第一库 211 篇 > limit 200」时会让第二个成员库**一条都看不到**——而用户切视图恰恰是为了看各库。故改为每库各取 `limit` 条，响应最多 `members × limit` 条（≤ 12 × 200）；
- `offset` 在视图下不生效（前端恒传 0；跨库偏移语义不清，不支持优于猜）；
- 前端固定 `limit=200`，因此单库最多 200 条、视图最多 `成员数 × 200` 条；
- `buckets[].total` 是各库**全量**篇数，前端据此提示「共 M 篇，仅加载前 X 篇」；
- `group` 过滤在视图下按**库内组路径**逐库匹配：两个库都有 `运维` 组时都会命中（前端目前恒不传 `group`，此语义为将来按组筛选预留）；
- `lifecycleCounts` 与 `total` **同一集合**（已应用 `group` / `q` 过滤）——与现有前端"搜索后 tab 计数随之变化"的行为一致；不得统计全量。

### 关键决策点

| 决策 | 被否决方案 | 否决理由 |
|---|---|---|
| 按成员顺序分组展示，不跨库排序 | 合并后按 `lastUsedTime` 全局排序 | 跨库混排会让「同一库的文档被打散」，用户无法按库核对；现有排序按钮仍可用 |
| 视图下不返回单一 `settings` | 取第一个成员库的设置当代表 | 各库设置可能不同，取哪个都是撒谎；前端在视图下本来就禁用设置入口 |
| `limit` 每库各取一份再合并 | 只对合并结果取前 limit 条 | 后置成员库会被前面的库挤空，表现为「某个库永远 0 条」 |

## 4. 接口设计

### 4.1 `GET /governance/docs`

请求：`GET /api/governance/docs?scope={库名|视图名}&group=&q=&limit=&offset=`

**视图响应 Demo**

```json
{
  "ok": true,
  "scope": "monitor-docs",
  "view": "monitor-docs",
  "members": ["monitor-memory", "ops-wiki"],
  "total": 128,
  "items": [
    {
      "scope": "monitor-memory",
      "group": "会话",
      "name": "登录页白屏排查",
      "lifecycle": "event",
      "visibility": "full",
      "imported": false,
      "remainDays": null,
      "lastUsedTime": 1795000000000,
      "event": { "id": "evt_mf3k_abc123", "shortId": 3, "title": "登录页白屏", "stageName": "排查中", "closed": false }
    },
    {
      "scope": "ops-wiki",
      "group": "运维",
      "name": "值班手册",
      "lifecycle": "wiki",
      "visibility": "full",
      "imported": false,
      "remainDays": null,
      "lastUsedTime": null,
      "event": null
    }
  ],
  "lifecycleCounts": { "all": 128, "wiki": 107, "temp": 9, "event": 12 },
  "buckets": [
    { "scope": "monitor-memory", "total": 120 },
    { "scope": "ops-wiki", "total": 8 }
  ],
  "skipped": [{ "scope": "old-archived", "reason": "未注册（scopeMode=strict，视图 monitor-docs 的成员）" }],
  "truncated": false
}
```

**单库响应 Demo**（除 `scope` / `lifecycleCounts` 外与现状一致）

```json
{ "ok": true, "scope": "monitor-memory", "total": 120, "items": [ { "scope": "monitor-memory", "group": "会话", "name": "登录页白屏排查", "lifecycle": "event" } ], "lifecycleCounts": { "all": 120, "wiki": 99, "temp": 9, "event": 12 } }
```

> 说明：Demo 中 `items` 只展示关键字段，其余字段（`expiresAt` / `ttlDays` / `eventId` / `lifecycleWarning`）语义不变。

### 4.2 `GET /governance/counts`

**视图响应 Demo**

```json
{
  "ok": true,
  "scope": "monitor-docs",
  "view": "monitor-docs",
  "members": ["monitor-memory", "ops-wiki"],
  "docs": 128, "eventsOpen": 12, "eventsClosed": 3, "trash": 12, "pendingIndex": 2,
  "buckets": [
    { "scope": "monitor-memory", "docs": 120, "eventsOpen": 10, "eventsClosed": 3, "trash": 12, "pendingIndex": 2 },
    { "scope": "ops-wiki", "docs": 8, "eventsOpen": 2, "eventsClosed": 0, "trash": 0, "pendingIndex": 0 }
  ]
}
```

单库响应：`{ok, scope, docs, eventsOpen, eventsClosed, trash, pendingIndex}`（零变化）。

### 4.3 `GET /governance/trash`

**视图响应 Demo**

```json
{
  "ok": true,
  "scope": "monitor-docs",
  "view": "monitor-docs",
  "members": ["monitor-memory", "ops-wiki"],
  "total": 12,
  "items": [
    {
      "scope": "ops-wiki", "group": "排查", "name": "旧记录", "reason": "manual",
      "deletedAt": 1794900000000, "expiresAt": 1795500000000,
      "ttlDays": 7, "restoreCount": 0, "dirName": "旧记录__20261118", "hasAssets": false, "sizeBytes": 1024
    }
  ],
  "settingsByScope": [
    { "scope": "monitor-memory", "settings": { "keepDays": 7, "expireAction": "purge" } },
    { "scope": "ops-wiki", "settings": { "keepDays": 14, "expireAction": "notify" } }
  ],
  "buckets": [{ "scope": "monitor-memory", "total": 12 }, { "scope": "ops-wiki", "total": 0 }]
}
```

单库响应：与现状一致（含 `settings`）。

## 5. 数据模型

### 5.1 `GovernanceDocItem`（后端与 `web/src/api/governanceApi.ts:489-505` 同步）

| 字段 | 类型 | 说明 | 本次变更 |
|---|---|---|---|
| `scope` | `string` | 条目所属物理库 | **新增（必填）** |
| `group` | `string` | 组路径（库内） | 不变 |
| `name` | `string` | 文档名（库内唯一） | 不变 |
| `lifecycle` | `'wiki' \| 'temp' \| 'event'` | 分类档位 | 不变 |
| `expiresAt` | `number?` | 临时到期时间戳 | 不变 |
| `ttlDays` | `number?` | 用户设置的期限 | 不变 |
| `eventId` | `string?` | 绑定事件 id（库内） | 不变 |
| `lifecycleWarning` | `string?` | 档位不一致的说明 | 不变 |
| `visibility` | `'full' \| 'fts-only' \| 'hidden'` | 检索可见性（按库算） | 不变 |
| `imported` | `boolean` | 数据源文档（分类锁定） | 不变 |
| `remainDays` | `number \| null` | 剩余天数（服务端算） | 不变 |
| `lastUsedTime` | `number \| null` | 最后活跃时间 | 不变 |
| `event` | `{id, shortId, title, stageName, closed?} \| null` | 绑定事件与阶段 | 不变 |

### 5.2 `lifecycleCounts`（新增，响应顶层）

| 字段 | 类型 | 说明 |
|---|---|---|
| `all` | `number` | 与 `total` 同值 |
| `wiki` / `temp` / `event` | `number` | 各档全量篇数（服务端遍历得出） |

### 5.3 `TrashItemView`（已含 `scope`，无需改结构）

见 `web/src/api/governanceApi.ts:384-397`；本次仅新增 `settingsByScope` 与 `buckets`。

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 某成员库目录缺失 | 该库桶 `{scope, error}`，其余正常；`ok:true` | 是（error 文案） |
| 某成员库鉴权失败 | 已在 S-01 整请求 403（全有或全无），不会走到逐库 | 是 |
| 视图成员全失败 | `ok:true` + `items:[]` + 每桶 error + `buckets` 全 error；前端显示"成员库读取失败" | 是 |
| 空视图 | S-01 抛 `VIEW_EMPTY` → 400 | 是 |
| 合并后超 200 | `total > items.length`，前端提示"仅加载前 200 篇" | 是 |
| 成员超 12 | `truncated:true` + `skipped` | 是 |

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/governance-http.ts` | 抽 `buildDocsPayload`；`/docs`、`/counts`、`/trash` 加视图分支 |
| `src/lib/governance-scope.ts` | 新增（S-01） |
| `test/governance-routes.test.ts` | 现有用例保持绿（单库零变化） |
| `test/governance-view.test.ts` | 新增（见 S04 §5 验收） |
| `web/src/api/governanceApi.ts` | 类型扩展（S-04） |

## 8. 性能安全

**默认假设（显式）**：单机部署、单用户低频操作、读多写少；不做并发合并缓存，也不跨请求共享结果。

- 成员上限 12（`MAX_MEMBERS`），最坏 12 × `readAllGroupCaches` 一次全量遍历；
- **`/docs` 与 `/counts` 会各遍历一遍全库**：进分类页时侧栏（`AppShell`）与页面各自发一次请求，合计 2 × 成员数次全量读。这是已知成本，不做跨请求缓存（要处理失效）；若实测超预期，优先给 `/counts` 加 3~5s 的进程内 TTL 缓存；
- **本次不设时间预算**：分类页/侧栏需要"合计"这一确定结果，预算中途放弃会让数字忽大忽小（与 `/api/tags` 的辅助读不同）；
- 待实测：单库 1882 篇（本机 `ai-docs`）合并 2 库时 `/docs` 耗时；若 >800ms 再评估「计数缓存」或「按库懒加载」，不预先优化。
