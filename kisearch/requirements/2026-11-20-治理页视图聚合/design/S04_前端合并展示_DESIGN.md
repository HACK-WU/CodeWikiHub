# S-04 前端合并展示与写禁用

父文档：`DESIGN.md` ｜ 依赖：S-02（响应契约）、S-03（错误码）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 视图模式 | 当前 scope 是视图（响应含 `view`）时的前端形态 |
| 条目键 | `scope\0group\0name` 三段复合键，替代原 `group\0name` |
| 库归属标签 | `库名 / Group`，用于在合并列表里区分来源库 |

## 2. 现状（AS-IS）

| 文件 | 位置 | 现状 |
|---|---|---|
| `web/src/pages/LifecyclePage.tsx` | `:75` `useScopeValue()`；`:116` `keyOf = group\0name`；`:118-131` 请求；`:135-139` 计数用 `docs.length`；`:325-330` 批量按钮；`:439-458` 行内编辑；`:601-609` 正文抽屉传顶栏 `scope` | 视图下列表空、计数 0；写按钮可点；抽屉读不到正文 |
| `web/src/pages/TrashPage.tsx` | `:63` 请求；`:107-117` 头部显示单一 `settings`；`:181-263` 表格；`:236-255` 恢复/彻底删传顶栏 `scope` | 视图下空；恢复会带视图名 |
| `web/src/layouts/AppShell.tsx` | `:238-250` 侧栏计数 | 视图下 0 |
| `web/src/api/governanceApi.ts` | `:489-505` `GovernanceDocItem` 无 `scope`；`:507-517`、`:404-413`、`:465-467` 返回类型无视图字段 | 类型不支持合并响应 |
| `web/src/lib/viewBuckets.ts` | `:27-41` 复合键范式；`:102-126` 库名前缀 / 反解 | **可借鉴不直接复用**（浏览页耦合了树与 group 前缀语义） |

## 3. 方案（TO-BE）

### 3.1 `web/src/api/governanceApi.ts`（契约对齐）

```ts
export interface GovernanceDocItem {
  scope: string;              // 新增（必填）
  group: string;
  name: string;
  // …其余字段不变
}

export interface GovernanceLifecycleCounts { all: number; wiki: number; temp: number; event: number }

export interface GovernanceViewMeta {
  view?: string;
  members?: string[];
  buckets?: Array<{ scope: string; total?: number; error?: string }>;
  skipped?: Array<{ scope: string; reason: string }>;
  truncated?: boolean;
}

export interface GovernanceDocsResponse extends GovernanceViewMeta {
  ok: true; scope: string; total: number; items: GovernanceDocItem[];
  lifecycleCounts?: GovernanceLifecycleCounts;   // 缺失 = 旧 daemon，前端回退 docs.length
}

export interface GovernanceCounts extends GovernanceViewMeta { /* 现有五数不变 */ }

export interface TrashListResponse extends GovernanceViewMeta {
  ok: true; scope: string; total: number; items: TrashItemView[];
  settings?: TrashSettingsView;                                   // 视图下缺省
  settingsByScope?: Array<{ scope: string; settings: TrashSettingsView }>;
  truncated?: boolean;
}
```

### 3.2 新增 `web/src/lib/governanceView.ts`

```ts
export function isGovernanceView(res: { view?: string } | undefined): boolean;   // view != null
export function govDocKey(d: { scope: string; group: string; name: string }): string;   // `${scope}\0${group}\0${name}`
export function govGroupLabel(scope: string, group: string): string;                    // `${scope} / ${group}`
export const VIEW_WRITE_HINT = '视图为只读聚合，请切到具体知识库后再修改';
```

> 为什么不直接用 `viewBuckets.ts` 的 `prefixGroup`：那里把 `__root__` 映射成库名、并为树路径服务；治理页要的是稳定的「库 / 组」展示，耦合会带来两套语义。

### 3.3 `LifecyclePage.tsx`

