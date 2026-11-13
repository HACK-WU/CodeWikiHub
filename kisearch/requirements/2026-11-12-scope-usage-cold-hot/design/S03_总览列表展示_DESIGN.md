# S-03 总览列表展示

> 父文档：`DESIGN.md` ｜ 上游：S-02（`ScopeEntry.usage`）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 窗口档位 | 前端当前选中的 `7 / 30 / 90` 天，决定读 `usage.d7 / d30 / d90` |
| 排序键序列 | `[被点列, (被点列 ≠ 文档数 ? 文档数 : 无), scope 名]`，详见 §3.3 |
| 空值 | 该 scope 的 `usage` 为 `null/undefined`，三列统一渲染 `—` |

## 2. 现状 AS-IS

| 事实 | 位置 |
|---|---|
| 列表为硬编码三列 `<th>`，无列配置数组、无排序、无搜索、全量渲染 162 行 | `web/src/pages/DashboardPage.tsx:643-683` |
| 「层状态」由内联徽标渲染，复用 `badgeCell()` / `readonlyBadge()` | `:49-55`、`:42-47`、`:662-676` |
| 同页第二张表「显示注册 scope」为 3 列 | `:549-601` |
| 数据来源 `useScopeList()`，`queryKey: ['scopeList']`，全局共享 | `web/src/lib/hooks.ts:83-90` |
| **窄屏隐藏规则是全局选择器**：`.ki-table th:nth-child(3), :nth-child(4) { display:none }` | `web/src/styles/ki.css:1281-1282` |
| 单元格 `padding: 11px 20px`、`white-space: nowrap` | `web/src/styles/ki.css:838` |

**由现状推导出的两条硬约束**

1. **收窄 padding / 隐藏列绝不能改全局 `.ki-table` 规则**：`ki.css:1281` 对**所有** `.ki-table` 生效（浏览页等其他表格也在用）。总览表一旦变 6 列，全局规则会隐藏第 3、4 列 —— 正好是「冷热」和「查询」。
2. **长 scope 名必须截断**：`bulk-verify-1786619558409`（25 字符）在 1065px 下会顶破 6 列布局，且 `.ki-card` 是 `overflow:hidden`，页面级 `scrollWidth` 仍为 0，肉眼才能发现。

## 3. 方案 TO-BE

### 3.1 列结构（6 列）

| # | 列 | 对齐 | 内容 |
|---|---|---|---|
| 1 | SCOPE | 左 | 圆点 + 名称（超宽截断 + `title` 全名） |
| 2 | 层状态 | 左 | 既有 KB / RAG / FTS / 只读 徽标，不变 |
| 3 | 冷热 | 左 | `● 热 / ● 温 / ● 冷 / ○ 无调用`，无统计 `—` |
| 4 | 查询 | 右 | 千分位数字 / `0` / `—` |
| 5 | 写入 | 右 | 同查询 |
| 6 | 文档数 | 右 | 既有 `wikiCount` |

### 3.2 卡头

左侧 `SCOPES / 知识库`，右侧依次：**Scope 搜索框** → **窗口切换** → `N 个 scope`。

窗口切换控件：分段按钮 `7天 / 30天 / 90天`（复用项目既有的 `.u2-inline-panel__seg` 式分段控件视觉，或极简三段文字按钮），默认 `7天`。

### 3.3 排序

```ts
type SortKey = 'heat' | 'query' | 'write' | 'docs';
const HEAT_RANK = { hot: 3, warm: 2, cold: 1, unused: 0 } as const;

/** 排序键序列：被点列 → 文档数（若主键不是它）→ scope 名（稳定兜底） */
function compare(a: Row, b: Row, key: SortKey, dir: 'asc' | 'desc'): number {
  const mul = dir === 'asc' ? 1 : -1;
  const va = primary(a, key), vb = primary(b, key);      // 空值返回 null
  if (va === null && vb === null) return 0;
  if (va === null) return 1;                             // 空值恒末尾，不随 dir 翻转
  if (vb === null) return -1;
  if (va !== vb) return (va < vb ? -1 : 1) * mul;
  if (key !== 'docs') {                                  // 次键：文档数降序（固定方向）
    const da = a.wikiCount ?? 0, db = b.wikiCount ?? 0;
    if (da !== db) return db - da;
  }
  return a.scope.localeCompare(b.scope);                 // 三级：名字升序，防抖动
}
```

