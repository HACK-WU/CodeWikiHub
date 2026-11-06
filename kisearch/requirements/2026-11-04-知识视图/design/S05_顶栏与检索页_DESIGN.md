# S-05 顶栏两级选择器 + 检索来源标记

- 父文档：`DESIGN.md` §3
- 前置依赖：S-02（`views[]` 响应字段）、S-04（`ki_scope_list` 返回 `views[]`）
- 证据：🟢 代码直读（`web/src/lib/scopeContext.tsx`、`components/ScopeSelect.tsx`、`pages/SearchPage.tsx`、`lib/hooks.ts`）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| `mode` | 前端语境：当前顶栏选择是 `'scope'`（真实库）还是 `'view'`（视图） |
| 写目标 scope | 写 / 导入 / 数据源三页实际要落库的真实 scope；视图下为 `null` |
| 来源库 | 检索命中实际所属的真实 scope（`SearchHit.scope`） |

> 「视图 / 成员 / 展开 / 分桶」的定义见**父文档 §3.3 共享术语速查**，本子文档不重复定义。

---

## 2. 现状（AS-IS）

```
scopeContext.tsx:14-17   { scope: string; setScope }     全局单值
scopeContext.tsx:12      STORAGE_KEY = 'ki-web:scope'    localStorage 持久化
scopeContext.tsx:53-55   useScopeValue(): string         10 个页面/组件的唯一读口

ScopeSelect.tsx:7        顶栏组件
ScopeSelect.tsx:16-18    当前 scope 不在列表时插一条 registered:false 兜底
ScopeSelect.tsx:93-106   平面列表，单选（aria-selected 单值）
AppShell.tsx:633         挂载位置（与 ServiceBadge 并排）

hooks.ts:82-89           useScopeList()  queryKey 'scopeList', staleTime 30s
mcpClient.ts:194-196     callTool('ki_scope_list')

SearchPage.tsx:759-775   结果行的标题 + Group 路径徽标 + 「定位文档 ↗」
SearchPage.tsx:769       深链使用**顶栏的 scope**：`?scope=${scope}&group=...`
```

**缺口**

1. 顶栏是平面单选，无法表达"视图 / 知识库"两级。
2. `SearchPage.tsx:769` 的深链在视图模式下会传**视图名** → `useDocList(视图名)` 取不到成员数据 → 点进去是空目录。
3. `web/src` 内 `r.scope` **零命中**——后端早已返回来源库字段（`src/search.ts:57-59, 421`），前端从未渲染。
4. 写 / 导入 / 数据源三页直接用 `useScopeValue()`，视图名会流进请求 → 被 S-03 拒绝，用户看到报错而非引导。

---

## 3. 方案（TO-BE）

### 3.1 `scopeContext`：新增派生 hook，不改 Provider 结构

> **为什么不把 `mode` 塞进 Provider**：`ScopeProvider` 目前是纯 `useState`，不依赖 react-query。在里面 `useScopeList()` 会引入"Provider 必须在 QueryClientProvider 之内"的隐式约束，且 `ki-web:scope` 的 localStorage 恢复逻辑会与异步数据竞争。改为**派生 hook**，零额外请求（共用 `scopeList` key）。

```ts
// web/src/lib/scopeContext.tsx 追加

/** 当前选择是知识库还是视图；列表未就绪时按 'scope'（乐观，服务端门禁兜底） */
export function useScopeMode(): {
  mode: 'scope' | 'view';
  members: string[];
} {
  const scope = useScopeValue();
  const { data } = useScopeList();
  const view = data?.views?.find((v) => v.view === scope);
  return view ? { mode: 'view', members: view.members } : { mode: 'scope', members: [] };
}

/**
 * 写类页面的目标 scope：视图时返回 null。
 * ★ 依赖 `useScopeMode` 的乐观语义：未就绪时返回 scope，越界由后端 VIEW_NOT_WRITABLE 兜底。
 */
export function useWritableScope(): string | null {
  const scope = useScopeValue();
  const { mode } = useScopeMode();
  return mode === 'view' ? null : scope;
}
```

### 3.2 `ScopeSelect`：两级列表

