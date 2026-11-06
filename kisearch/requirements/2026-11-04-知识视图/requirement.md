---
id: REQ-20261104-003
feature: 知识视图（跨 scope 只读聚合）
status: 已确认
created: 2026-11-04
updated: 2026-11-04
version: 1
tags: [search, config, cli, web]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：知识视图（把多个 scope 聚合为一个可寻址的读视图）

- **来源**：用户 2026-11-04 原话
  1. 「创建 scope 组功能，就是可以将多个 scope 加入一个组里面。然后语义检索那里，或者 ki search，就可以直接搜索多个 scope 里的内容了。」
  2. 「效果就是要求当前的所有操作，都能支持 scope 组。感觉像 scope 组，就是一个单独 scope 那样，对于用户来说是无感的。」
  3. 「这个设计接受，直接在顶部就可以做视图选择。然后语义检索那里，只需要增加一个标记……是哪一个 scope 的就可以了。页面的其他地方，有要显示 scope 名称的，就直接用 view 名称代替即可。」
  4. 「知识库浏览那里，支持同时查看 view 的 kb 数据。只需要将 scope 的根目录合并作为独立目录显示出来就可以了。如果根目录 `__root__`，就替换为 scope 名称。」
  5. 「创建视图，当前只实现 cli 端，页面上暂时不支持创建视图。」
  6. 「写入导入，数据源依然只能选择 scope，保持现状即可。token 可以支持视图。」
- **分析口径**：product-manager M1（一次成型 → 严谨档：涉及鉴权模型与跨模块寻址）
- **证据声明**：`🟢` 最高等级 = **代码直读**（后端 20 个 CLI 命令 / 13 个 MCP 工具 / 12 个 HTTP handler、前端 10 个页面逐一核对，均带 `file:line`）；**未运行实测**，凡"体验是否顺畅"类判断按 `🟡` 保守处理。

---

## 0. 已拍板结论

| # | 决策 | 内容 |
|---|---|---|
| **D1** | 命名 | 产品名 **「知识视图」**，配置键 `views:`，CLI 子命令 `ki view`。**不新增请求参数**——`--scope` 同时接受 scope 名与视图名，二者**共用同一命名空间且唯一** |
| **D2** | 顶栏 | 视图 / 单个知识库两级选择器；**单库模式 UI 完全不变**（零回归） |
| **D3** | 检索标记 | 命中行标注**真实库名**（不是视图名）；只在多 scope / 视图模式显示 |
| **D4** | 页面文案 | 显示 scope 名称处用视图名替代，**5 条例外**见 §3.3 |
| **D5** | 浏览页 | 视图模式下**每个 scope 一个顶层目录**（不拍平合并）；`__root__` 散文件裸挂在该库节点下，不显示"根" |
| **D6** | 创建入口 | **仅 CLI**；页面不提供创建/修改视图 |
| **D7** | 写路径 | 写入 / 导入 / 数据源 **保持现状，只能选 scope**；视图不参与任何写入 |
| **D8** | 鉴权 | **token 可以授权视图**，语义为**动态跟随**（见 §4） |

---

## 1. 术语与定位

**这不是新功能，是给 scope 加一层间接寻址。** scope 目前同时承担三个角色：

```
scope ──┬─ 物理隔离单元：dataDir/<scope> · vectorDir/collections/<scope>
        │                  fts-collections/<scope> · chatDir/<scope>
        ├─ 寻址单元：所有 CLI/MCP/HTTP 的 --scope、前端顶栏、URL ?scope=
        └─ 权限单元：token.scopes[]、config.scopeReadonly[]
                     ↓
        本需求新增第 4 个角色：逻辑聚合单元（可寻址的只读视图）
```

**命名空间已占满，这是选词的硬约束**：

| 候选 | 状态 | 冲突对象 |
|---|---|---|
| `group` | ❌ | KB 内目录分组（`group-index.json`、`--group` 落点、`ki group create`）— `src/lib/scope.ts:160-221` |
| `collection` | ❌ | 向量层"一 scope 一 Collection" — `src/lib/scope-collection.ts:163-197` |
| `all` | ❌ | token 通配符 — `src/lib/mcp-token.ts:81`，且**能通过 `SCOPE_PATTERN`**（`src/lib/scope.ts:13`），可被当成真实 scope 名 |
| `default` / `__global__` / `__root__` | ❌ | 缺省回退 / 调度器全局锁 / 根散文件保留键 |
| **`view`** | ✅ | 空闲 |

