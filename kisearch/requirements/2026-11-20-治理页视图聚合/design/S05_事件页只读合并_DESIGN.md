# S-05 事件页只读合并（二期）

父文档：`DESIGN.md` ｜ 依赖：S-01（`resolveGovernanceTargets`）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 事件条目 scope | 事件所属物理库；列表每条必带，用于详情/写操作定位 |
| `typeKey` | 视图下类型唯一键 `${scope}:${typeId}`（`et_1` 每库都有，裸 id 必撞车） |
| 跨库定位 | 详情按 `evt_…` 在成员库中查找；`#N` 是库内计数，视图下拒绝 |

## 2. 现状（AS-IS）

| 端点 | 位置 | 现状 |
|---|---|---|
| `GET /governance/events` | `governance-http.ts:775-804` | `scopeFromQuery()` + `listEvents(scope, …)`；条目无 `scope` |
| `GET /governance/events/:id` | `:841-874` | 同库 `findEventIn(readAllEvents(scope))`；`#N` 按库内 shortId 匹配（`store.ts:81-84`） |
| `GET /governance/event-types` | `:739-742` | `listTypes(scope)`；`et_1/2/3` 每库固定（`builtin-types.ts:16`） |
| 列表服务 | `event-service.ts:102-190` | 置顶区在前 → `pinnedAt` 降序 → 普通区 `updatedAt` 降序；`limit≤100`、`offset` 在排序后切片 |
| 详情服务 | `event-detail.ts:211-238` | `mustFindEvent` → `loadEventDetail`；`analysisActive` 必须传真实值 |

前端：`EventsPage.tsx` 全部写入口只判 `!canWrite`（20 处，见盘点），无视图条件；深链 `findEventKey:128-132` 用库内 shortId 兜底。

## 3. 方案（TO-BE）

### 3.1 列表（视图分支）

逐库 `listEvents(member, { status, type?, q?, limit, offset: 0, docsPreviewLimit, includePinned })` → 合并 → **跨库重排**（置顶 `pinnedAt` 降序 → 普通区 `updatedAt` 降序）→ 按 `offset/limit` 切片。

- 条目在原有字段上补 `scope`（事件所属库）；
- `total` = 各库 total 之和；单成员失败只进 `buckets`，其余照常。

### 3.2 详情（视图分支）

- 只接受 `evt_…`：`#N` / 纯数字在视图下**400 `EVENT_SCOPE_REQUIRED`**（各库 `#3` 都可能存在，猜库即错）；
- 按成员顺序 `findEventIn` 定位，命中即用；命中多个 → 同样 400（数据异常，不静默择一）；
- 响应 `scope` 回填**事件所属库**（不是视图名）—— 前端后续 `refs`、`analysis`、`ask` 全部用它，天然落到正确的库。

### 3.3 类型（视图分支）

逐库 `listTypes(member)` 合并，条目补 `scope` 与 `typeKey`；筛选参数扩展为 `type=<scope>:<typeId>`（不带冒号时按裸 id 对每库生效，兼容旧调用）。

### 3.4 写操作（2026-11-20 修正，用户拍板）

**原设计「视图下写入口全禁」是错的**：事件只能建在可写库，视图里能看到的事件必然来自可写库，
因此事件编辑 / 流转 / 删除 / AI 分析都应允许，只要请求按「事件所属库」发出。

- 前端 `writeBlocked = !canWrite`（只判账号权限）；`libWriteBlocked = !canWrite || isViewScope`
  只用于**需要库级上下文**的操作：新建事件、类型增删改（目标库无法从当前事件推出）；
- 所有事件写调用与三个弹窗（加关联文档 / 加参考文档 / 上传）改用 `eventScope`；
  文档正文抽屉同样改用 `eventScope`（原先传视图名会读不到正文）；
- 只读库仍由后端 `SCOPE_READONLY` 409 兜底（用户原话：「只读 scope 除外」）；
- 分类页 / 回收站页保持原禁用策略：文档可能来自只读（数据源锁）库，边界另议。

### 关键决策点