| 规则 | 说明 |
|---|---|
| 默认 | `key='heat'`, `dir='desc'` ⇒ 热 → 温 → 冷 → 未使用，同档内文档数降序（满足需求 D6） |
| 点击表头 | 同列切换 `asc/desc`；换列则重置为 `desc` |
| 空值 | 无论升降序一律排在有效值之后（需求 R4 验收项） |
| 表头指示 | 当前排序列显示 `↓ / ↑`；`文档数` 在非主键时不做指示（它是隐式次键） |

### 3.4 搜索

纯前端过滤 `list`，零新增请求：

```tsx
const rows = useMemo(
  () => list.filter((s) => s.scope.toLowerCase().includes(keyword.trim().toLowerCase())),
  [list, keyword]
);
```

搜索与排序可叠加（先筛后排）。无匹配时展示一行 `ki-empty` 文案「没有匹配的 scope」。

### 3.5 空值与档位渲染

```tsx
const win = (s: ScopeInfo) => (s.usage ? s.usage[`d${windowDays}`] : null);
```

| 条件 | 渲染 |
|---|---|
| `s.usage == null` | 三列均 `—`，`title="统计不可用（尚未产生统计数据）"` |
| `win(s) == null` | 同上（防御旧 daemon 半截数据） |
| `read === 0 && write === 0` | 数字均显示 `0`；冷热显示 `○ 无调用`，`title="近 ${windowDays} 天内 0 次调用"` |
| `coveredDays < windowDays` | 数字后加角标 `*`，`title="仅覆盖 ${coveredDays} 天（该库首次出现较晚）"` |

**★ 文案刻意不用「未使用」**：`heat === 'unused'` 的准确含义是「**本窗口**内 0 次调用」。一个每月用一次的库，切到「近 7 天」会显示该档位、切到「近 30 天」可能显示「热」。用「未使用」会让用户读成「从来没被用过」，而 162 行里 100+ 个都会命中这一档——这是诱发批量误删的最短路径。改用「无调用」，并把窗口写在 tooltip 里。

「从未使用」（该 scope 从未出现在统计中）不单独给档位，由 `usage: null` 的 `—` 表达。

### 3.6.1 数字角标（coveredDays）

`coveredDays < windowDays` 表示该库接入较晚、窗口未被填满，数字天然偏小。渲染为 `5*`，tooltip 说明覆盖天数。角标只在「查询/写入」两列出现，不影响冷热列（冷热本就按同一窗口算）。

### 3.6 第二张表（「显示注册 scope」）

复用同一套单元格渲染（抽 `<UsageCells>`），列序如下（原 3 列 + 新增 3 列，**文档数列不搬过来**）：

| # | 列 | 说明 |
|---|---|---|
| 1 | Scope | 既有 |
| 2 | 层状态 | 既有 |
| 3 | 冷热 | 新增（同主表） |
| 4 | 查询 | 新增（同主表） |
| 5 | 写入 | 新增（同主表） |
| 6 | Wiki 回写 | 既有 |

- 该表**不接排序与搜索**（需求只要求主表），保持现有静态展示，避免两张表出现两套交互状态。
- 窗口切换对两张表同时生效（同一个 `windowDays` state）。
- 两张表的冷热与数字必须逐行一致（同源 `list`，无第二份数据）。
- 该表同样加 `ki-table ki-scope-table` 两个类，窄屏规则共用（其第 4/5/6 列在 ≤640 隐藏 ⇒ Wiki 回写会被隐藏，与改造前「第 3 列隐藏」的行为一致）。

### 3.7 样式（全部限定在 `.ki-scope-table`）

```css
/* 只作用于总览两张表，不动全局 .ki-table */
.ki-scope-table th, .ki-scope-table td { padding-left: 14px; padding-right: 14px; }
.ki-scope-table .ki-scope-name__text {
  display: inline-block; max-width: 220px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;
}
.ki-scope-table .ki-heat { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.ki-scope-table .ki-heat__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

@media (max-width: 640px) {
  .ki-scope-table th:nth-child(4), .ki-scope-table td:nth-child(4),
  .ki-scope-table th:nth-child(5), .ki-scope-table td:nth-child(5),
  .ki-scope-table th:nth-child(6), .ki-scope-table td:nth-child(6) { display: none; }
}
```