选 `view` 的第二个理由：数据库 VIEW 天然是**虚拟的、只读的**，正好承载 D7「视图不参与写入」，用户不需要被教育。

---

## 2. 现状：为什么成本远低于预期

| 能力 | 现状 | 证据 |
|---|---|---|
| 多 scope 扇出检索 | ✅ 已实现（解析 → fan-out → 合并排序 → `skipped` 上报） | `src/search.ts:192`、`src/search.ts:402-446` |
| 命中携带来源 scope | ✅ 字段已存在，注释即本需求语义 | `src/search.ts:57-59` |
| 多 scope 时才填充 | ✅ 已按此实现 | `src/search.ts:421` `if (multi && hitScope) hit.scope = hitScope` |
| 调度层多 scope 互斥 | ✅ 判据是"scope 集合是否相交" | `src/lib/operation-coordinator.ts:154,288-306` |
| 向量层 `scopes?: string[]` | ✅ 已支持 | `src/lib/vector-client.ts:988-1095` |
| 前端渲染来源标记 | ❌ **完全没接** | `web/src` 内 `r.scope` 零命中 |

> **结论**：`ki search --scope a,b` 今天就能跨库检索。本需求本质是**把逗号串固化成一个名字**。对照：`AGENTS.md` 项目约定里已经写着"检索时同时指定 `kisearch` 和 `kisearch-memory`"——用户此刻就在手工使用这个能力。

---

## 3. 需求清单

### 3.1 P0 —— 视图作为一等寻址对象

| ID | 需求 | 验收标准 |
|---|---|---|
| **R-01** | `views:` 配置节点（`{ members: string[] }`）+ `ki view create/list/show/add/remove/delete` | `ki view create team --add a --add b` 后 `ki view show team` 列出成员；重复执行不报错（幂等） |
| **R-02** | `--scope` 接受视图名：解析层展开为成员列表，支持与真实库混写 | `ki search "x" --scope team` 返回 a、b 两库结果；`--scope team,kisearch` 三库合并，去重保序 |
| **R-03** | 视图名与 scope 名**共用命名空间且唯一**；保留名拒绝 | 已存在 scope `foo` 时 `ki view create foo` → 拒绝并指出冲突；`all` / `default` / `__global__` / `__root__` → 拒绝 |
| **R-04** | 写路径对视图名 **fail-loud + 给出路** | `ki store --scope team` → 失败，错误码 `VIEW_NOT_WRITABLE`，正文含成员清单与可执行命令（如「请改用：`ki store --scope a`」） |
| **R-05** | 成员失效可见：成员不存在 / 无向量集合 | 检索仍成功，`skipped[]` 显式包含该成员与原因（沿用现有契约，见 `src/search.ts:105-106`） |
| **R-06** | `scopeMode=strict` 兼容 | strict 下未在 `views` 注册的视图 → fail-loud，文案点明"视图需在 `views` 注册"并给出 `ki view create` 示例 |
| **R-07** | token 授权视图（动态跟随）+ 授权来源可见 | `ki mcp token generate --scope team` 可成功；`ki mcp token list` 显示「经视图团队授权」；成员变更后该 token 权限即时跟随 |
| **R-08** | 视图**不支持嵌套**（扁平一环） | `ki view add team <另一个视图名>` → 明确拒绝 |
| **R-09** | `ki_scope_list` 增量返回 `views[]`（**不改 `scopes` 结构**），并按 token 授权过滤 | 响应新增 `views: [{ view, members, missing }]`；仅列 token 有权访问的视图 |

### 3.2 P1 —— 读侧延展与界面