```
┌─ 选择知识视图 ───────────────────────────────┐
│ [ 输入过滤…                               ]  │   过滤同时对视图名与库名生效
├──────────────────────────────────────────────┤
│  🪟 视图（只读聚合）                          │   ← .ki-scope-picker__group
│    ▸ 团队知识视图      5 个库 · 含只读   ✓   │
│    ▸ 我的工作台        2 个库                │
├──────────────────────────────────────────────┤
│  📚 单个知识库                                │
│    ○ kisearch                                 │
│    ○ kisearch-memory              只读        │
└──────────────────────────────────────────────┘
```

**行为规则**

| 规则 | 说明 |
|---|---|
| 分组头 | 视图组为空时整组隐藏；知识库组恒显示 |
| 视图项副标题 | `N 个库`，含 `readonly===true` 的成员时追加 `· 含只读` |
| 过滤 | 单一输入框，同时匹配视图名与库名；匹配时保留分组头 |
| 兜底项 | 当前 `scope` 既不在视图列表也不在库列表 → 丢进「单个知识库」组并标 `registered:false`（沿用 `:16-18` 的语义，**不新增第三个分组**）；若该名字曾出现在 `getLastView()` 的视图历史里，追加 `已失效` 标记，提示它可能是被删掉的视图而非拼错 |
| 单库模式零变化 | 无视图时渲染结果与现状逐像素一致（视图组整组隐藏） |
| 键盘 | 沿用现有上下键 + Enter；跨分组连续导航 |

新增 CSS（`web/src/styles/ki.css`）

```css
.ki-scope-picker__group       { /* 分组头：11.5px / 500 / 次要色 / 上下分隔线 */ }
.ki-scope-picker__group-count { /* 视图副标题：N 个库 · 含只读 */ }
```

### 3.3 `SearchPage`：来源库标记 + 深链修复

**渲染**（在 `.ki-qr-title` 内、Group 路径徽标之前插入）

```tsx
{showScopeBadge && r.scope && (
  <span className="ki-badge ki-badge--scope" title={`来源知识库：${r.scope}`}>
    {r.scope}
  </span>
)}
```

```ts
/** 用了视图或跨多库才标来源；单库模式保持现状 */
const showScopeBadge = (result?.views?.length ?? 0) > 0 || (result?.scopes?.length ?? 0) > 1;
```

**深链修复**（`SearchPage.tsx:766-775`）

```diff
- to={{ pathname: '/browse', search: `?scope=${encodeURIComponent(scope)}&group=...` }}
+ to={{ pathname: '/browse', search:
+      `?scope=${encodeURIComponent(scope)}` +
+      (r.scope && r.scope !== scope ? `&member=${encodeURIComponent(r.scope)}` : '') +
+      `&group=${encodeURIComponent(r.group)}${r.relation ? `&relation=${encodeURIComponent(r.relation)}` : ''}` }}
```

> `member` 参数由 S-06 消费：告诉浏览页"这次定位的是视图里哪个库的 group"。

**结果展示形态**

```
│ 1  00-评审清单   [k8s] k8s/00-评审清单   定位文档 ↗
│                 ↑ .ki-badge--scope（仅视图/多库时出现）
```

### 3.3b 结果点击打开抽屉：必须传成员 scope（★ challenger 意见 3）

**问题**：S-06 §3.6 已识别 `doc/get` 必须带成员 scope，但**只覆盖了 BrowsePage 的 `ModuleDrawer`**。搜索结果卡片的点击同样打开抽屉（`SearchPage.tsx:740-754` 的 `openDocument`），而 `openDocument` 不接收 scope —— 抽屉用**顶栏的 scope**，视图模式下就是视图名 → `doc/get` 读到 `dataDir/<视图名>` → **正文空白**。

这是视图模式下最高频的操作（检索 → 看正文），**失败率 100%**。

**改动**：`openDocument` 的入参加 `scope`，取值与深链完全同源：

```diff
- const docScope = scope;                       // 顶栏值（视图模式下错误）
+ /** 与「定位文档 ↗」共用同一个来源库推导，避免两处漂移 */
+ const hitScope = r.scope ?? scope;            // 单库模式 r.scope 缺省 → 回落顶栏值
```

`ModuleDrawer` 的两个入参拆开：