同时把 `ki.css:1281-1282` 的全局规则收窄为不命中总览表，保证其他页面零回归：

```css
.ki-table:not(.ki-scope-table) th:nth-child(3), .ki-table:not(.ki-scope-table) td:nth-child(3),
.ki-table:not(.ki-scope-table) th:nth-child(4), .ki-table:not(.ki-scope-table) td:nth-child(4) { display: none; }
```

## 4. 界面

> 阶段 2.4 已确认的布局图，原图内嵌（不重画）。

```
┌────────────────────────┬───────────────────────┬──────────┬─────────┬─────────┬──────────┐
│ SCOPES                                                                              │
│ 知识库                                                     [近 7 天 ▾] 162 个 scope │
├────────────────────────┼───────────────────────┼──────────┼─────────┼─────────┼──────────┤
│ SCOPE                  │ 层状态                │ 冷热 ↓   │    查询 │    写入 │ 文档数 ↓ │
├────────────────────────┼───────────────────────┼──────────┼─────────┼─────────┼──────────┤
│ ● ai-docs              │ [KB] [RAG] [只读]     │ ● 热     │   1,284 │      12 │     1882 │
│ ● bkmontest            │ [KB] [RAG]            │ ● 冷     │       0 │       0 │      143 │
│ ● bulk-test            │ [KB] [RAG]            │ ● 冷     │       0 │       0 │        2 │
│ ● code-group-demo      │ [KB] [RAG]            │ ○ 未使用 │       — │       — │        1 │
└────────────────────────┴───────────────────────┴──────────┴─────────┴─────────┴──────────┘
```

| # | 变更点 | 现状 | 预期 | 类型 |
|---|---|---|---|---|
| ① | 冷热列 | 无 | 层状态右侧，色点 + 四档文字 | 新增 |
| ② | 查询列 | 无 | 独立列、右对齐、千分位 | 新增 |
| ③ | 写入列 | 无 | 独立列、右对齐、千分位 | 新增 |
| ④ | 四列排序 | 无 | 点表头切换升降序，默认 冷热↓ + 文档数↓ | 新增 |
| ⑤ | 卡头搜索框 | 无 | 左侧输入框，前端过滤 | 新增 |
| ⑥ | 卡头窗口切换 | 无 | `7天 / 30天 / 90天` 分段 | 新增 |
| ⑦ | 长名截断 | 完整显示 | 220px 截断 + `title` 全名 | 修改 |
| ⑧ | 窄屏规则 | 全局隐藏第 3、4 列 | 总览表专属规则：隐藏第 4/5/6 列，其他表行为不变 | 修改 |
| ⑨ | 第二张表 | 3 列 | 同步 6 列 | 修改 |

> 上图是阶段 2.4 你确认过的布局，**未重画**。评审后仅调整一处**纯文案**（闸门豁免项）：图中 `○ 未使用` 已改为 `○ 无调用`，原因是 `unused` 的真实含义是「**本窗口**内 0 次调用」而非「从未使用」——162 行里 100+ 个都会命中该档，原文案会诱导批量误删。布局、列宽、排列一律不变。

## 5. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 老 daemon 不返回 `usage` | 三列 `—`，排序按空值末尾 | 否 |
| 统计不可用（`usage: null`） | 同上，`title="统计不可用"` | 否 |
| 搜索无匹配 | 表格体显示「没有匹配的 scope」，不隐藏表头 | 否 |
| 列表为空（0 个 scope） | 沿用既有 `ki-empty`（`:630-641`） | 否 |
| 窗口切换到某档后全为 0 | 正常显示 `0`，冷热「未使用」 | 否 |
| 排序遇非法值（NaN / 负数） | 视为 0 参与排序，不抛错 | 否 |

## 6. 影响范围

| 文件 | 变更 |
|---|---|
| `web/src/pages/DashboardPage.tsx` | 表头/表体 6 列、排序、搜索、窗口切换、第二张表、`<UsageCells>` 子组件、`coveredDays` 角标（约 240 行） |
| `web/src/styles/ki.css` | 新增 `.ki-scope-table` 段（约 30 行）；收窄 `:1281-1282` 全局规则（加 `:not(.ki-scope-table)`） |
| `web/src/api/mcpClient.ts` | `ScopeInfo` 加 `usage?` 与 `ScopeUsage` 类型（S-02 已列） |
| `web/test/dashboard-usage.test.mjs` | **新增**：源码守卫（默认排序方向、空值末尾、窄屏规则不污染全局、两表共用单元格组件） |