| ID | 需求 | 验收标准 |
|---|---|---|
| **R-10** | 检索结果行渲染来源库标记 | 视图模式下每条命中显示真实库名（如 `[k8s]`）；单库模式**不显示**（沿用后端 `multi` 口径，避免与顶栏重复） |
| **R-11** | 修「定位文档 ↗」深链：用命中自带的真实库名 | `web/src/pages/SearchPage.tsx:769` 改用 `r.scope ?? scope`；视图模式下点击必须能打开成员库的目录 |
| **R-12** | 后端 `doc/list` 识别视图名，返回按库分桶 | `GET /api/doc/list?scope=<view>` → `{ view, buckets: [{ scope, docs, groups, total }] }`；**不要前端发 N 次请求** |
| **R-13** | 浏览页视图模式：每个 scope 一个顶层目录 | 库节点 = `scope` 名；该 scope 的 `__root__` 散文件裸挂其下；其余 group 树原样嵌套；计数为"N 个知识库 · 总篇数" + 每库分计数 |
| **R-14** | 浏览页深链在视图模式下可用 | `?scope=<view>&scope0=<成员>&group=&relation=` 或等价方案——`group/relation` 属成员内路径，必须能定位；`web/src/pages/BrowsePage.tsx:223` 的 `searchParams.get('scope') === scope` 判定需同步 |
| **R-15** | 浏览页搜索框在视图模式下扇出 | 服务端 `q` 检索按成员逐库执行并合并（`web/src/lib/hooks.ts:140-142` 已明确不能前端过滤 500 条） |
| **R-16** | 顶栏两级选择器 | 视图组在上、单个库在下；视图项显示"N 个库 · 含只读"；单库模式退化为现状的平面列表 |
| **R-17** | 写入 / 导入 / 数据源三页的视图回退 | 顶栏为视图时，这三页的目标 scope 选择器呈现**未选择态**并提示选具体库；**不得**把视图名传入这三页的请求（否则会被 R-04 拒绝，用户看到报错而不是引导） |

### 3.3 D4「用视图名替代 scope 名」的 5 条例外

| 位置 | 用视图名？ | 理由 |
|---|---|---|
| 顶栏、浏览页头、检索页「范围」、Dashboard 标题 | ✅ | 纯读 |
| 资源页示例命令 | ✅ | 生成 `--scope <视图名>` 正确 |
| **写入页 / 导入页 / 数据源页** | ❌ | D7：三页只能选 scope；显示视图名 = 用户以为能写进去 |
| **任务列表的 scope 列** | ❌ | 每个任务属于一个真实库，替换后分不清哪个库在同步/失败 |
| **Chat 面板** | ❌（v1） | 会话绑定单 scope 且按 `<chatDir>/<scope>/` 分目录 — `src/lib/chat/chat-routes.ts:275-279` |

### 3.4 本期明确不做

| 不做 | 理由 |
|---|---|
| `import` / `datasource *` 支持视图 | D7 定案；且落点 group、冲突策略、克隆缓存、定时计划全是 per-scope |
| `wiki-sync` / `markdown-gen` / `wiki-backfill` | 每 scope 有独立 `sourceDir`，产物是磁盘目录，无法合并（`src/lib/wiki-sync.ts` 8 处 `scope: string`） |
| `export` / `backup` / `restore` | 产物按 `<backupDir>/<scope>/snapshots` 分目录，需单独定义"合并产物"契约；本期逐库执行 |
| Chat 跨库会话 | 会话目录按 scope 分，需新布局 |
| 视图嵌套视图 | 环检测 + 深度 + 权限传递，收益远低于成本 |
| 视图改名 | 会断裂 token 白名单、localStorage、深链；v1 禁止（删除后重建） |
| 页面创建/编辑视图 | D6 定案：仅 CLI |

---

## 4. 鉴权语义（D8 的展开，必须定死）

**授权形态**：`token.scopes` 可包含视图名，与 scope 名同列表（现状已是 `string[]` — `src/lib/mcp-token.ts:49-50`）。

**判定顺序**：

```
请求 scope=team（视图名）
  │
  ├─ ① token.scopes 含 'all' 或显式含 'team'？ ── 否 ──▶ 403（越权，逐段校验，`src/lib/mcp-http.ts:174-180`）
  │
  └─ ② 展开 team → [a, b, c]，对每个成员执行检索
```

**动态跟随（而非授权时快照）**：成员变更即时生效。

**安全性论证**（这是本决策成立的前提，需在实现中保持）：
- 视图**只能从 CLI 创建/修改**（D6）→ 修改视图需要本机 shell 权限 ≈ 管理员权限；
- 因此"给视图加一个库 = 扩大一批 token 的权限"这条链路的起点始终是管理员动作，**不构成普通用户的越权通道**。
- 前提失效条件：**如果将来开放页面创建/编辑视图，本结论立即失效**，必须改回授权快照并要求重新授权。此约束需写进代码注释。

