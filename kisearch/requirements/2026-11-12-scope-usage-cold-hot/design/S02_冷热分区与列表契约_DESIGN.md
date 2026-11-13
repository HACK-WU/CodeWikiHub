# S-02 冷热分区与列表契约

> 父文档：`DESIGN.md` ｜ 上游：S-01（`readScopeUsage()`）｜ 下游：S-03（消费 `ScopeEntry.usage`）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 窗口聚合 | 把 S-01 的日桶按最近 N 天（`7 / 30 / 90`）求和 |
| heat | `hot / warm / cold / unused` 四档；`unused` = 窗口内 `read + write === 0` |
| 候选池 | 参与分区的 scope 集合 = **窗口内有调用**的 scope（`unused` 被先行剔除） |
| 视图摊分 | 统计里以视图名记录的调用，聚合时摊到每个成员库各 +1 |

## 2. 现状 AS-IS

| 事实 | 位置 |
|---|---|
| `ScopeEntry` 无任何调用量字段 | `src/scope.ts:78-106` |
| 列表接口由 `executeScopeListLocal()` 组装 | `src/scope.ts:439`；daemon RPC `:536` 转调 |
| 文档计数已有进程内缓存范式（按 manifest mtime/size/revision 失效） | `src/scope.ts:125-191` |
| 冷热算法已存在且是泛型 + accessor 注入 | `src/lib/scoring.ts:182-271 partitionByScore()` |
| 分区参数默认值 | `src/lib/constants.ts:38-49 DEFAULT_PARTITION_CONFIG` |
| 视图成员解析 | `src/lib/scope-view.ts:844 resolveScopeTargets()`、`:778 isViewName()` |

**group 口径不可直接搬用的原因**（需求 §2.2 已论证）：`useCount` 只在读原文/重复写入时 +1，检索不计数，且有 10 次上限 ⇒ 只能做相对排序，做不了调用量。

## 3. 方案 TO-BE

### 3.1 三档窗口一次算全（而非传 `windowDays` 入参）

`ki_scope_list` 入参**不变**，响应里 `usage` 固定带 `d7 / d30 / d90` 三档。

| 理由 | 说明 |
|---|---|
| 不分裂 queryKey | `useScopeList` 的 queryKey 是全局共享的 `['scopeList']`（`web/src/lib/hooks.ts:83-90`，AppShell 的 ScopeSelect 也用它）。若把窗口放进入参，queryKey 必须跟着变 ⇒ 全局选择器与总览页各发一次请求、缓存不共享 |
| 数据量极小 | 162 scope × 3 档 × 4 数值 ≈ 2 千个数字，JSON 约 30KB |
| 窗口切换零成本 | 纯前端切字段，无请求、无 loading 态 |
| 天然满足「窗口同源」 | 同一份聚合结果里既有数字又有 heat，不可能出现「数字变了 heat 没变」 |

### 3.2 视图摊分

```ts
// 伪代码：readScopeUsage 返回的 key 是原始名（可能含视图名）
const raw = readScopeUsage(config, windowDays);           // null → 整表 usage = null
const merged = new Map<string, { read: number; write: number; lastUsedAt: number }>();

for (const [name, snap] of raw ?? []) {
  if (isViewName(config, name)) {
    const members = resolveScopeTargets(config, name).scopes;   // 展开为成员库
    for (const m of members) addInto(merged, m, snap);          // 每个成员各 +1 份
  } else {
    addInto(merged, name, snap);
  }
}
```

- 同一 scope 既被直接调用又被视图摊分 → 累加（合理，代表总资源消耗）。
- 视图名本身**不参与展示**（它不在 scope 列表中）。
- 视图成员在聚合时读取 ⇒ 成员变更后历史数据的摊分口径随之变化，此口径需在文档显式声明（父文档风险 G3）。

