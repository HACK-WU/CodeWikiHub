# S-04 视图鉴权与列表暴露

- 父文档：`DESIGN.md` §3
- 前置依赖：S-01
- 证据：🟢 代码直读（`src/lib/mcp-token.ts`、`src/lib/mcp-http.ts`、`src/lib/mcp-tools/scope-list.ts`、`src/scope.ts`）
- 版本：v2（`viewGrants` 独立字段、`ki scope list` 文本输出不变、接管 `scope-readonly` 拒绝）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 授权客体 | token 可访问的一个名字，可以是真实 scope，也可以是视图 |
| `viewGrants` | `TokenRecord` 上**专存视图授权**的字段，与 `scopes` 并列 |
| 动态跟随 | 鉴权时实时展开视图成员，成员变更即时影响该 token 的可读范围 |
| 可见性 | `ki_scope_list` / `ki mcp token list` 输出中该名字是否出现 |

---

## 2. 现状（AS-IS）

```
TokenRecord.scopes: string[]              mcp-token.ts:49-50   存储（~/.ki/mcp-tokens.json, 0600）
ALL_SCOPES = 'all'                        mcp-token.ts:81
isScopeAuthorized(authScopes, scope)      mcp-token.ts:87-90   includes('all') || includes(scope)
resolveScopesArg(raw)                     mcp-token.ts:116-135 'a,b' → ['a','b']；含 all → ['all']

传输层拦截  findScopeViolation()           mcp-http.ts:160-183
HTTP 层     scopeAllowed()                mcp-http-api.ts:441
枚举豁免    SCOPE_LESS_TOOLS              mcp-http.ts:165
枚举过滤    registerScopeListTool(authScopes)  scope-list.ts:24-29
```

**关键结论（本子需求最重要的发现）**：

> `scopes.includes('team')` 对视图名**天然成立**——`--scope team` 的鉴权判定与"`team` 是一个 scope"完全同构，**传输层与判定逻辑零改动**。
> `ki mcp token generate --scope team` 今天就能成功——`resolveScopesArg` 只做字符集校验，不查存在性。

所以 D8「token 可以支持视图」真正要改的是**存储层的客体分类**与**可见性**，不是鉴权算法。

---

## 3. 方案（TO-BE）

### 3.1 存储：`viewGrants` 独立字段

```ts
export interface TokenRecord {
  /* ...既有字段... */
  /** 授权 scope 集合：['all'] 表示全部；否则为具体 scope 列表 */
  scopes: string[];
  /**
   * 【新增】授权视图集合（与 scopes 并列，不复用）。
   *
   * 为什么单独一个字段，而不是把视图名混进 scopes：
   * ① `scopes` 里的字符串**无法区分**"库"与"视图"——将来若开放页面编辑视图
   *    （届时"仅 CLI 可改"的安全前提失效，必须改回授权快照），迁移时无法自动判定
   *    哪些条目是视图授权，只能靠猜；
   * ② 审计时需要能一眼看出"这个 Token 读的是哪些库 / 哪些视图"。
   */
  viewGrants?: string[];
}

/** 会话级授权：加载时把 viewGrants 合并进 scopes，下游零改动 */
export interface TokenAuth {
  id?: string;
  /** 可授权名字的全集 = record.scopes ∪ record.viewGrants */
  scopes: string[];
  /** 仅视图授权部分（供列表分类展示） */
  viewGrants: string[];
  readOnly: boolean;
}
```

**加载时合并**（`findTokenAuth` 附近，唯一改点）：

```ts
const merged = [...record.scopes, ...(record.viewGrants ?? [])];
```

> ★ 这一步让 `isScopeAuthorized` / `findScopeViolation` / `scopeAllowed` / `SCOPE_LESS_TOOLS` **全部零改动**——它们只看"名字在不在授权集合里"。

### 3.2 CLI：`--view` 显式授权