| 入参 | 值 | 用途 |
|---|---|---|
| `scope` | `hitScope` | 取正文（`doc/get`）、`useScopeReadonly`、`TagSelect` |
| （新增）`onGotoLibrary` | `hitScope !== 顶栏值` 时显示「切到该知识库」 | 与 S-06 库节点「进入 ↗」同一行为 |

**只读态**：`useScopeReadonly(hitScope)` 在视图模式下同样查不到（成员不在 `scopes[]`）—— 必须改从 `ki_scope_list` 的 `views[].memberMeta[].readonly` 取，**复用 S-06 提供的 `useViewMemberReadonly(view, member)`**（S-05 先建 hook、S-06 消费；批次 3 串行，无冲突）。

**验收**：见 E10 / E11。

### 3.4 写 / 导入 / 数据源三页：视图回退
### 3.4 写 / 导入 / 数据源三页：视图回退

| 页面 | 改动 |
|---|---|
| `pages/WritePage.tsx` | `const writable = useWritableScope()`；`writable === null` 时渲染既有"未选择知识库"空态（不新增面板），并提示「当前是视图，请先选择一个具体知识库」 |
| `pages/ImportPage.tsx` | 同上；`ScopePathSelect` 的 `value` 传 `writable ?? ''` |
| `pages/DataSourcePage.tsx` | scope 来自路由 `/:scope`，与顶栏解耦——**只需在进入时若 `:scope` 是视图名则重定向到 `/datasource` 列表并提示** |

**关键约束**：以上三页的任何请求参数**都不得出现视图名**。宁可停住，也不能让用户看到 `VIEW_NOT_WRITABLE`。

### 3.5 「↩ 回到视图」软入口

**要解决的问题**：S-06 的库节点「进入 ↗」会调 `setScope()` 切到单库并**写 localStorage**。用户"进某库看一眼"之后，下次打开 Web 就停在那个单库，找不到原来的视图。

**方案**：新建 `web/src/lib/lastView.ts`（本子需求所有）

```ts
const KEY = 'ki-web:lastView';   // sessionStorage，不跨会话

export function rememberView(view: string): void;      // S-06 的「进入」回调里调用
export function getLastView(): string | null;
export function clearLastView(view: string): void;     // 视图被删除时清除
```

`ScopeSelect` 在**当前是单库、且 `getLastView()` 非空**时，面板底部追加一行：

```
   ┌──────────────────────────────────────────────┐
   │  ↩ 回到视图 团队知识视图                       │
   └──────────────────────────────────────────────┘
```

- 用 `sessionStorage`：关掉标签页就忘，不污染长期偏好
- 最近视图被删除（不在 `views[]` 里）→ 自动 `clearLastView`，不显示该入口

> 这是 S-06「进入」持久化的配套补偿。两者是一个 UX 决策的两半，不能在批次 3 拆开评估。

### 3.6 类型补充

```ts
// web/src/api/mcpClient.ts
export interface ViewInfo { view: string; members: string[]; availableCount: number; missing: string[] }
export interface ScopeListResponse { /* 既有 */ views?: ViewInfo[] }

// SearchResult / SearchHit
export interface SearchHit { /* 既有 */ scope?: string }
export interface SearchResult { /* 既有 */ matchedViews?: string[]; scopes?: string[] }
```

