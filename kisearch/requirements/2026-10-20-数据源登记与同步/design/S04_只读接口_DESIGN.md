# S-04 只读接口（`GET /api/datasource/list`）

> 父文档：[`DESIGN.md`](DESIGN.md) ｜ 需求：R6 / R8 ｜ 消费方：S-05 列表页与总览卡

## 1. 术语

| 术语 | 定义 |
|---|---|
| **汇总视图** | 一次返回所有已登记 scope 的数据源（`?scope=` 可缩小到单个） |
| **`running`** | 该 scope 当前是否有 `operation='datasource-sync'` 且状态为 `queued/running` 的任务 |
| **`stale`** | `lastSync.at` 距今 > 24h（用于列表"超过 24h 未同步"计数） |

## 2. 现状（AS-IS）

- `/api/*` 是顺序 `if` 链，新路由加在 `lib/mcp-http-api.ts:700-731`；新增路由**不需要**改 `mcp-http.ts`（`/api/` 前缀已统一转交，`mcp-http.ts:656-668`）
- 带 `?scope=` 的 GET **必须**登记进只读白名单（`mcp-http-api.ts:501-503`），否则远程 token 会绕过 scope 越权校验
- 现有 scope 枚举能力只在 CLI（`src/scope.ts` 的 `ScopeEntry`）与 MCP 工具 `ki_scope_list`（`src/lib/mcp-tools/scope-list.ts`），**无 `/api/scope/list`**

## 3. 方案（TO-BE）

### 3.1 接口契约

`GET /api/datasource/list?scope=<optional>`

| 项 | 内容 |
|---|---|
| 方法/路径 | `GET /api/datasource/list` |
| 查询参数 | `scope?`：省略 = 汇总所有已登记 scope |
| 鉴权 | 回环免鉴权；远程 token 走白名单校验 `scopeAllowed`（**必须登记**，见 3.3） |
| 副作用 | **无**（纯读文件 + 读任务台账过滤） |
| 缓存 | `Cache-Control: no-store`（`lastSync` 会变） |

**成功响应 Demo（仅示意格式，非最终数据）**

```json
{
  "ok": true,
  "total": 2,
  "sources": [
    {
      "scope": "default",
      "dir": "/Users/me/docs/wiki",
      "group": "wiki",
      "conflictMode": "incremental",
      "vector": true,
      "registeredAt": 1760900000000,
      "updatedAt": 1760900000000,
      "lastSync": {
        "at": 1760900000000,
        "durationMs": 42000,
        "state": "ok",
        "files": { "scanned": 128, "completed": 123, "skipped": 4, "incomplete": 1 },
        "pendingDelete": { "total": 0, "overLimit": false, "stale": false, "blocked": null }
      },
      "running": false,
      "stale": false
    },
    {
      "scope": "monitot",
      "dir": "/Users/me/docs/api",
      "group": "wiki/API接口文档",
      "conflictMode": "overwrite",
      "vector": true,
      "registeredAt": 1760800000000,
      "updatedAt": 1760800000000,
      "lastSync": {
        "at": 1760300000000,
        "durationMs": 61000,
        "state": "partial",
        "files": { "scanned": 128, "completed": 127, "skipped": 0, "incomplete": 1 },
        "pendingDelete": { "total": 12, "overLimit": false, "stale": false, "blocked": null }
      },
      "running": false,
      "stale": true
    }
  ],
  "missing": ["verify-scope"],
  "migrationHints": [{ "scope": "kisearch", "dir": "/old/wiki" }]
}
```

**字段说明**

| 字段 | 说明 |
|---|---|
| `sources[]` | 每个已登记 scope 一条；`dir` 为绝对路径 |
| `missing[]` | 有 `datasource.json` 但目录不可读的 scope（不塞进 `sources`，避免列表被"坏数据"占位） |
| `migrationHints[]` | 有 `group-index.json.source` 但无 `datasource.json` 的 scope（R15 提示式迁移，**只提示**） |
| `sources[].lastSync` | **摘要**，不是完整快照；完整快照由 `GET /api/datasource/detail?scope=` 提供 |
| `sources[].lastSync.pendingDelete` | 只给 `{ total, overLimit, stale, blocked }` 四个数/标记（列表页要显示「待删 12」与「已过期」徽标） |
| `total` | **过滤后**的条数（见 3.3 鉴权），保证「总览卡 / 列表副标题 / 表格行数」三者同源 |