| 命令 | 行为 |
|---|---|
| `ki mcp token generate --scope a,b` | 逐个判定：名字 ∈ `viewGrants` 已有 → 保持；名字 ∈ 当前 `views` → 写入 `viewGrants`；否则写入 `scopes` |
| `ki mcp token generate --view team` | **强制**写入 `viewGrants`（视图尚不存在时也能显式声明） |
| `ki mcp token update <id> --view team` | 同上 |
| `ki mcp token generate --scope typo-name` | 成功 + stderr 警告「「typo-name」既不是知识库也不是视图；若是拼写错误，该 Token 将无法访问任何知识库」 |

> **分类不准时的自适应**：若某名字当前在 `scopes` 里、但后来变成了视图（先授权后建视图），`ki mcp token list` 会显示「⚠ 分类可能过时」，并可用 `ki mcp token update <id> --view <name>` 一键纠正。**运行时不依赖分类**（合并后同权），故不影响安全。

### 3.3 鉴权语义（只定义，不改算法）

```
token.scopes = ['a','b']，token.viewGrants = ['team']，views.team.members = ['c','d']
  → 合并后授权集合 = ['a','b','team']

请求 --scope team
  ├─ findScopeViolation：includes('team') ✓ → 放行
  └─ 业务层：resolveScopeTargets → ['c','d'] → fan-out 读 c、d

请求 --scope c          （单独请求视图成员）
  └─ findScopeViolation：includes('c') ✗ → 403
```

**语义定案：授权视图 ≠ 授权成员名。** 视图授权的是"这个聚合的可读性"，不是"逐个成员的可寻址性"。

理由：若视图授权自动展开为成员授权，则"从视图移除某库"必须同步收缩一批 token——恰是动态跟随的反面，语义自相矛盾（要么全跟随、要么全快照）。把视图当独立客体最简洁。

### 3.4 安全前提（必须写进代码注释）

```
视图只能通过 CLI 创建/修改（需求 D6）
  → 改视图需要本机 shell 权限 ≈ 管理员权限
  → "给视图加库 = 扩大一批 token 的权限"的起点永远是管理员动作
  → 动态跟随不构成普通用户的越权通道
```

⚠️ **前提失效条件**：一旦开放"页面创建/编辑视图"，立即改回**授权时快照成员**并要求重新授权。届时迁移路径已由 `viewGrants` 备好（把 `viewGrants` 展开为 `scopes` 即可）。该约束写入 `mcp-token.ts` 的 `TokenRecord.viewGrants` 注释。

### 3.5 `ki mcp token list` 展示增强

```
$ ki mcp token list
ID       Label        知识库              视图                       只读
a1b2c3   本地开发     all                 —                          否
d4e5f6   团队 Agent   —                   视图 team（kisearch/mem/docs） 是
g7h8i9   外部客户     kisearch, team-b    —                          否
h1j2k3   运维脚本     —                   team（视图已删除 ⚠）        否
```

**分类规则**：`record.viewGrants` 直接标为视图；`record.scopes` 剔除 `all` 后若名字 ∈ 当前 `views` → 标「⚠ 分类可能过时，建议 `--view` 重设」；两者都不是 → 标「⚠ 未知（前向声明）」。

### 3.6 `ki mcp token list --granting-view <view>`（原 S-01 的 A8 移入）

列出 `viewGrants` 或 `scopes` 中含该视图名的全部 token（id / label / 只读态）。S-01 的 `ki view delete` 用**静态文案**指向本命令（不调代码，避免成环）。

### 3.7 `ki_scope_list` 增量返回 views

```ts
export interface ViewMemberMeta {
  scope: string;
  kb: boolean;
  vector: boolean;
  readonly: boolean;
}

export interface ViewInfo {
  view: string;
  members: string[];
  /**
   * ★ 成员元信息（与 members 同序）。
   * 必需原因：`scopes[]` 按 token 授权过滤，而视图成员通常**不在授权列表内**
   * （§3.3：授权视图 ≠ 授权成员名）。前端在视图模式下要判断
   * 「这个成员是不是只读库」「有没有向量索引」，只能从这里取；
   * 缺了它，`useScopeReadonly(成员名)` 查不到条目 → readonly 默认 false
   * → **只读库在视图下被显示成可写**。
   */
  memberMeta: ViewMemberMeta[];
  availableCount: number;
  missing: string[];
}
```

