# S-06 浏览页多库合并

- 父文档：`DESIGN.md` §3
- 前置依赖：S-02（展开点）、S-04（`views` 数据）
- 证据：🟢 代码直读（`src/lib/mcp-http-api.ts:1959-2045`、`web/src/pages/BrowsePage.tsx`、`lib/groupTree.ts`、`lib/rootGroup.ts`）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 分桶 / bucket | 一个成员库的 `doc/list` 结果：`{ scope, docs, groups, total, ... }` |
| 库节点 | 视图模式下树顶的那一层，代表一个成员库，名字 = 该库的 scope 名 |
| 根散文件 | 落在 `__root__` 保留键下的文档（`web/src/lib/rootGroup.ts:13`） |

> 「视图 / 成员 / 展开」的通用定义见**父文档 §3.3 共享术语速查**；本节只补充本子需求特有口径。

---

## 2. 现状（AS-IS）

```
GET /api/doc/list?scope=<scope>&q=&group=&tag=&limit=&offset=
  ├─ mcp-http-api.ts:1435-1448  按单 scope 入协调器（read 通道）
  └─ handleDocList()  :1959-2045
       ├─ buildDocList(scope)               :1975
       ├─ groupCounts → groups[{name,count}] :1978-1986
       ├─ tags 去重                          :1987-1988
       └─ 响应 { ok, scope, docs, offset, total, truncated, groups, tags }

前端
  ├─ hooks.ts:131-138   useDocList(scope)  queryKey ['docList', scope]
  ├─ BrowsePage.tsx:225  const { data } = useDocList(scope)
  ├─ BrowsePage.tsx:765  rootGroupCount = splitRootGroup(data.groups).rootCount
  ├─ BrowsePage.tsx:769  visibleDocCount = Σ countDocs(tree) + rootGroupCount
  ├─ BrowsePage.tsx:223  hasDirectDocumentTarget = searchParams.get('scope') === scope && group && relation
  └─ groupTree.ts:41-73  buildGroupTree(groups) —— 跳过 __root__，根散文件由调用方裸挂
```

**缺口**：`handleDocList` 的 `scope` 是单值，`buildDocList(scope)` 只读一个 `group-index.json`。视图名进去会读到空索引（`dataDir/<视图名>` 不存在）→ 返回空列表，前端渲染出"这个视图一片空白"。

---

## 3. 方案（TO-BE）

### 3.1 后端：`/api/doc/list` 支持视图分桶

**入口改造**（`mcp-http-api.ts:1435-1448`）

```ts
if (p === '/doc/list' && req.method === 'GET') {
  const targets = resolveScopeTargets(requestConfig, url.searchParams.get('scope') ?? '');
  await getSharedOperationCoordinator().submit(
    { operation: 'doc-list-api', params: { scope: targets.views[0] ?? targets.scopes[0] } },
    () => runWithConfigSnapshot(requestConfig, () => handleDocList(res, url, targets)),
    targets.scopes,        // ← 多 scope 占位（协调器原生支持 Pending.scopes: string[]）
    'read',
  );
  return;
}
```

**响应契约**

```ts
// 单选（现状，逐字节不变）
{ ok: true, scope, docs, offset, total, truncated, groups, tags }

// 视图（新增）
{
  ok: true,
  view: "team",
  members: ["kisearch", "kisearch-memory", "team-docs"],
  buckets: [
    {
      scope: "kisearch",
      docs: [...], offset: 0, total: 131, truncated: false,
      groups: [{ name: "k8s", count: 10 }, { name: "projects", count: 4 }],
      tags: ["部署", "检索"]
    },
    {
      scope: "team-docs",
      error: "该知识库尚未导入（无 group-index.json）"
    }
  ],
  tags: ["部署", "检索", "监控"]
}
```

**实现要点**