> 全部标为可选：旧版 daemon 不返回时行为与现状一致。

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | `mode` 用派生 hook，不进 Provider | 在 `ScopeProvider` 里 `useScopeList()` | Provider 会隐式依赖 QueryClientProvider；且与 localStorage 恢复存在竞争 | 出现"必须在 Provider 内知道 mode"的场景 |
| **D2** | 视图与库**同一列表内两级分组** | 两个独立下拉（先选类型再选值） | 多一次点击；且"我到底在哪个库"的记忆负担增加 | 视图数量 > 30 |
| **D3** | 写页面 `writable === null` 时复用既有空态 | 新增"请选择知识库"引导面板 | 需求 D7 明确"保持现状"；新增面板等于给写页面加视图相关 UI | 用户反馈"不知道该怎么办" |
| **D4** | 来源标记仅在视图/多库时显示 | 恒显示 | 单库时顶栏已写明库名，标记是纯噪音 | 无 |
| **D5** | 乐观默认 `mode='scope'`，但**写类页面在 `scopeList.isLoading` 期间禁用提交** | 首帧按 `'view'`（fail-closed） | 会让写页面在列表加载完之前短暂禁用并闪烁；且旧 daemon 无 `views` 字段时**永远**判定为 view，写功能整体不可用 | 出现"视图名漏进写请求"的真实缺陷（此时改为 fail-closed + 明确的加载骨架） |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `scopeList` 加载失败 | `views` 为空 → 顶栏退化为现状平面列表；`mode='scope'` | 否（用户无感，仅少一个分组） |
| 当前 `scope` 是已被删除的视图 | 落入兜底项，标 `registered:false`；检索返回 `ok:false`（`VIEW_NOT_FOUND`） | 是 |
| 视图成员全部缺失 | 视图项副标题显示 `0 个库`；`ki_scope_list` 的 `missing` 已覆盖 | 是 |
| 检索结果无 `r.scope`（旧 daemon） | 不渲染来源标记 | 否 |
| 写页面 `writable===null` 且用户强行提交 | 前端已禁用提交；若被绕过，后端 `VIEW_NOT_WRITABLE` | 是 |

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `web/src/lib/scopeContext.tsx` | 追加 `useScopeMode` / `useWritableScope`（约 25 行） |
| `web/src/components/ScopeSelect.tsx` | 两级渲染 + 过滤逻辑（约 60 行） |
| `web/src/pages/SearchPage.tsx` | 来源标记 + 深链修复（约 15 行） |
| `web/src/pages/WritePage.tsx` · `ImportPage.tsx` | 改用 `useWritableScope` |
| `web/src/pages/DataSourcePage.tsx` | 视图名进入 `/:scope` 时重定向 |
| `web/src/api/mcpClient.ts` | 类型补 `views`（含 `memberMeta`）/ `matchedViews` / `scope` 可选字段 |
| `web/src/lib/lastView.ts` | **新增**：最近视图（sessionStorage），供 S-06 的「进入」调用 |
| `web/src/lib/hooks.ts` | **新增 `useViewMemberReadonly(view, member)`**（读 `views[].memberMeta`，不查 `scopes[]`）；`useScopeList` 沿用 `scopeList` key。本 hook 由 S-05 新建、S-06 消费（批次 3 串行） |
| `web/src/styles/ki.css` | 顶栏相关 class（分组头、副标题）；`共用的 .ki-tree-library` 归 S-06 |

**不改**：`queryKey`（scope 值本身已区隔视图与库，命名空间唯一 → 不会串库）、路由表。

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| E1 | 两级显示 | 存在视图时顶栏展开出现「视图 / 单个知识库」两组 |
| E2 | 零回归 | 无视图时顶栏渲染与改造前一致（快照对比） |
| E3 | 视图可选中 | 点视图项 → 顶栏显示视图名；浏览/检索页按视图工作 |
| E4 | 来源标记 | 视图模式下检索结果每条带来源库徽标；单库模式**不出现** |
| E5 | 深链可跳 | 视图模式下点「定位文档 ↗」→ 打开浏览页并定位到该文档（改造前是空目录） |
| E6 | 写页面停住 | 视图模式下进写入页 → 显示"请选择具体知识库"，提交按钮不可用 |
| E7 | 无视图名泄漏 | `scopeList` **就绪后**，写入/导入/数据源三页的任何请求均不携带视图名；列表加载中提交按钮禁用（两条合起来才排除了泄漏窗口） |
| E8 | 旧 daemon 兼容 | 响应无 `views` 字段 → 顶栏无视图组、无来源标记，其余不变 |
| E9 | 390px 窄屏 | 两级下拉不溢出（沿用现有 panel 溢出策略） |
| **E10** | **抽屉正文可读** | 视图模式检索 → 点任一结果 → 抽屉正文**非空**（改前 100% 空白） |
| **E11** | **抽屉只读态正确** | 视图含只读成员 → 打开该成员文档，抽屉按只读呈现（不得显示为可写） |
| **E12** | 单库零回归 | 单库模式 `r.scope` 缺省 → 抽屉行为与改前逐字节一致 |