```json
// Demo 返回示例（仅示意格式）
{
  "ok": true,
  "scopeMode": "default",
  "count": 2,
  "scopes": [{ "scope": "kisearch", "kb": true, "vector": true, "registered": false, "readonly": false, "wikiCount": 120 }],
  "views": [
    {
      "view": "team",
      "members": ["kisearch", "kisearch-memory", "team-docs"],
      "memberMeta": [
        { "scope": "kisearch", "kb": true, "vector": true, "readonly": false },
        { "scope": "kisearch-memory", "kb": true, "vector": true, "readonly": true },
        { "scope": "team-docs", "kb": false, "vector": false, "readonly": false }
      ],
      "availableCount": 2,
      "missing": ["team-docs"]
    }
  ],
  "vectorAvailable": true
}
```

**过滤规则**

| 对象 | 规则 |
|---|---|
| `scopes[]` | 保持不变 `isScopeAuthorized`（`scope-list.ts:24-29`） |
| `views[]` | `isScopeAuthorized(authScopes, v.view)` —— 视图本身未授权则不出现 |
| `views[].members` / `memberMeta` | **不过滤**：授权视图即授权其成员内容，隐藏库名会让 S-05 的"来源库标记"无法解释，也会让 S-06 拿不到成员只读态 |

### 3.8 `ki scope list` 文本输出**保持原样**

| 形态 | 行为 |
|---|---|
| `ki scope list`（默认文本） | **逐字节不变**，不追加视图段（challenger 意见 9：按行解析的脚本会断） |
| `ki scope list --views` | 追加「视图」段 |
| `--json` | `views` 字段**始终包含** |

### 3.9 接管 `scope-readonly` 的视图名拒绝

`scope-readonly` **刻意不走 `withScopeWriteLock`**（`scope-policy.ts:17-19`：否则只读库永远解不开），因此 S-03 的写锁门禁覆盖不到它。在本子需求的配置写回路径处理：

```ts
// src/scope.ts::setScopeReadonly 入口
if (isViewName(config, scope)) {
  throw new ViewError('VIEW_NOT_WRITABLE',
    `视图 ${scope} 不是知识库，无法设置只读状态。\n成员库如需只读：${members.map(m => `ki scope readonly ${m} --on`).join('; ')}`);
}
```