| 要点 | 做法 |
|---|---|
| 复用单库逻辑 | **`src/lib/doc-list.ts` 由 S-07（批次 2）新建**，提供 `buildDocListPayload()`（单库）与 `buildViewDocList()`（分桶）。本子需求把 `handleDocList`（`:1975-2044`）改为**只调这两个函数**，不写第二份组装逻辑 |
| 逐成员容错 | 每个成员 `try/catch`；失败产出 `{ scope, error }` 桶，**不中断整体响应** |
| 无向量/无 KB 成员 | 同样走 `error` 桶，文案复用 `findMissingScopeCollections` 的既有原因前缀 |
| `tags` | 顶层合并去重（供前端 tag 下拉），各桶保留自己的 |
| `member` 下钻参数 | `?scope=<view>&member=<scope>` → 只返回该成员那一个桶（避免大视图每次全量拉） |
| `member` 合法性 | `member` 必须 ∈ `view.members`，否则 400 `INVALID_VIEW_MEMBER`（**防止用 member 参数越权读视图外的库**） |
| 协调器占位 | 提交时传 `targets.scopes`（多 scope），语义为"这些库都在读"。**`read` 通道只与元数据提交窗口（毫秒级）短互斥**（`mcp-http-api.ts:1436-1446` 的设计说明），故 5 库视图占 5 个分片**不会**阻塞这些库上的导入/向量化长任务，反之亦然。该影响可忽略，但需在实现时确认 `submit` 的 `scopes` 参数确实是数组而非单值 |
| 默认规模假设 | **成员 ≤ 20**（与父文档一致）：20 次 `buildDocList` 走 `DocListCache` 命中，单次请求响应体上限按"20 × 单库 500 条"估算约 2MB。超出时应实测响应耗时与体积，必要时改为懒加载（点开库节点才拉该桶）——**本期不做，仅记录** |

### 3.2 前端：合并树

**新增纯函数**（`web/src/lib/groupTree.ts`）

```ts
export interface ViewBucket {
  scope: string;
  docs?: DocItem[];
  groups?: DocGroup[];
  total?: number;
  truncated?: boolean;
  error?: string;
}

export interface ViewNode {
  kind: 'library';
  scope: string;         // 库名（节点显示名）
  count: number;         // 该库文档总数（groups 计数之和，不受 500 条截断影响）
  children: GroupTreeNode[];
  rootDocs: DocItem[];   // 该库 __root__ 散文件，裸挂
  open: boolean;
  error?: string;
}

/** 每个 bucket → 一个库节点；库内 __root__ 散文件裸挂其下 */
export function buildViewTree(buckets: ViewBucket[]): ViewNode[];
```

**关键规则**

| 规则 | 说明 |
|---|---|
| 不拍平 | 每个成员一个独立库节点，**绝不合并同名 group**（两库都有 `projects` 时各挂各的） |
| `__root__` 不显示"根" | 根散文件直接列在库节点下（`rootGroup.ts:33-46` 的 `groupPathSegment` 已保证路径拼接不产生多余层级） |
| 计数口径 | 库节点 = 该库 `total`；树卡头 = `N 个知识库 · M 篇` |
| 排序 | 按 `view.members` 的顺序（S-01 D5：成员保序），**不按字典序** |
| 失败桶 | 库节点置灰 + `error` 文案，不隐藏（隐藏会让人以为库里没内容） |

**树形（已确认设计，`REQ-20261104-003` §6.2）**

```
┌ 知识目录 ── 团队知识视图 ──────┐
│ 3 个知识库 · 168 篇      ⟳ ⌄  │
├───────────────────────────────┤
│ ▾ 🗄 k8s                    41│  ← 库节点：库图标 + 略深底色 + 「进入 ↗」
│   📄 00-学习档案 …           10│  ← 原 __root__ 散文件，裸挂（不显示"根"）
│   ▸ 📁 k8s                   10│  ← 库内同名组 → 路径 k8s/k8s
│   ▸ 📁 projects               4│
│   ▸ 📁 stages                27│
│ ▾ 🗄 team-b                 12│
│   ▸ 📁 projects               9│
│   ▸ 📁 部署运维               3│
└───────────────────────────────┘
```

