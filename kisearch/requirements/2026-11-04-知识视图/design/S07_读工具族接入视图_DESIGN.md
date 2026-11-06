# S-07 读工具族接入视图

- 父文档：`DESIGN.md` §3
- 前置依赖：S-01（`resolveScopeTargets`）
- 产出被依赖：**S-06**（`src/lib/doc-list.ts` 由本子需求新建，S-06 消费）
- 证据：🟢 代码直读 ｜ 版本：v2（challenger 意见 1 新增）

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 读工具族 | `ki group list` / `ki tag list` / `ki doc list` / `ki get-module-info` 及其对应 MCP 工具 |
| 分桶 | 按成员库分组返回（`buckets`） |
| 合并 | 跨成员聚合为单一列表（如 tag 计数累加） |

> 「视图 / 成员 / 展开」见**父文档 §3.4 共享术语速查**。

---

## 2. 现状（AS-IS）

这四个命令/工具**全部只认单 scope**，且都不经写锁（纯读）：

| 命令 | 入口 | 读什么 | 视图名进去会怎样 |
|---|---|---|---|
| `ki group list` | `src/group.ts:146,156` | `dataDir/<scope>/group-index.json` 的 `groups` 树 | 读到不存在的文件 → 空树 / `ENOENT` |
| `ki tag list` | `src/tag.ts:69` | `vectorListTags({ scope })` → `collections/<scope>` | Collection 不存在 → 空 tag 列表 |
| `ki doc list` | `src/doc.ts:174` | `buildDocList(scope)` | 空列表 |
| `ki get-module-info` | `src/get-module-info.ts:501` | `<scope>/<groupPath>/index.json` 的 relation 原文 | "原文不可用" |

| MCP 工具 | 声明 | 视图名进去会怎样 |
|---|---|---|
| `ki_group_list` | `mcp-tools/group-list.ts:11` | 同 `group list` |
| `ki_tag_list` | `mcp-tools/tag-list.ts:11` | 同 `tag list` |
| `ki_get_module_info` | `mcp-tools/get-module-info.ts:11` | 同 `get-module-info` |

> **没有任何工具支持多 scope 或 `all`**：13 个工具的 zod schema 里**一个 `scopes` 数组都没有**（S-04 调查结论）。

**这是本需求最大的覆盖缺口**：`ki_group_list` / `ki_get_module_info` 是 Agent 定位文档的**主路径**。视图若不在这条路上生效，"用一个名字定位全部知识"对 Agent 完全落空，只剩语义检索可用。

---

## 3. 方案（TO-BE）

### 3.1 统一入口

四个命令的 scope 解析全部换成：

```ts
const config = loadConfig();
const targets = resolveScopeTargets(config, opts.scope);
// targets.views.length === 0 → 走完全不变的既有单库分支
```

**单库零回归**是硬约束：`targets.views.length === 0 && targets.scopes.length === 1` 时，代码路径与改造前逐字节一致。

### 3.2 `ki group list --scope <view>`

**语义**：分桶。每个成员一棵独立的 Group 树，**绝不合并同名组**（两库都有 `projects` 时各挂各的）。

```json
// Demo（--json）
{
  "ok": true,
  "view": "team",
  "members": ["kisearch", "kisearch-memory", "team-docs"],
  "buckets": [
    { "scope": "kisearch", "groups": [{ "name": "k8s", "count": 10 }, { "name": "projects", "count": 4 }] },
    { "scope": "kisearch-memory", "groups": [{ "name": "专题记忆", "count": 31 }] },
    { "scope": "team-docs", "error": "该知识库尚未导入（无 group-index.json）" }
  ]
}
```

**文本输出**（非 `--json`）：

```
视图 team（3 个成员）

── kisearch ──────────────────────────
<既有 tree 渲染>

── kisearch-memory ───────────────────
<既有 tree 渲染>

── team-docs ─────────────────────────
✗ 该知识库尚未导入（无 group-index.json）
```

> 复用既有的 tree 渲染函数，只是外面套一层库标题——**不重写渲染逻辑**。

### 3.3 `ki tag list --scope <view>`

**语义**：合并 + 计数累加，并保留来源库便于解释。

```json
// Demo（--json）
{
  "ok": true,
  "view": "team",
  "tags": [
    { "tag": "部署", "count": 12, "scopes": ["kisearch", "kisearch-memory"] },
    { "tag": "检索", "count": 5, "scopes": ["kisearch"] }
  ],
  "skipped": [{ "scope": "team-docs", "reason": "无向量 Collection" }]
}
```