| 改动 | 具体做法 |
|---|---|
| 视图判定 | `const isView = isGovernanceView(list)`，与 `docs` 同批 setState |
| 头部 | `gov-badge--kb` 文案改 `视图 {scope}`；后面跟 `全部 Group · {members.length} 个库` |
| 提示条（①） | 视图时在工具栏上方插入 `gov-hint`：`只读聚合视图：数据来自 A、B；改分类请切到具体知识库`；若有 `skipped`/`truncated` 追加一行 |
| 计数（④） | 优先 `lifecycleCounts`；缺失回退现有 `docs` 统计（旧 daemon） |
| 条目键 | 全部 `keyOf` 换 `govDocKey`（含 `selected` 集合、`selectedDocs` 过滤） |
| 库归属（②） | Group 列渲染 `govGroupLabel(doc.scope, doc.group)`，`title` 给完整路径；单库模式不显示前缀（`isView ? label : group`） |
| 写入口（③） | 新建分类、批量三条、行内编辑：`disabled={!canWrite \|\| isView}`，`title` 视图时用 `VIEW_WRITE_HINT` |
| 正文抽屉（⑤） | `docTarget` 类型加 `scope`；`ModuleDrawer scope={docTarget.scope}` |
| 截断文案 | 视图时 `当前视图（N 个库）共 M 篇，仅加载前 X 篇`；底部 notice 同步 |
| 分页 | 不变（客户端分页作用在合并结果上） |

### 3.4 `TrashPage.tsx`

| 改动 | 具体做法 |
|---|---|
| 视图判定 / 头部 | `视图 {scope}` + `{members.length} 个库 · 共 {total} 条`；不再显示单一 `settings.keepDays` |
| 提示条（①） | `只读聚合视图：恢复 / 彻底删除会落到条目所属库；设置请切到具体库修改` |
| 条目键 | 加 `scope` 前缀（`dirName` 跨库可能重名） |
| 库归属（②） | Group 列 `govGroupLabel(item.scope, item.group)` |
| 恢复 / 彻底删 | 传 `item.scope`，不传顶栏 `scope` |
| 设置入口（③） | 视图下 `disabled` + `VIEW_WRITE_HINT` |
| `settings` 可选访问 | 类型改 `settings?: TrashSettingsView`；页面读取全部改可选链，视图下不渲染该行（否则 `settings.keepDays` 会在视图下抛错） |

### 3.6 关键决策点

| 决策 | 被否决方案 | 否决理由 |
|---|---|---|
| 新增 `governanceView.ts`，不复用 `viewBuckets.ts` | `import { prefixGroup }` 直接用 | `prefixGroup` 把 `__root__` 映射为库名、并为目录树服务；治理页要稳定的「库 / 组」展示，复用会把树的语义带进表格 |
| 视图下不请求 `listEventTypes` / `getTrashSettings` | 照常请求后忽略结果 | 会触发一次必然为空的多库读（成员数 × 1 次 IO），且 `listTypes` 对不存在的库返回**内置类型**，容易被误当成真实配置 |
| 侧栏不改（只靠 `/counts` 合计） | 前端拿三页数据自己算 badge | 侧栏与页面各自聚合必然漂移；`/counts` 已是同源接口 |

### 3.5 `AppShell.tsx`

**一处必要改动**：`scope` 变化时先 `setGovCounts(null)`。现有效果只写不清（`AppShell.tsx:239-250`），切到视图后会**短暂显示上一个库的数字**——比显示 0 更误导（用户会以为视图等于那个库）。其余不改：合计由后端给，侧栏不自行聚合。

可选：`title` 加 `视图合计 · N 个库`（`view` 字段存在时）。本次不做，避免与页面文案不同步。

## 4. 界面（已确认布局）

> 布局图已按用户「直接给出全部设计文档」授权代定并视为确认；实施时以本节为准，不再重画。

**分类页（视图模式）**

```
┌ 分类 ───────────────────────────────────────────────────────────────────┐
│ [视图 monitor-docs]  全部 Group · 2 个库         ＋ 新建分类(③禁用)      │
├─────────────────────────────────────────────────────────────────────────┤
│ ① 只读聚合视图：数据来自 monitor-memory、ops-wiki；改分类请切到具体库    │
├─────────────────────────────────────────────────────────────────────────┤
│ [全部 128][事件 12][临时 9][wiki 107]  [搜索…]        [排序][刷新]       │
│ ☐ 文档名              ②库 / Group             分类  期限/事件  活跃 操作 │
│ ☐ 登录页白屏排查      monitor-memory / 会话   事件  #3 排查中 昨天③锁定 │
│ ☐ nginx 超时定位      monitor-memory / 部署   临时  剩 5 天   3天前③锁定 │
│ ☐ 值班手册            ops-wiki / 运维         wiki  永久保留  1月前③锁定 │
│ ④ 第 1 / 7 页 · 共 128 篇     每页 [20] 条     ← 1 2 … 7 →              │
└─────────────────────────────────────────────────────────────────────────┘
```

**回收站页（视图模式）**