### 3.3 库节点「进入」：切到单库（C1=A）

| 交互 | 行为 |
|---|---|
| 点行左侧 `▸/▾` | 展开 / 折叠该库（与既有 group 节点一致） |
| 点行右侧 `进入 ↗` | 切到该库的**单库上下文**并跳到浏览页（`?scope=<该库>`），顶栏同步 |

**为什么必须有**：视图是只读聚合。用户看到文档、点开抽屉想编辑/删除时，必须在单库下操作；没有一键入口就只能手动切顶栏，且大部分用户不知道要先切。

**★ 持久化问题（必须定）**：`:33-40` 的 `setScope()` 会写 `localStorage`。若直接调用，用户"点进某库看一眼"后**下次打开 Web 会停在那个单库**，与他"我平时用视图"的心智不符。

选定方案：**持久化**（沿用 `setScope`），并在顶栏视图项旁给一个「↩ 回到视图 <上一视图名>」的软入口（记住最近一次视图，仅存在 `sessionStorage`）。理由：

- 与现有 `setScope` 语义一致，不引入第二套"临时 scope"状态（否则 URL / localStorage / 顶栏三处会打架）
- 用户想回视图时一击可达，不需要从下拉里翻

按钮文案：`进入`，`title="切到该知识库（编辑、写入、导入需在单库下进行）"`。失败桶不显示该按钮。

### 3.4 深链

```
/browse?scope=<view>&member=<scope>&group=<group>&relation=<doc>&q=&tag=
```

| 场景 | 处理 |
|---|---|
| 视图模式 + 有 `member` | 只请求该成员的桶（`?member=` 下钻） |
| 视图模式 + 无 `member` | 拉全部桶，按 `group` + `relation` 在两桶里找唯一命中；找到后补 `member` 到 URL |
| 单库模式 | 与现状完全一致（`member` 忽略） |
| `hasDirectDocumentTarget`（`BrowsePage.tsx:223`） | 判定改为 `searchParams.get('scope') === scope && group && relation` —— **不变**，因为视图模式下 `scope` 就是视图名，仍是同一个值 |

### 3.5 搜索与 tag

| 能力 | 视图模式行为 |
|---|---|
| 目录搜索框 `q` | 直接透传给后端，**服务端逐桶过滤**（无需前端 fan-out；`hooks.ts:140-142` 的"不能前端过滤 500 条"约束天然满足） |
| **placeholder 文案** | 视图模式改为 **「搜索视图内全部文档…」**；单库仍为「搜索全库文档…」。两处：`BrowsePage.tsx:1271`（`inlineSearch.placeholder`）、`:1452`（页级工具栏）。**不改 `ModuleDrawer` 的缺省文案**（它是 `??'搜索全库文档…'` 的兜底，页面总会传值） |
| **「全库 / 本文」分段** | 「全库」= 全视图（走上面的 `q`）；**「本文」是纯前端正文查找**（`ModuleDrawer` 的 `findOpen` 内核，`ModuleDrawer.tsx:1241-1244`），不依赖 scope → **天然可用，零改动** |
| **TagSelect** | **免改**：它读 `useDocList(scope).tags`（`TagSelect.tsx:20-21`），视图响应顶层已有合并 `tags` → 下拉自动可选。⚠️ 但 `useDocList` 返回类型变成 `DocListResponse \| DocListViewResponse` 联合类型，`TagSelect` 需改用顶层 `tags` 的窄化读取（`'tags' in data`） |
| 计数 | 搜索态下头部显示"命中数"，与现状一致（不改写目录） |
| 清空 / 居中 / 铺满 | 不依赖 scope / 纯布局 → **零改动** |