- 顺序：按 `count` 降序（与现状一致），同 count 按 tag 名
- `scopes` 字段是本子需求新增，用于解释"这个 tag 来自哪几个库"
- 某成员无向量索引 → 进 `skipped`，不中断

> MCP `ki_tag_list` 同结构。前端 tag 下拉（S-06）**不消费本接口**——它用 `/api/doc/list` 顶层的合并 `tags`（S-06 §3.5），两处口径需一致：都是「合并去重 + 计数累加」。

### 3.4 `ki doc list --scope <view>`

**语义**：分桶，与 `/api/doc/list`（S-06 §3.1）**共用同一实现**。

**本子需求新建 `src/lib/doc-list.ts`**：把 `mcp-http-api.ts:1975-2044` 的 payload 组装逻辑整体搬出来，成为：

```ts
export interface DocListBucket {
  scope: string;
  docs: ListedDoc[];
  offset: number;
  total: number;
  truncated: boolean;
  groups: { name: string; count: number }[];
  tags: string[];
  error?: string;
}

/** 单库 payload（现状形状，逐字节不变） */
export function buildDocListPayload(scope: string, opts: DocListQueryOptions): DocListBucket;

/** 视图：逐成员调用上者，失败产出 error 桶 */
export function buildViewDocList(view: string, members: string[], opts: DocListQueryOptions): {
  view: string;
  members: string[];
  buckets: DocListBucket[];
  tags: string[];          // 顶层合并去重，供 tag 下拉
};
```

> ★ **谁建文件、谁消费**：`src/lib/doc-list.ts` 由 **S-07（批次 2）** 新建；**S-06（批次 3）** 只把 `handleDocList` 改成调用它。反向依赖会成环，必须按此顺序。
> `mcp-http-api.ts` 的 handler 在 S-06 里变得很薄：解析参数 → 调 `buildDocListPayload` / `buildViewDocList` → `sendJson`。

### 3.5 `ki get-module-info --scope <view>`

**语义**：`group + relation` 在视图内**可能多命中**，因此不能静默选一个。

| 情况 | 行为 |
|---|---|
| 传了 `--member <scope>` | 直接读该成员；`member` ∉ 视图成员 → `INVALID_VIEW_MEMBER` |
| 未传，唯一命中 | 直接返回该成员的原文，响应加 `member: "<scope>"` 标明来源 |
| 未传，多命中 | **fail-loud**：列出候选库与各候选的 `sourcePath`，给出可直接复制执行的 `--member` 命令 |
| 未传，0 命中 | 沿用既有「原文不可用」文案，附「已在 3 个成员库中查找」 |

```
$ ki get-module-info --scope team -g projects -r "API认证"
错误：该文档在视图 team 的多个知识库中同时存在，请指定来源库：
  kisearch         projects/API认证              (src/docs/api/auth.md)
  kisearch-memory  projects/API认证              (src/notes/api.md)
  请改用：ki get-module-info --scope team -g projects -r "API认证" --member kisearch
```

**MCP `ki_get_module_info`** 同步增可选 `member: z.string().optional()`，参数描述说明上述规则。

### 3.6 MCP 工具的 zod schema 变化

| 工具 | 变化 |
|---|---|
| `ki_group_list` | **无变化**（`scope` 仍是 `z.string()`；视图名同形） |
| `ki_tag_list` | **无变化** |
| `ki_get_module_info` | 增 `member: z.string().optional()` |
| 三个工具的 `scope` 描述 | 补「或视图名（自动展开为成员库）」 |

> **不新增工具** —— `SCOPE_LESS_TOOLS` 白名单无需变动（父文档 R3）。