**已知偏差（必须声明，不改实现）**：请求当时该 Token 可能只被授权视图的**部分成员**（strict 白名单会 `skipped` 部分成员，见 `src/lib/scope-view.ts:128-142` 的 `ScopeTargets.skipped`），而聚合时按**当前完整成员**展开 ⇒ 调用会被摊到用户当时无权访问的成员上。后果：授权内成员计数偏低、未授权成员（用户看不到该行）计数偏高。**不构成信息泄露**（`ki_scope_list` 已按 RBAC 裁剪行），纯属数字偏差。彻底修正需要在埋点阶段记录成员快照，会让埋点从 O(1) 变成需要解析视图配置——成本不成比例，故接受偏差并在此声明。

### 3.3 冷热分档

```ts
/** 全部 scope 先按窗口调用量分档；unused 不参与相对分区 */
function computeHeat(
  entries: { scope: string; read: number; write: number; lastUsedAt: number }[],
  cfg: PartitionConfig,
  now: number
): Map<string, Heat> {
  const heat = new Map<string, Heat>();
  const active = entries.filter((e) => e.read + e.write > 0);
  for (const e of entries) if (e.read + e.write === 0) heat.set(e.scope, 'unused');

  const { hot, warm, cold } = partitionByScore(active, {
    getId: (e) => e.scope,
    getScore: (e) => {
      const total = e.read + e.write;
      const hours = e.lastUsedAt > 0 ? (now - e.lastUsedAt) / 3_600_000 : 0;
      return total / (1 + Math.max(0, hours) / cfg.halfLifeHours);   // 与 calculateScore 同形
    },
    // reservedEmerging = 0 ⇒ 以下两个 accessor 不产生席位，仅保持 partitionByScore 契约完整
    isEmerging: (e) => e.lastUsedAt > 0 && now - e.lastUsedAt <= cfg.recentHours * 3_600_000,
    getEmergingSortScore: (e) => e.lastUsedAt,
  }, SCOPE_HEAT_CONFIG);

  for (const e of hot) heat.set(e.scope, 'hot');
  for (const e of warm) heat.set(e.scope, 'warm');
  for (const e of cold) heat.set(e.scope, 'cold');
  return heat;
}
```

**`SCOPE_HEAT_CONFIG`（新增，基于默认值覆盖两项）**

```ts
export const SCOPE_HEAT_CONFIG: PartitionConfig = {
  ...DEFAULT_PARTITION_CONFIG,
  maxWarmCount: null,     // 温区不截断：列表本就是全量 162 行，截断会让活跃库掉进冷区
  reservedEmerging: 0,    // 不给「新兴」留保底席位，见下表说明
};
```

| 参数 | 取值 | 说明 |
|---|---|---|
| `hotPercent` | 0.3 | 候选池前 30% 为热 |
| `warmPercent` | 0.5 | 热区之外的前 50% 为温，其余为冷 |
| `reservedEmerging` | **0** | 覆盖默认 10。group 给新兴留席位是为了「新内容曝光」，而 scope 的诉求是「谁在被用」——保底席位会让一个刚被调用 1 次的新库把调用 1000 次的老库挤出热区，与需求意图相反 |
| `maxHotCount` | 10 | 热区硬上限，防止「活跃库多时热区膨胀」 |
| `maxWarmCount` | **null** | 覆盖默认 50：不截断温区 |
| `halfLifeHours` | 24 | 评分半衰期：距上次使用 24h，权重减半 |
| `recentHours` | 48 | 仅用于派生 tooltip「近 48h 有使用」，**不参与分档** |

> `isEmerging` accessor 仍然提供（`lastUsedAt` 落在 `recentHours` 内），但 `reservedEmerging=0` 时不占席位，仅用于后续 tooltip 扩展。

### 3.4 契约扩展