### 3.6 正文读取与抽屉：必须带成员 scope（★ 易漏）

视图模式下 `useScopeValue()` 返回视图名。所有**按 scope 读单篇正文**的链路都会拿到视图名，从而读到空目录：

| 链路 | 现状 | 视图模式下必须改为 |
|---|---|---|
| `GET /api/doc/get?scope=&group=&relation=` | `handleDocGet`（`mcp-http-api.ts:1945-1955`）`resolveScope(loadConfig(), '?scope=')` → 视图名 → 读 `dataDir/<视图名>/...` → 空 | 用**成员 scope** |
| `ModuleDrawer`（`BrowsePage.tsx:1229`）`scope` 属性 | 顶栏 scope | 用当前文档所属的成员 scope |
| `useScopeReadonly(scope)`（`ModuleDrawer.tsx:1041`、`BrowsePage.tsx:1260`） | 视图名查不到 → `readonly=false` → **只读库显示成可写** | ★ **不能**改成"用成员 scope 再查"：成员通常不在 `scopes[]` 里（S-04 D1：授权视图 ≠ 授权成员名），查了也是 `undefined`。必须改从 `ki_scope_list` 的 **`views[].memberMeta[].readonly`** 取，新增 `useViewMemberReadonly(view, member)` |
| `TagSelect`（`BrowsePage.tsx:1420`） | 顶栏 scope | 用成员 scope，否则 tag 列表为空 |

**统一做法**：定义「当前文档上下文 scope」=

```ts
const docScope = viewMode ? (currentDocMember ?? null) : scope;
```

- 所有读单篇/单库元数据的请求用它；为 `null` 时**不发请求**（而不是发一个会返回空结果的请求）
- 抽屉的两个入参拆开：`scope={scope}`（用于"切到该库"按钮）+ `docScope={docScope}`（用于取正文与只读判定）
- `ModuleDrawer` 内所有写操作按钮在 `docScope === null` 时置灰并提示「当前为视图，请先进入具体知识库」

> **这是本设计最容易漏的一处**：`doc/list` 有分桶机制，天然知道 scope；而 `doc/get` 只带一个 scope 字符串，视图名会一路静默读到空。必须在抽屉挂载时就注入成员 scope。

### 3.7 `queryKey`

`['docList', scope]` **保持不变**。视图名与 scope 名共用唯一命名空间（S-01 I1），不存在同值不同义 → 不会串库，也不需要加 `mode`。

### 3.8 跨库不唯一键（★ 最深的一处，必须在批次 3 内完成）

**问题**：浏览页的**全部内部索引键都是 `group 路径`**。单库时这是全局唯一的；**视图模式下跨库不唯一** —— 两个库都可以有 `projects`。这导致运行时静默串数据，且三处表现为三个不同 bug：

| # | 位置 | 现状键 | 视图下的实际故障 |
|---|---|---|---|
| 1 | `BrowsePage.tsx:195-197` `docsByGroup` / `loadedGroupsRef` | `group` | 两个库的同名组**互相覆盖缓存**：切到一个库显示另一个库的文档；"明明有文档却显示空" |
| 2 | `BrowsePage.tsx:1104` `knownDocs.find(d => d.group === hit.group && d.name === hit.relation)` | `group + name` | 正文命中来自 B 库，`find` 命中 A 库的同名文件 → **打开错误的库的文档** |
| 3 | `matchedDocKeys` / `browseSearchGroups` 的目录过滤 | `group` | B 库的组因 A 库的命中而**被错误显示/隐藏** |

**方案：所有以 group 为键的结构改为 `(scope, group)`**

```ts
/** 视图模式下文档的唯一标识（父文档 §3.4「文档引用」） */
export interface DocumentRef {
  scope: string;
  group: string;
  relation: string;
}
/** 复合键：用 \u0000 分隔，避免 group 里本身含 `/` 造成歧义 */
export const docKey = (scope: string, group: string): string => `${scope}\u0000${group}`;
```