---

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| **D1** | `group list` / `doc list` **分桶**，不合并 | 拍平合并为一棵树/一个列表 | 两库都有 `projects` 时混成一棵，**看不出文档属于哪个库**；且同名必然撞 | 无 |
| **D2** | `tag list` **合并 + 计数累加** | 分桶 | tag 是"跨库筛选维度"，分桶后用户要逐库看一遍才知道全貌；且前端 tag 下拉只能吃一个扁平列表 | 无 |
| **D3** | `get-module-info` 多命中 **fail-loud** | 取第一个命中 / 取最新的 | 静默选一个等于让用户读错库的文档，且**无法事后发现**；文档内容可能名称相同而语义完全不同 | 无 |
| **D4** | `src/lib/doc-list.ts` 由 **S-07 建、S-06 用** | 放在 `mcp-http-api.ts` 里供两边调 | CLI 层 import HTTP handler 模块会拉起整个 HTTP 栈（含 daemon 相关依赖），且职责错位 | 无 |
| **D5** | MCP schema **不加 `scopes` 数组** | 让 MCP 工具接受 `scopes: string[]` | 与 D2（`--scope` 复用）冲突，会出现两套多库表达；且 13 个工具都要改 | 无 |

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 视图查不到 / 为空 | `VIEW_NOT_FOUND` / `VIEW_EMPTY` → `ok:false` | 是 |
| 某成员无 KB 索引 | 该桶 `{scope, error}`，其余正常 | 是 |
| 某成员读索引抛异常 | 同上（`try/catch` 吞在桶内），stderr 记录 | 是 |
| `get-module-info` 的 `member` 不在视图内 | `INVALID_VIEW_MEMBER` | 是 |
| `get-module-info` 多命中 | fail-loud + 候选清单 | 是 |
| 视图成员全部不可读 | `buckets` 全为 error；退出码 1 | 是 |
| 单成员视图 | 走单库路径，响应**不含** `buckets`（避免下游处理两种形状） | 是（形状差异） |

> **单成员视图的特殊约定**：`views.length > 0` 但 `scopes.length === 1` 时，**仍返回单库形状**（不加 `buckets`）。理由：一个成员的"聚合"没有信息量，且能让"先建视图再逐步加成员"的过程零摩擦。前端按 `'buckets' in data` 判定，天然兼容。

---

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/doc-list.ts` | **新增**：`buildDocListPayload` / `buildViewDocList`（从 `mcp-http-api.ts:1975-2044` 搬出） |
| `src/group.ts` | `list` 子命令接视图（分桶 + 文本分节） |
| `src/tag.ts` | `list` 子命令接视图（合并 + 累加 + `scopes`） |
| `src/doc.ts` | `list` 子命令接视图（分桶） |
| `src/get-module-info.ts` | 增 `--member`；视图下多命中 fail-loud |
| `src/lib/mcp-tools/group-list.ts` · `tag-list.ts` | 仅参数描述文案 |
| `src/lib/mcp-tools/get-module-info.ts` | 增 `member` 可选参数 |
| `docs/cli.md` | 四命令的视图行为 |
| `docs/mcp-tools.md` | `ki_get_module_info` 的 `member` |

**不碰**：`src/search.ts`（S-02）、`src/scope-policy.ts`（S-03）、`src/lib/mcp-token.ts` / `src/scope.ts`（S-04）、`mcp-http-api.ts`（S-06 才改）。

---

## 7. 验收标准

| # | 验收项 | 可执行形式 |
|---|---|---|
| G1 | `group list` 分桶 | 2 库视图 → `--json` 返回 2 个 bucket，各自 groups 独立；两库同名 `projects` 不合并 |
| G2 | `group list` 文本分节 | 非 JSON 输出含 `── <scope> ──` 分隔 |
| G3 | `tag list` 合并累加 | 两库都有 tag `部署`（5 与 7）→ 合并为 `count: 12`，`scopes: [a,b]` |
| G4 | `tag list` 缺失可见 | 某成员无向量 → `skipped` 含该成员 |
| G5 | `doc list` 分桶 | 2 库视图 → `buckets` 2 项；与 `/api/doc/list` 同结构 |
| G6 | `get-module-info` 唯一命中 | 只在一个库存在 → 返回原文，响应带 `member` |
| G7 | `get-module-info` 多命中 | 两库同名 → 退出码 1，列出候选与可复制的 `--member` 命令 |
| G8 | `member` 越界 | `--member` 不在视图成员内 → `INVALID_VIEW_MEMBER` |
| G9 | MCP 三工具 | `ki_group_list` / `ki_tag_list` / `ki_get_module_info` 在视图下同 G1/G3/G6 |
| G10 | **单成员视图退化** | 视图只有 1 个成员 → 四命令返回**单库形状**（无 `buckets`），与 `--scope <该成员>` 一致 |
| G11 | **单库零回归** | 四个命令在单库下的输出与改造前逐字节一致（含 `--json` 字段集） |
| G12 | `doc-list.ts` 无 HTTP 依赖 | `grep -c "mcp-http-api" src/lib/doc-list.ts` = 0 |