```ts
/** 单个窗口档位的聚合结果 */
export interface ScopeUsageWindow {
  /** 窗口内**检索类**调用次数（含失败调用，见需求 D7；管理类读不计，见 S-01 §3.2） */
  read: number;
  /** 窗口内写调用次数（含失败调用） */
  write: number;
  /** 窗口内最近一次调用（毫秒）；0 = 窗口内无调用 */
  lastUsedAt: number;
  /**
   * 冷热档位。
   * `'unused'` 的准确含义是「**本窗口内** read+write 为 0」，**不是「从未使用」**。
   * 没有记录（该 scope 从未出现在统计里）由外层 `usage: null` 表达，二者不可混用。
   */
  heat: 'hot' | 'warm' | 'cold' | 'unused';
  /**
   * 该 scope 在本窗口内**被统计覆盖**的天数：
   * `min(窗口天数, today - firstSeen + 1)`，其中 `firstSeen` 来自 S-01 的
   * `scopes[*].firstSeen`（**不随 90 天日桶裁剪而回退**）。
   *
   * 注意是「覆盖天数」而非「有调用的天数」——一个 90 天里只被用过 1 天的库，
   * `d90.coveredDays` 仍是 90，否则会看起来像「只统计了 1 天」。
   *
   * 为什么需要：3 天前才接入的库，`d30.read = 5` 只覆盖 3 天；与真正统计满 30 天的库
   * 在同一列长得一模一样，用户会比较出「新库更冷」的错误结论。
   * 前端在 `coveredDays < 窗口天数` 时给数字加角标（如 `5*` + tooltip「仅覆盖 3 天」）。
   */
  coveredDays: number;
}

/** 调用量与冷热（`ScopeEntry.usage`） */
export interface ScopeUsage {
  /** 近 7 天 */
  d7: ScopeUsageWindow;
  /** 近 30 天 */
  d30: ScopeUsageWindow;
  /** 近 90 天 */
  d90: ScopeUsageWindow;
  /**
   * 统计起始日期（本地日期 YYYY-MM-DD）。
   * **全局字段**（所有 scope 取值相同）= 统计文件中最早的日桶日期；文件刚创建时等于当天。
   * 前端用于「自 X 起统计」tooltip，避免把「统计上线前的 0」误读成「没人用」。
   */
  since: string;
  /** 最近一次 flush 时间（ISO）；全局字段，前端可用于「数据新鲜度」提示 */
  updatedAt: string;
}

export interface ScopeEntry {
  // …既有字段不变…
  /** 调用量与冷热；**null = 统计不可用**（文件缺失/损坏/读失败），前端显示「—」 */
  usage: ScopeUsage | null;
}
```

**为什么整体包一层 `usage` 而不是平铺 `readCount / heat`**：① 三档嵌套天然自解释；② `null` 能一次性表达「统计整体不可用」，平铺时要给 9 个字段各判一次；③ 将来加档位（d180）不改 `ScopeEntry` 顶层。

## 4. 接口设计

### 4.1 MCP 工具 `ki_scope_list`

| 项 | 值 |
|---|---|
| 方向 | 入参**不变**（`{}`，无参数） |
| 返回 | `scopes[].usage` 新增，其余字段不变 |
| 异常 | 不新增异常；统计不可用降级为 `usage: null` |

响应示例（Demo，仅示意格式，非最终数据）：