| 改造点 | 从 | 到 |
|---|---|---|
| `docsByGroup` | `Record<group, DocItem[]>` | `Record<docKey, DocItem[]>` |
| `loadedGroupsRef` | `Set<group>` | `Set<docKey>` |
| `fetchGroupDocsAll(scope, group)` 的缓存写回 | 按 group | 按 `docKey(scope, group)` |
| `knownDocs` / `knownDocByKey` | 按 `group+name` | 按 `scope+group+name` |
| `matchedDocKeys` | `Set<group\ name>` | `Set<scope\ group\ name>` |
| 目录树节点 | `path: group` | 库节点前缀：`path: docKey(scope, group)`，展示仍用 `group`（`groupPathSegment` 不变） |
| `findGroupNode` / `revealGroupPath` | 按 group 路径 | 按库节点前缀拼接后的路径 |
| 全库搜索结果行 | `renderSearchResults()` 的三段（名称/路径/正文） | 统一 `DocumentRef`，每条带来源库徽标 |

**「名称/路径命中」与「正文命中」的模型统一**

两条链路的数据形状不一致，必须在渲染层前拍平：

| 链路 | 来源 | 形状 |
|---|---|---|
| 名称 / 路径命中 | `searchQuery` = `getDocList(scope, {q})` | **分桶**（S-06 §3.1） |
| 正文命中 | `fullTextQuery` = `kiSearch(scope, {mode:'fulltext'})`（`BrowsePage.tsx:505`） | **扁平 `SearchHit[]`**，每条带 `hit.scope`（S-02 已保证） |

```ts
/** 渲染层唯一模型：两条链路都归一到它 */
interface BrowseHit {
  ref: DocumentRef;          // 跨库唯一
  title: string;
  snippet?: string;
  kind: 'name' | 'path' | 'fulltext';
}
// 名称/路径：bucket.scope + doc.group + doc.name  → BrowseHit
// 正文     ：hit.scope ?? 当前库 + hit.group + hit.relation → BrowseHit
```