### 3.2 第二个接口：`GET /api/datasource/detail?scope=<s>`

详情页需要 `lastSync.params/result` 完整快照 + `pendingDelete.items`（列表只给摘要，避免一次拉全量 items × N 个 scope）。

| 项 | 内容 |
|---|---|
| 参数 | `scope` **必填** |
| 响应 | `{ ok, source:{...完整 datasource.json...}, running, task? }` |
| 错误 | `404 DATASOURCE_NOT_FOUND` / `400 PRUNE_MISSING_PARAM` |

```json
{
  "ok": true,
  "running": false,
  "source": {
    "scope": "monitot",
    "dir": "/Users/me/docs/api",
    "group": "wiki/API接口文档",
    "conflictMode": "overwrite",
    "vector": true,
    "lastSync": {
      "at": 1760300000000,
      "state": "partial",
      "params": { "group": "wiki/API接口文档", "conflictMode": "overwrite", "vector": true },
      "result": { "files": { "scanned": 128, "completed": 127, "skipped": 0, "incomplete": 1 },
                  "failures": [{ "path": "api/oauth.md", "reason": "向量化超时" }] },
      "pendingDelete": {
        "token": "a1b2c3d4e5f60718",
        "total": 12,
        "overLimit": false,
        "truncated": false,
        "stale": false,
        "blocked": null,
        "untouchedGroups": ["wiki/old"],
        "items": [{ "group": "wiki/old", "relation": "legacy", "sourcePath": "old/legacy.md", "untouched": true }]
      }
    }
  }
}
```

> 设计取舍：**列表与详情分成两个接口**，而不是一个接口带 `?detail=1`。理由：列表页要跨 scope 聚合（N 个 scope × 500 条 items 会让响应膨胀到 MB 级），详情页只要 1 个 scope。被否决方案：单接口全量返回（列表页首屏被 items 拖慢）。

### 3.3 鉴权（两段式，缺一不可）

```ts
// 1) 带 scope 的请求：登记进 lib/mcp-http-api.ts:502-503 的白名单表达式
p === '/datasource/list' || p === '/datasource/detail'
// 2) 无 scope 的 list：白名单不构成范围约束，必须在 handler 内过滤
```

只登记**只读**路由；`/datasource/prune` 是 POST，走 handler 内 `scopeAllowed`（与 `/import/prune` 同款，`mcp-http-api.ts:1767`）。

> **⚠ 为什么必须有第 2 段（2026-10-21 核对新增）**：白名单的实现是「取 query 的 `scope`，缺省回落 `'default'`，再判 `scopeAllowed`」（`mcp-http-api.ts:504-506`）——它只能回答"你能不能以 default 身份访问这个接口"，**不限制接口返回哪些 scope 的数据**。`/datasource/list` 省略 `scope` 时若直接返回全部，任何远程 token 都能枚举本机所有 scope、绝对路径与同步状态（比推演 P21 的"信息暴露"严重一档，属越权读）。
>
> **实现**：`authScopes === null`（回环）→ 不过滤；否则 `sources / missing / migrationHints` 三者都按 `scopeAllowed(authScopes, scope)` 过滤，`total` 取过滤后长度。先例：`ki_scope_list` / `ki_manage_index_list` 的工具层 `authScopes` 过滤（`SCOPE_LESS_TOOLS` 豁免后由工具自己收口）。
>
> 计数口径：总览卡「数据源」数 = 本接口返回的 `total`（**已按当前 token 可见范围过滤**），不要在前端另行过滤或另算。

### 3.4 scope 枚举（**不能复用 `listAllScopes`**）

```ts
// lib/datasource.ts
export function listDataSourceScopes(): { registered: string[]; missing: string[]; hints: MigrationHint[] }
```