```json
{
  "ok": true,
  "scope": "default",
  "scopes": [
    {
      "scope": "ai-docs",
      "kb": true, "vector": true, "registered": true, "readonly": false,
      "wikiCount": 1882, "ftsOnlyDocCount": 0, "ftsDocCount": 1882,
      "topGroups": ["部署运维"], "topGroupsStale": false,
      "wikiSync": { "enabled": true, "writableDir": "/root/wiki", "writableFrom": "source" },
      "usage": {
        "d7":  { "read": 1284, "write": 12, "lastUsedAt": 1762934400000, "heat": "hot",    "coveredDays": 7 },
        "d30": { "read": 4310, "write": 44, "lastUsedAt": 1762934400000, "heat": "hot",    "coveredDays": 30 },
        "d90": { "read": 9002, "write": 91, "lastUsedAt": 1762934400000, "heat": "hot",    "coveredDays": 90 },
        "since": "2026-08-14",
        "updatedAt": "2026-11-20T10:12:00.000Z"
      }
    },
    {
      "scope": "bulk-test",
      "kb": true, "vector": true, "registered": false, "readonly": false,
      "wikiCount": 2, "ftsOnlyDocCount": 0, "ftsDocCount": 2,
      "topGroups": [], "topGroupsStale": false,
      "wikiSync": { "enabled": false, "writableDir": null, "writableFrom": null },
      "usage": {
        "d7":  { "read": 0, "write": 0, "lastUsedAt": 0, "heat": "unused", "coveredDays": 7 },
        "d30": { "read": 0, "write": 0, "lastUsedAt": 0, "heat": "unused", "coveredDays": 22 },
        "d90": { "read": 3, "write": 0, "lastUsedAt": 1761000000000, "heat": "cold", "coveredDays": 22 },
        "since": "2026-08-14",
        "updatedAt": "2026-11-20T10:12:00.000Z"
      }
    },
    {
      "scope": "legacy-scope",
      "kb": true, "vector": false, "registered": true, "readonly": true,
      "wikiCount": 12, "ftsOnlyDocCount": 12, "ftsDocCount": 12,
      "topGroups": [], "topGroupsStale": false,
      "wikiSync": { "enabled": false, "writableDir": null, "writableFrom": null },
      "usage": null
    }
  ],
  "vectorAvailable": true,
  "scopeMode": "default"
}
```

### 4.2 前端类型 `ScopeInfo`（`web/src/api/mcpClient.ts`）

同步新增可选字段，保持向后兼容（老 daemon 不返回时 `usage === undefined`）：

```ts
export interface ScopeInfo {
  // …既有…
  /** 调用量与冷热；undefined/null 均按「无统计」渲染 — */
  usage?: ScopeUsage | null;
}
```

## 5. 数据模型

无新增持久化结构（S-02 只读 S-01 的文件），新增两处**内存态**：

| 结构 | 生命周期 | 说明 |
|---|---|---|
| `usageCacheEntry` | 进程内，按文件 `mtime + size` 失效 | 解析后的 `Map<scope, {days, lastUsedAt}>`，避免每次列表刷新重复解析 |
| `heatCache` | 每次 `executeScopeListLocal` 现算 | 依赖 `now`，不缓存（跨天后衰减应变化） |

## 6. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 统计文件缺失 | 全部 scope `usage: null`，列表其余字段正常 | 否 |
| 统计文件损坏 | 同「缺失」（S-01 已自愈重命名）；stderr 不重复刷 | 否 |
| 视图定义损坏（`isViewName` 抛错） | 按「不是视图」处理（与 `src/lib/scope-view.ts:778-787` 既有口径一致），该 key 作为 scope 名直接计入 | 否 |
| 视图成员为 0 | 该项调用不摊给任何 scope（丢弃该条），并在 `ki doctor` 未来版本提示 | 否 |
| `partitionByScore` 输入为空（全部 unused） | 不调用分区，全部 `unused` | 否 |
| 单个 scope 的 `lastUsedAt` 为未来时间（时钟回拨） | `getScore` 里 `Math.max(0, hours)` 钳位，避免 Infinity / 负分 | 否 |