```
┌ 回收站 ──────────────────────────────────────────────────────────────────┐
│ [视图 monitor-docs]  3 个库 · 共 12 条           [回收站设置](③禁用)      │
├──────────────────────────────────────────────────────────────────────────┤
│ ① 只读聚合视图：恢复 / 彻底删除会落到条目所属库；设置请切到具体库修改     │
├──────────────────────────────────────────────────────────────────────────┤
│ [全部 12][临时到期 7][事件收口 3][手动删除 2]   批量恢复(3) 彻底删除(1)   │
│ ☐ 文档名        ②库 / Group           原因      剩余      操作            │
│ ☐ 旧排查记录    ops-wiki / 排查       手动删    剩 5 天   恢复  彻底删    │
└──────────────────────────────────────────────────────────────────────────┘
```

**变更点表**

| # | 变更点 | 现状 | 预期 | 类型 |
|---|---|---|---|---|
| ① | 视图提示条 | 无 | 两页顶部一行，列成员库 + 只读说明 | 新增 |
| ② | 库归属 | Group 列仅组路径 | `库 / Group`（视图模式），单库不变 | 修改 |
| ③ | 写入口 | 可点 | `disabled` + `VIEW_WRITE_HINT` | 修改 |
| ④ | 计数口径 | `docs.length` | `lifecycleCounts`（回退 `docs.length`） | 修改 |
| ⑤ | 正文抽屉 scope | 顶栏 scope | `doc.scope` | 修改 |

## 5. 接口消费

| 前端调用 | 视图响应消费方式 |
|---|---|
| `listGovernanceDocs(scope, {limit:200})` | `items` 直接渲染；`total` 用于分页/提示；`lifecycleCounts` 用于 tab；`members` 用于提示条；`buckets[].error` 用于"读取失败"提示 |
| `listEventTypes(scope)` | 视图下**不再调用**（分类页只用于编辑弹窗的「绑定事件」提示；视图下编辑被禁用）→ 改为 `canEdit ? listEventTypes(scope) : Promise.resolve(null)`，避免一次必然为空的多库读 |
| `getGovernanceCounts(scope)`（侧栏） | 直接用合计 |
| `listTrash(scope, {limit:200})` | `items` 渲染；`total` 显示「共 N 条」；`settingsByScope` 不在页面展示（设置入口已禁用），仅用于将来 |
| `getTrashSettings(scope)` | 视图下**不调用**（入口禁用）；避免读出第一个库的设置误导用户 |

## 6. 异常处理

| 场景 | 前端行为 | 是否提示 |
|---|---|---|
| 响应含 `view` 但 `items` 为空且 `buckets` 全 error | 列表显示「成员库读取失败」+ 首个 error | 是 |
| `skipped` 非空（strict 未注册） | 提示条追加「N 个成员库未参与：…」 | 是 |
| `truncated` 为 true | 提示条追加「仅合并前 12 个成员库」 | 是 |
| `total > items.length` | 常驻截断提示（现有 `truncated` 逻辑复用） | 是 |
| 写操作返回 409 `VIEW_NOT_WRITABLE` | 用 `GovernanceApiError.code` 显示 hint，不弹原始 message | 是 |
| 旧 daemon（无 `scope` 字段） | `govDocKey` 回退 `''` + `group` + `name`（不报错，仅失去跨库区分） | 否 |
| 403 `FORBIDDEN_SCOPE`（token 只授权视图名、未授权全部成员） | 整页错误提示 + 列出 `details.missingViewMembers` + 指引切到已授权的库 | 是 |

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `web/src/api/governanceApi.ts` | 类型扩展（`scope` / `lifecycleCounts` / 视图元信息 / `settingsByScope`） |
| `web/src/lib/governanceView.ts` | 新增 |
| `web/src/pages/LifecyclePage.tsx` | 视图模式：头部、提示条、计数、键、库归属、写禁用、抽屉 scope、文案 |
| `web/src/pages/TrashPage.tsx` | 视图模式：头部、提示条、键、库归属、恢复/彻底删 scope、设置禁用 |
| `web/src/layouts/AppShell.tsx` | 切 scope 时清空 `govCounts`（避免短暂显示上一库数字）；其余不改（合计由后端给） |
| `web/src/styles/governance.css` | 若 `gov-hint` 在工具栏上方间距不足，补一条 `margin`（值级调整，无需重新确认布局） |

## 8. 验收

1. `web` 侧 `tsc --noEmit` 0 错、`vite build` 通过；
2. 真机：顶栏选视图 → 分类页 tab 计数 = 各成员库之和，行上显示库名，点行打开的正文来自该库；
3. 真机：侧栏三个 badge 与三页头部数字一致（视图下为合计）；
4. 真机：视图下所有写入口禁用；直连 curl 写端点 409；
5. 回归：切回单库，三页行为与改造前逐项一致（无库名前缀、无提示条、写入口恢复）。