**⚠ 实现必须扫描 `datasource.json` 本身，不能用 `scope.ts::listAllScopes()`**：`listAllScopes()` 的判据是「目录下存在 `relations-cache.json` 或 `.relations/manifest.json`」（[scope.ts:236-248](file:///root/knowledge-indexer/src/lib/scope.ts#L236)）⇒ **登记了但还没同步过的 scope（KB 无数据）会被完全漏掉**，而它恰恰是最该在列表里出现的（状态 `never`）。

正确做法：遍历 `<dataDir>` 的子目录（名字走 `/^[a-zA-Z0-9_-]+$/`，与 `listAllScopes` 同口径）→ `fs.existsSync(path.join(getKbDir(name), 'datasource.json'))` 即登记；`hints` 来自 `getSource(scope)` 非空但无 `datasource.json`（同样只遍历目录，不要求有 KB 数据）。

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 |
|---|---|---|---|
| D1 | 列表 + 详情拆两个接口 | 单接口 `?detail=1` | 列表跨 scope 聚合，`pendingDelete.items` 最大 500 条 × N 个 scope ⇒ 首屏响应可达 MB 级 |
| D2 | `missing` 与迁移提示单独字段 | 混进 `sources[]` 并带 `state:'missing'` | 会让前端"有数据源"的计数口径分叉（总览卡到底算不算 missing？）；分开后口径唯一：`sources.length` |
| D3 | 只读接口不新增写操作 | 列表页顺带返回"建议动作" | 越权风险；页面唯一动作是删除，走 S-03 |
| D4 | 复用 scope 枚举而非新增 `/api/scope/list` | 新增 `/api/scope/list` 给前端 | 该接口会与 MCP 工具 `ki_scope_list` 形成第二份 scope 口径（`registered` 语义已存在差异）；本需求只需"有数据源的 scope" |
| **D5** | **无 scope 的 list 在 handler 内按 `authScopes` 过滤输出** | 只靠只读白名单 | 白名单只约束"以 default 身份能不能调这个接口"，不约束返回范围（`mcp-http-api.ts:504-506`）⇒ 不过滤 = 远程 token 可枚举全部 scope。先例：`ki_scope_list` 工具层过滤 |

**重新评估触发条件**：若前端需要"全部 scope（含无数据源）"，D4 需重开（届时统一 `/api/scope/list` 并让 `ki_scope_list` 改为调用同一实现）；若 MCP HTTP 将来引入"按 token 生成过滤视图"的通用机制，D5 可收归该机制。

## 5. 异常处理

| # | 场景 | 行为 | 对外暴露 |
|---|---|---|---|
| E1 | `datasource.json` 损坏 | 该 scope 记入 `missing`（附 `reason:'corrupt'`），其余正常返回 | 是 |
| E2 | 目录不可读 | 该 scope 记入 `missing`（`reason:'unreadable'`） | 是 |
| E3 | 无任何数据源 | `{ ok:true, total:0, sources:[] }`（**不是 404**） | 是 |
| E4 | `detail` 的 scope 未登记 | 404 `DATASOURCE_NOT_FOUND` | 是 |
| E5 | 任务台账读取失败 | `running:false` + 不阻塞（台账是可选信息，不能因它 500） | 否（静默降级，服务端日志） |
| E6 | 远程 token 越权 | 带 scope 的请求 → 403 `scope forbidden`；无 scope 的 list → **静默按授权过滤**（不 403，因为请求本身合法，只是可见范围收窄） | 是（以返回集合体现） |

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/mcp-http-api.ts` | [修改] 2 条 GET 路由 + 2 个 handler + 白名单 1 行 |
| `src/lib/datasource.ts` | [新增] `listDataSourceScopes()` / `readDataSource(scope)` |
| `web/src/api/httpApi.ts` | [修改] `getDataSourceList()` / `getDataSourceDetail()` |
| `web/src/lib/hooks.ts` | [修改] `useDataSourceList()` / `useDataSourceDetail(scope)` |

## 7. 待定问题

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| Q1 | `lastSync` 摘要里是否需要 `pendingDelete.items` 的前几条 | 列表页想显示"12 篇待删"只需 count | 不需要；count 足够 |
| Q2 | 列表排序 | 数据源多了以后顺序无预期 | 按 `lastSync.at` 升序（最久未同步在前），无 `lastSync` 的排最后 |