**审计要求**：`ki mcp token list` 必须能看出授权来自视图（而非直接 scope），否则审计时无法判断权限为何变化。

---

## 5. 负向需求

| ID | 场景 | 后果 | 要求 |
|---|---|---|---|
| **N1** | 用视图名写入 | 落点歧义 | `VIEW_NOT_WRITABLE` fail-loud，正文含成员清单 + 可直接执行的命令（沿用 `ScopeReadonlyError` 的自解释文案哲学 — `src/lib/scope-policy.ts:86-97`） |
| **N2** | 视图名与 scope 名撞名 | `--scope foo` 二义 | 创建时即拒绝，提示"已有同名知识库"；反向（`ki import --scope <视图名>`）同样拒绝 |
| **N3** | 视图使用保留名 | 与通配/缺省/根键混淆 | `all` / `default` / `__global__` / `__root__` 全部拒绝 |
| **N4** | 成员不存在 | 静默少搜 | 允许创建（前向声明，与 `scopeMode: default` 的"首次使用自动创建"一致），但 `ki view show` 标注 `missing`，检索时 `skipped[]` 上报 |
| **N5** | 空视图 | 搜出 0 条像"库是空的" | fail-loud：「视图 team 没有成员，请执行 `ki view add team <scope>`」 |
| **N6** | strict 下视图未注册 | 报"未知 scope" | 文案点明"视图需在 `views` 注册" |
| **N7** | 视图嵌套 / 自引用 | 无限展开 | v1 禁止，检即 fail-loud |
| **N8** | 删除视图 | 误删成员数据 | **只解散关系，绝不删成员数据**；若该视图被 token 授权，删除时显式提示受影响的 token 列表 |
| **N9** | 视图模式下「定位文档」深链 | 跳转到空目录 | 必须带真实成员 scope（R-11 / R-14） |
| **N10** | 成员含只读库 | 无 | 读不受 `scopeReadonly` 限制（`src/lib/scope-policy.ts:34-51` 只限写）；视图本身**不需要**只读标记 |

---

## 6. 界面（已确认设计）

### 6.1 顶栏两级选择器

```
【现状】平面列表，单选
┌──────────────────────────────────────────────────────────────────────┐
│ kisearch   [ kisearch-memory        ▾ ]   ● 向量正常      [ 用户 ▾ ] │
└──────────────────────────────────────────────────────────────────────┘

【视图模式】两级分组；当前值仍是一个"可选名字"
┌──────────────────────────────────────────────────────────────────────┐
│ kisearch   [ 🪟 团队知识视图        ▾ ]   ● 向量正常      [ 用户 ▾ ] │
└──────────────────────────────────────────────────────────────────────┘
                     │
   ┌─ 选择知识视图 ───────────────────────────────┐
   │ [ 输入过滤…                               ]  │
   ├──────────────────────────────────────────────┤
   │  🪟 视图（只读聚合）                          │
   │    ▸ 团队知识视图      5 个库 · 含只读   ✓   │
   │    ▸ 我的工作台        2 个库                │
   ├──────────────────────────────────────────────┤
   │  📚 单个知识库                                │
   │    ○ kisearch                                 │
   │    ○ kisearch-memory              只读        │
   └──────────────────────────────────────────────┘
```

### 6.2 浏览页：每个 scope 一个顶层目录

```
【视图模式】
┌ 知识目录 ── 团队知识视图 ──────┐
│ 3 个知识库 · 168 篇      ⟳ ⌄  │
├───────────────────────────────┤
│ ▾ 🗄 k8s                     41│  ← 库节点：库图标 + 略深底色
│   📄 00-学习档案 …            10│  ← 原 __root__ 散文件，裸挂（不出现"根"）
│   ▸ 📁 k8s                   10│  ← 库内同名组，路径 k8s/k8s
│   ▸ 📁 projects               4│
│   ▸ 📁 stages                27│
│ ▾ 🗄 team-b                  12│
│   ▸ 📁 projects               9│
│   ▸ 📁 部署运维               3│
└───────────────────────────────┘
```

> **已知视觉现象（不是 bug）**：截图中 scope 名 `k8s` 与其内部 group 名 `k8s` 同名，视图模式会渲染成 `k8s / k8s / 00-评审清单`。用"库图标 + 底色"与目录节点区分。