> 这也是 S-03 §3.2 挂点表移除 `src/scope.ts` 的原因——`src/scope.ts` 归本子需求独占写，避免第 2 批同文件冲突（父文档 I8）。

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | `viewGrants` **独立字段** | 把视图名混进 `scopes`（v1 方案） | 字符串无法区分库与视图；将来开放页面编辑视图时必须迁移，而历史数据无法自动判定哪些是视图授权，只能靠猜 | 无 |
| **D1-b** | 加载时**合并**进 `TokenAuth.scopes` | 让各判定点分别查两个字段 | 有 4 处判定（`isScopeAuthorized` / `findScopeViolation` / `scopeAllowed` / `scope-list` 过滤），分别查必然漂移；合并后**零改动** | 无 |
| **D2** | 动态跟随（非授权时快照） | 授权时快照成员列表 | 快照会让"改了视图 token 不跟随"，视图的聚合意义被削弱；且 `viewGrants` 已为将来迁移备好路径 | **一旦开放页面编辑视图**（安全前提失效）→ 立即改回快照 |
| **D3** | `views[].members` 不做权限过滤 | 成员也按 authScopes 过滤 | 会出现"有视图但成员为空"的矛盾态；来源标记与只读态都无法解释 | 出现真实的枚举泄露投诉 |
| **D4** | 传输层零改动 | 在 `findScopeViolation` 里展开视图再逐个校验成员 | 会让"授权视图"退化成"必须同时授权所有成员"，与 §3.3 冲突 | 无 |
| **D5** | `ki scope list` 文本输出不变 | 默认追加视图段（v1 方案） | 该命令给人也给脚本用（`docs/query-kb.md:58` 教用户用它），追加段落会打断 `grep`/`awk` 类脚本且不报错 | 无 |
| **D6** | 分类按当前 `views` 自动判定 + `--view` 强制 | 只保留 `--scope` 自动判定 | 视图尚不存在时（前向声明）无法表达意图；且自动判定在"先授权后建视图"时会分错 | 无 |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| token 授权视图，但视图已被删除 | 名字退化为"未知"；请求仍能通过传输层（`includes` 命中），业务层 `isViewName` 为 false → 当成不存在 scope → `skipped` 上报 | 是 |
| token 有 `all` | 全部视图可见、可读 | — |
| `ki_scope_list` 无 authScopes（本机免鉴权） | 不过滤（现状） | — |
| token 文件损坏 | 沿用 `MCP_TOKEN_CORRUPT` fail-closed（不改） | 是 |
| 视图成员全部不存在 | `views[].availableCount = 0`；检索时全量 `skipped` | 是 |
| `--view` 名字是未知 scope | 照常写入（前向声明）+ 警告 | 是 |
| `scope-readonly` 传视图名 | `VIEW_NOT_WRITABLE` + 列出各成员的 `ki scope readonly` 命令 | 是 |

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/mcp-token.ts` | `TokenRecord.viewGrants`；`TokenAuth.viewGrants`；加载时合并；`--view` 解析；注释记录安全前提 |
| `src/mcp-server.ts` | `token list` 分类展示 + `--granting-view` |
| `src/scope.ts` | `executeScopeList` 追加 `views`（JSON）/ `--views`（文本）；`scope-readonly` 拒绝视图名 |
| `src/lib/mcp-tools/scope-list.ts` | 返回 `views[]` + 按视图授权过滤 |
| `docs/mcp-http.md` · `docs/cli.md` | 授权视图的用法与语义 |

**不改**：`findScopeViolation`、`scopeAllowed`、`SCOPE_LESS_TOOLS`、`isScopeAuthorized`、`resolveScopesArg`。

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| D1 | 授权视图可用 | `ki mcp token generate --view team` → 该 token `ki_search(scope='team')` 成功 |
| D2 | 成员名不可单独寻址 | 同一 token `ki_search(scope='c')` → 403 |
| D3 | 动态跟随 | 给 `team` 加成员 `e` → 同一 token 立即可搜到 `e` 的内容（无需重启） |
| D4 | 展示可解释 | `ki mcp token list` 分开显示「知识库」与「视图」两列 |
| D5 | 列表按授权过滤 | token 只授权 `team` → `views` 只含 `team`，`scopes` 不含成员 |
| D6 | 成员缺失可见 | `team` 含未导入的 `team-docs` → `views[0].missing = ['team-docs']` |
| D7 | `all` 不受影响 | `--scope all` 时全部视图与 scope 可见 |
| D8 | 未知名字仅警告 | `--scope typo-name` → 成功 + stderr 警告 |
| D9 | 零回归 | 既有 token 单测全绿（`test/*token*`） |
| **D10** | **`--granting-view`** | 视图 `team` 被 2 个 token 授权 → 该命令列出这 2 个 |
| **D10-b** | 静态文案 | `ki view delete team` 输出指向 `--granting-view` 的提示（纯字符串，无代码依赖） |
| **D11** | 成员只读态可传递 | `views[].memberMeta[i].readonly === true`，S-06 据此渲染只读 |
| **D12** | **`ki scope list` 文本不变** | 默认输出与升级前**逐字节一致**；`--views` 才追加 |
| **D13** | 分类可纠正 | 视图先授权后创建 → `token list` 标「分类可能过时」→ `--view` 重设后消失 |
| **D14** | `scope-readonly` 拒绝视图 | `ki scope readonly team --on` → `VIEW_NOT_WRITABLE` + 逐成员命令 |