## 7. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 排序实现位置 | 前端 `useMemo` 排序 | 后端排序（传 sortKey） | 列表本就一次拉全量 162 行，后端排序要多一次往返，且窗口/搜索都要跟着变参数 | scope 数 > 2000 需要分页时 |
| 窗口切换 | 前端切字段 | 重新请求 `ki_scope_list` | queryKey 分裂 + 每次切换一个 loading 态；三档数据本就一次返回 | 档位增至 5 档以上且响应体变大时 |
| 搜索实现 | 前端过滤 | 后端模糊查询 | 162 行内存过滤 < 1ms，后端要多一个入参与查询路径 | 需要跨 scope 搜索文档内容时 |
| 窄屏规则 | 新建 `.ki-scope-table` 命名空间 | 直接改全局 `.ki-table` 规则 | 全局规则被浏览页等多处共用，改一处会连带改坏其他表格 | 全站表格统一列结构时 |
| 次键方向 | 文档数固定降序 | 跟随主键方向翻转 | 翻转会让「升序看冷库」时文档数变成升序，与「先看大的」直觉相反 | 用户反馈需要「同档内先看小库」时 |
| 零调用档文案 | 「无调用」+ 窗口写进 tooltip | 「未使用」 | `unused` 判据是「本窗口内 0 次」，中文「未使用」指向「从没人用」；162 行里 100+ 行会命中，是诱发批量误删的最短路径 | 若未来加了「从未使用」的独立判据，可再区分用词 |

## 8. 组件接口设计

```ts
/** 单行视图模型：把 ScopeInfo 归一成"已按当前窗口取值"的形状，排序与渲染都只读它 */
interface ScopeRow {
  scope: string;
  kb: boolean;
  vector: boolean;
  readonly: boolean;
  ftsOnlyDocCount: number;
  wikiCount: number;
  /** null = 无统计（usage 缺失或该窗口无数据） */
  usage: ScopeUsageWindow | null;
  /** null = 无统计；`'unused'` 是有效值（窗口内 0 次调用），不是「从未使用」 */
  heat: Heat | null;
  /** 窗口覆盖天数（用于数字角标）；null = 无统计 */
  coveredDays: number | null;
}

type WindowDays = 7 | 30 | 90;
type SortKey = 'heat' | 'query' | 'write' | 'docs';
type SortDir = 'asc' | 'desc';

/** 冷热单元格（主表与第二张表共用） */
interface UsageCellsProps {
  row: ScopeRow;
  /** 渲染三列（冷热/查询/写入）；false 时只渲染冷热（预留） */
  withCounts?: boolean;
}

/** 卡头控件 */
interface ScopeTableToolbarProps {
  keyword: string;
  onKeywordChange: (v: string) => void;
  windowDays: WindowDays;
  onWindowDaysChange: (v: WindowDays) => void;
  total: number;
}

/** 表头排序 */
interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
  align?: 'left' | 'right';
}

/** 排序 + 过滤的统一入口（纯函数，便于单测） */
function buildRows(
  list: ScopeInfo[],
  opts: { keyword: string; windowDays: WindowDays; sortKey: SortKey; sortDir: SortDir }
): ScopeRow[];
```

约定：

- `buildRows` 是纯函数、不依赖 React，便于单测直接断言「默认排序 = 热→温→冷→未使用，同档内文档数降序」。
- `heat` 与 `usage` 的 `null` 语义必须分开：`heat === 'unused'` 是「统计正常、窗口内 0 调用」；`heat === null` 是「没有统计」。两者在排序上都排末尾，但 tooltip 文案不同。

## 9. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| U5 | 搜索框是否需要命中 Group 名 | 本期只匹配 scope 名；如需扩到 `topGroups`，在 `filter` 里加一个字段即可 |
| U6 | 是否需要「只看未使用」快捷筛选 | 本期用「点冷热列切升序 + 搜索」可达到；若使用频次高再加按钮 |