### 6.3 检索结果：只加来源标记

```
│ 1  00-评审清单   [k8s] k8s/00-评审清单   定位文档 ↗
│                 ↑ 新增，仅视图/多 scope 模式显示
```

---

## 7. 实现口径建议（留给 design-craft 细化）

| 关注点 | 建议 |
|---|---|
| 展开点 | 新增 `src/lib/scope-view.ts`：`isViewName()` / `viewMembers()` / `expandScopeArg()`。`parseScopes`（`src/lib/scope.ts:68-84`）与 `resolveScope`（`src/lib/config.ts:948-963`）保持"名字层面"语义，展开只在需要成员列表的调用方发生 |
| 写路径拦截点 | 复用 `scope-policy.ts` 的两段式：`assertOperationWritable` 旁挂 `assertNotScopeView(scope, operation)`。**一次覆盖 CLI / MCP / daemon 全部写路径**，不逐个命令改 |
| 配置校验 | `config-schema.ts` 新增 `views` 节点（map → `{ members: stringArray }`）；**跨节点校验**（视图名 vs scope 名撞名、保留名）schema 层做不到，需在 `parseAndExpand` 之后加一步 `validateViews()` |
| 前端状态 | `scopeContext` 增加 `mode: 'scope' \| 'view'`；写类页面改用 `useWritableScope()`（视图时返回 `null`），避免视图名流进请求 |
| queryKey | 所有 `['docList', scope]` / `['vectorDimensionStatus', scope]` 等需带 `mode`，否则切视图不刷新、数据串库 |
| 深链 | 视图模式需要"视图 + 成员"两个标识；建议 `?scope=<view>&s0=<member>` 而非把成员嵌进 group 路径（嵌进去会与真实嵌套组名撞） |

---

## 8. 影响面

| 受影响功能/方 | 影响类型 | 程度 | 证据 | 处理 |
|---|---|---|---|---|
| `ki search` / `ki_search` | 流程+展示 | 无感 | 🟢 `src/search.ts:192` | 解析层展开 |
| `ki_scope_list` | 展示 | 降级 | 🟢 `src/lib/mcp-tools/scope-list.ts:24-29` | 增量返回 `views[]` |
| 11 个写 op | 流程 | **破坏**（当前传视图名会落进 `validateScope` 非法字符） | 🟢 `src/lib/scope-policy.ts:59-71` | R-04 显式拒绝 |
| MCP token 鉴权 | 外部契约 + 权限 | **变更** | 🟢 `src/lib/mcp-token.ts:49-81` | §4 |
| `scopeMode=strict` | 配置契约 | 降级 | 🟢 `src/lib/config.ts:948-963` | R-06 |
| 前端顶栏 / 10 个页面 | 展示 | **破坏** | 🟢 `web/src/lib/scopeContext.tsx:14-17` | R-16 / R-17 |
| 浏览页树与深链 | 展示 | **破坏** | 🟢 `web/src/lib/groupTree.ts:41-73`、`BrowsePage.tsx:223` | R-12~R-15 |
| 前端 queryKey | 展示 | 降级 | 🟢 `web/src/lib/hooks.ts:131-138` | 带 mode |
| `docs/*.md` | 外部契约 | 降级 | 🟢 9 篇提到 scope | 同步更新 |

---

## 9. 后续

1. 本文档定稿 → `design-craft` 出技术设计（`views` 配置契约、展开点、写路径门禁、docList 分桶、深链参数、错误码与文案）。
2. 界面部分（顶栏两级、库节点样式）→ `ui-designer`。
3. 本文档的 D8 前提（视图仅 CLI 创建）一旦变化，§4 鉴权结论必须重评。

> ⚠️ **已有后续变更（2026-11-04）**：`REQ-20261104-004`《团队共享视图：页面创建与按权限可见》已立项（草案）。
> 它**修正本文档的 4 处**：D6（改为 CLI + 个人中心创建）、S-04 的 D1（改为"授权视图 ∧ 全部成员授权"）、
> S-04 的 `views[]` 过滤规则、S-04 §3.4 的安全论证（改为"视图不携带额外权限"，与入口无关）。
> **实施 004 时必须先改这 4 处**，不能带着旧论证上线页面创建入口。