- 结果行渲染 `ref.scope` 徽标（与 S-05 的来源库标记同款样式）
- 点开 / 页内打开 / 目录定位**全部走 `ref`**，不再用裸 group

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | 后端一次返回全部分桶 | 前端发 N 次 `getDocList` | 5 库视图 = 5 次 IO + 5 套独立失败处理 + 5 次 500 条截断；且协调器要占 5 次锁 | 单桶体积大到响应超 2MB |
| **D2** | 每个成员一个库节点，不合并同名 group | 拍平合并 | 两库都有 `projects` 时会混成一棵树，**看不出文档属于哪个库**；且同名必然撞 | 无 |
| **D3** | 失败桶以 `error` 形式返回，不中断整体 | 任一成员失败即整个请求 500 | 一个成员没导入就让整个视图不可浏览，代价远大于收益 | 出现"必须全有或全无"的数据一致性要求 |
| **D4** | `member` 参数校验 ∈ `view.members` | 直接透传给 `buildDocList` | 会让 `?scope=<view>&member=<任意未授权库>` 成为绕过鉴权的读通道 | 无 |
| **D5** | 库节点右侧「进入」按钮切单库 | 库名双击切库 | 不可发现；与"展开/折叠"手势冲突 | 无 |
| **D6** | `queryKey` 不加 `mode` | 加 `['docList', scope, mode]` | 命名空间唯一，同值必然同义；加 mode 反而在 mode 未知的首帧产生两次请求 | 命名空间唯一性被放弃（不会） |
| **D7** | 「进入」沿用 `setScope`（写 localStorage）+ 顶栏给「↩ 回到视图」软入口 | 引入"临时 scope"第二状态（不写 localStorage） | URL / localStorage / 顶栏会出现三方来源，刷新后三者对不上；且要改 `scopeContext` 的既有契约 | 用户反馈"我进了一次单库，就再也找不到我的视图了"（此时把「回到视图」升级为常驻入口） |
| **D8** | 分桶一次全量返回 | 懒加载（点开库节点才拉该桶） | 树形需要全量 `groups`/`total` 才能正确显示库节点计数与结构，懒加载会让首屏出现"空库" | 成员 > 20 或单视图响应 > 2MB（已在本节 §3.1 记为触发条件） |
| **D9** | 所有内部键改 `(scope, group)` 复合键 | 保留裸 group 键 + 在冲突时提示 | 冲突是**静默**的（缓存互相覆盖、打开错文档、过滤串台），没有可提示的时机；且三处故障各不相同，靠"提示"无法预防 | 无 |
| **D10** | 名称/路径命中与正文命中**归一到 `BrowseHit`** | 保持两套渲染分支，各自处理 scope | 两套并存时每一处新功能都要写两遍；且两套的"文档身份"口径不同（一个分桶、一个扁平）必然漂移 | 无 |
| **D11** | 视图模式 placeholder 改「搜索视图内全部文档…」 | 保留「搜索全库文档…」 | "全库"在视图下会被读成"所有知识库"，与实际"当前视图内"不符 | 无 |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 视图名查不到 | `resolveScopeTargets` 抛 `VIEW_NOT_FOUND` → 400 | 是 |
| 视图为空 | `VIEW_EMPTY` → 400 | 是 |
| `member` 不在成员内 | 400 `INVALID_VIEW_MEMBER` | 是 |
| 某成员无 KB 索引 | 该桶 `{scope, error}` + 顶层 `members` 保留该名 | 是 |
| 某成员读索引抛异常 | 同上（`try/catch` 吞在桶内），stderr 记录 | 是 |
| 单桶 > 500 篇 | 该桶 `truncated: true`，库节点上显示「仅显示前 500 篇」 | 是 |
| 视图成员 > 20 | 不额外限制（单机假设）；响应体过大时前端提示 | 否（默认假设） |

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/mcp-http-api.ts` | `/doc/list` 入口（`:1435-1448`）改为多 scope 入队 + `handleDocList` 改为调用 `src/lib/doc-list.ts`（**该文件由 S-07 提供，本子需求只消费**）；`member` 参数校验。约 40 行 |
| `web/src/lib/groupTree.ts` | 新增 `buildViewTree` / `ViewBucket` / `ViewNode`（约 60 行） |
| `web/src/api/httpApi.ts` | `getDocList(scope, opts?)` 支持 `member`；返回类型加 `buckets` |
| `web/src/pages/BrowsePage.tsx` | 视图模式渲染库节点、计数口径、`member` 深链、`进入` 按钮 |
| `web/src/lib/browseUrl.ts` | URL 构造/解析支持 `member` |
| `web/src/lib/hooks.ts` | ⚠️ **本子需求只消费、不新建**：`useViewMemberReadonly` 由 S-05 建（批次 3 串行）。本子需求改 `useDocList` 的返回类型为 `DocListResponse \| DocListViewResponse` 联合 |
| `web/src/components/TagSelect.tsx` | 改 `data?.tags` 的窄化读取（`'tags' in data`），适配联合类型 |
| `web/src/api/mcpClient.ts` | `ViewInfo` 补 `memberMeta`（与 S-04 同步） |
| `web/src/styles/ki.css` | `.ki-tree-library`（库节点：图标 + 底色 + 右侧按钮）、只读徽标 |

> ★ **批次 3 改为串行（S-05 → S-06）**，因此不再需要严格文件互斥——但仍有**单向依赖**：
> S-06 可以调用 S-05 已建好的 `rememberView(view)`（`web/src/lib/lastView.ts`）与 `useViewMemberReadonly`（`hooks.ts`），**不得反向修改 S-05 的文件**。
> `ki.css`：S-05 先写顶栏区段，S-06 再追加树区段，各自追加不改对方行。
| `docs/mcp-http.md` | `/api/doc/list` 新增视图分桶契约 |

**不改**：`buildDocList`（KB 层读取）、`buildGroupTree`（仍按单库构建）、协调器（`scopes[]` 原生支持）。

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| F1 | 合并树渲染 | 3 库视图 → 树顶 3 个库节点，各含自己的 group 树 |
| F2 | 不合并同名组 | 两库都有 `projects` → 出现两个独立 `projects` 节点（分属不同库节点） |
| F3 | 根散文件裸挂 | 库 A 有 10 篇 `__root__` 文档 → 直接列在库 A 节点下，**不出现"根"或"__root__"节点** |
| F4 | 计数正确 | 头部 = `N 个知识库 · Σtotal 篇`；各库节点 = 自己 `total` |
| F5 | 成员顺序 | 树顶顺序 === `view.members` 顺序，非字典序 |
| F6 | 单库零回归 | 单库模式下响应与渲染与改造前一致 |
| F7 | 深链可定位 | `/browse?scope=<view>&member=<a>&group=<g>&relation=<r>` → 打开并定位到该文档 |
| F8 | 无 member 时自动定位 | 仅带 `group/relation` → 在两库中找到唯一命中并补 `member` |
| F9 | 进入单库 | 点库节点「进入 ↗」→ 顶栏切到该库，页面变为单库形态，可正常编辑/写入 |
| F10 | 失败桶可见 | 视图含未导入成员 → 该库节点置灰并显示 error，其余库正常 |
| F11 | 越权防护 | `?scope=<view>&member=<未授权库>` → 400 `INVALID_VIEW_MEMBER` |
| F12 | 搜索透传 | 视图模式输入关键词 → 后端逐桶过滤，结果分库展示 |
| F13 | 截断提示 | 某库 > 500 篇 → 该库节点显示「仅显示前 500 篇」 |
| F14 | 正文可读 | 视图模式下点开任一文档 → 抽屉正文正常显示（改造前会读到空目录） |
| F15 | 只读态正确 | 视图内含只读库 → 打开该库文档时抽屉按只读呈现（不得显示为可写）；实现取自 `views[].memberMeta[].readonly` 而非 `scopes[]` |
| F16 | 无 docScope 不请求 | 视图模式下未确定成员时 → 不发 `doc/get` 请求（避免一次必然空结果的往返） |
| F17 | 可回到视图 | 点「进入」切到单库后，顶栏出现「↩ 回到视图 team」，一击返回 |
| F18 | 成员只读穿透到界面 | 视图含只读成员 → 该库节点显示只读徽标，抽屉按钮置灰 |
| **F19** | **跨库同名组不串数据** | 两库都有 `projects` → 分别展开，各自文档互不覆盖（`docsByGroup` 复合键生效） |
| **F20** | **跨库同名文档打开正确库** | 两库都有 `projects/API认证.md` → 从 B 库的结果点开，抽屉显示 **B 库**内容 |
| **F21** | **目录过滤不串台** | 搜索命中 B 库某组 → A 库同名组**不受影响**（既不显示为命中，也不被隐藏） |
| **F22** | **三段结果统一带库名** | 名称/路径/正文三类命中行均显示来源库徽标；点开后落到 `ref.scope` 对应的库 |
| **F23** | placeholder 文案 | 视图模式显示「搜索视图内全部文档…」；单库模式仍为「搜索全库文档…」 |
| **F24** | 「本文」模式可用 | 视图模式打开一篇文档 → 切「本文」→ 正文高亮与 ↑↓ 导航正常（纯前端，不依赖 scope） |
| **F25** | 单库零回归 | 单库模式下 `docsByGroup` 键退化为 `default\0<group>`，渲染与交互与改前一致 |