| 决策 | 被否决方案 | 否决理由 |
|---|---|---|
| 视图下详情拒绝 `#N` | 用第一个命中的成员库 | 各库 shortId 独立计数，`#3` 在多库都成立；猜库会把用户带到另一个事件详情，属静默串数据 |
| 详情响应 `scope` 回填真实库 | 回显请求的视图名 | 前端后续 refs/analysis/ask 都靠这个 scope；回显视图名会让它们 404 或写到错误目标 |
| 类型筛选串 `scope:typeId` | 视图下禁用类型筛选 | 筛选是只读能力，禁用等于削减功能；串 scope 的代价只有一处解析 |

## 4. 接口契约

`GET /governance/events?scope=<视图>&status=&type=<库>:<et_N>&q=&limit=&offset=&includePinned=1`

```json
{
  "ok": true, "scope": "kisearch-docs", "view": "kisearch-docs",
  "members": ["kisearch-memory", "kisearch-xperts"],
  "total": 47, "hasMore": false,
  "events": [
    { "id": "evt_mf3k_abc123", "scope": "kisearch-memory", "shortId": 3, "title": "登录页白屏",
      "typeId": "et_1", "typeName": "bug 排查", "stage": { "key": "s2", "name": "排查中", "index": 1, "visibility": "full" },
      "updatedAt": 1795000000000, "memberTotal": 2, "docsPreview": [{ "group": "会话", "name": "登录页排查" }] }
  ],
  "buckets": [{ "scope": "kisearch-memory", "total": 45 }, { "scope": "kisearch-xperts", "total": 2 }]
}
```

`GET /governance/events/evt_mf3k_abc123?scope=<视图>` → 200，`scope` 字段 = 命中的成员库；`#3` → 400 `EVENT_SCOPE_REQUIRED`。

`GET /governance/event-types?scope=<视图>` → `types[]` 每条含 `scope` / `typeKey`。

## 5. 异常处理

| 场景 | 行为 | 暴露 |
|---|---|---|
| 视图下用 `#N` 查详情 | 400 `EVENT_SCOPE_REQUIRED` + 提示改用 `evt_` | 是 |
| 同一 `evt_` 命中多个库 | 400 同上（数据异常，不静默择一） | 是 |
| 某成员库列表失败 | 该库进 `buckets[].error`，其余照常 | 是 |
| 视图下写操作 | 409 `VIEW_NOT_WRITABLE`（既有） | 是 |
| 空视图 / 无可用成员 | 400 `VIEW_EMPTY` / `VIEW_NO_USABLE_MEMBER`（S-01 既有） | 是 |

## 6. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/governance-http.ts` | events 列表 / 详情 / event-types 三个 GET 加视图分支 |
| `src/lib/governance-errors.ts` | 新增 `EVENT_SCOPE_REQUIRED: 1705` |
| `test/governance-view-events.test.ts` | 新增（列表合并 / 详情定位 / `#N` 拒绝 / 类型 typeKey / 单库零变化） |
| `web/src/api/governanceApi.ts` | `EventView.scope?`、列表响应视图元信息、类型 `typeKey` |
| `web/src/pages/EventsPage.tsx` | 视图态库名与 `#N · 库`、`writeBlocked`、详情/后续调用改用详情响应 scope、深链只按 id |
| `web/src/components/governance/EventSummaryCard.tsx` | 透传写禁用与提示 |

**不在范围**：MCP 事件工具、事件写操作在视图下落地（一律禁用）。

### 6.1 追加（2026-11-20 收尾）

`docs/search` 与 `diagnostics` 原列「不在范围」，因同属读路径且脚本/诊断会用，已顺手补齐：

- `GET /governance/docs/search`：逐库 `searchDocsForAdd` → 合并 `hits`（每条补 `scope`）+ `buckets`；单库响应不变；
- `GET /governance/diagnostics`：逐库合并 `pending` / `failures` / `trash`（条目补 `scope`），`trash.scanned` 为各库扫描条数之和；
- 两者视图下均带 `view / members / buckets / skipped / truncated`。

> 说明：当前 Web 端无页面消费这两个端点（`getGovernanceDiagnostics` / `searchDocsForAdd` 仅 API 定义），本次是契约完整性 + 脚本/诊断可用性。