## 7. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 冷热候选池 | 先剔除 `unused`，只在**有调用**的池内相对分档 | 全部 162 个一起 `partitionByScore` | 相对分位会按 162 算 30% ⇒ 49 个「热」，其中 40+ 个是 0 调用，视觉上荒谬 | 有调用的 scope 长期为 0（统计失效）时 |
| 候选池规模上限 | 温区不截断（`maxWarmCount: null`） | 沿用默认 50 | 列表本就渲染全量 162 行，截断会让第 61 个活跃库掉进「冷」区，与事实相反 | 活跃 scope 数常态 > 100 时 |
| 新兴保底席位 | `reservedEmerging: 0` | 沿用默认 10 | 保底会让刚被调用 1 次的新库挤掉调用千次的老库，与「谁在被用」的意图相反 | 产品需要「新库曝光」时（届时改为单列「新兴」而非占热区席位） |
| 窗口传递方式 | 一次返回三档 | 入参传 `windowDays` | queryKey 分裂导致全局 ScopeSelect 与总览页双重请求 | 窗口档位增加到 5 档以上、响应体 > 100KB 时 |
| heat 归属 | 服务端算 | 前端按阈值算 | 前端算会让「切换窗口」与「冷热」两处逻辑分家，且阈值无法与后端对齐 | 需要用户自定义阈值时 |
| 视图摊分时机 | 聚合时展开 | 埋点时展开 | 埋点层引入 `scope-view` 依赖会造成调度层与业务层耦合；且埋点追求 O(1) 无解析 | 视图内成员频繁变动且需要「按当时成员」记账时 |

## 7.5 性能 & 安全

| 项 | 约束与依据 |
|---|---|
| 列表响应耗时 | 统计部分 = 一次文件读（mtime/size 命中缓存时为零 IO）+ `162 × 3 窗口` 求和 + 3 次 `partitionByScore`（各 O(n log n)，n ≤ 162）。实测预算 ≤ 5ms，不超过 `executeScopeListLocal` 现有文档计数耗时 |
| 与文档计数缓存的关系 | 复用同一套「进程内 + 身份戳失效」思路（`src/scope.ts:125-139`），但统计缓存按**统计文件** mtime/size 失效，二者互不干扰 |
| 内存 | `Map<scope, {days}>` 约 3 万整数；heat 每次现算不缓存（依赖 `now`，跨天需变） |
| 权限 | `ki_scope_list` 的 RBAC 过滤发生在 `src/lib/mcp-tools/scope-list.ts:25-29`，按授权集合裁剪 scope 行；`usage` 随行走，不额外暴露未授权的 scope 名或调用量 |
| 敏感信息 | 统计只含「次数 + 时间戳」，不含请求参数、查询文本、Token 主体——**不可用于还原用户检索内容** |
| 越权路径 | 不存在新增入口：`ki_scope_list` 是 `SCOPE_LESS_ENUM_TOOL_NAMES` 成员（`src/lib/mcp-tools/tool-access.ts:46-49`），沿用既有过滤 |
| 响应体膨胀 | 162 scope × 3 窗口 × 约 80 字节 ≈ 40KB；`ki_scope_list` 由约 30KB 增至约 70KB。在 `/mcp` 单次响应内属可接受；若 scope 数翻倍再评估按需返回单窗口 |

## 8. 影响范围

| 文件 | 变更 |
|---|---|
| `src/scope.ts` | `ScopeEntry` 加 `usage`；`executeScopeListLocal()` 组装 usage（约 80 行） |
| `src/lib/scope-heat.ts` | **新增**（约 120 行）：摊分 + 窗口聚合 + `computeHeat()` |
| `src/lib/constants.ts` | 新增 `SCOPE_HEAT_CONFIG`、`SCOPE_USAGE_WINDOWS = [7, 30, 90]` |
| `web/src/api/mcpClient.ts` | `ScopeInfo` 加 `usage?` + 类型定义（约 30 行） |
| `test/scope-list-usage.test.ts` | **新增**：摊分、分档、降级、时钟钳位 |

## 9. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| U3 | 窗口档位固定 `7 / 30 / 90` 是否合适 | 已按需求 D10 落三档；若需 14/60 等中间档，改 `SCOPE_USAGE_WINDOWS` 常量即可，但需相应调整存储保留天数 |
| U4 | 「新兴」是否需要单独展示 | 已按需求 D2 并入热区，用 `lastUsedAt` 派生 tooltip，不加档位 |
