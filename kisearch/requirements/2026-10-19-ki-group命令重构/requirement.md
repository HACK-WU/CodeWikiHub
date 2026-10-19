---
id: REQ-20261019-005
feature: Group 命令重构（ki group）
status: 已确认
created: 2026-10-19
updated: 2026-10-19
version: 2
tags: [cli, refactor, ux]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：Group 管理命令重构（`ki group`）

- **来源**：用户 2026-10-19 连续三条原话
  1. 「`ki manage-index -s langchain --action delete --parent langchain` → `delete 需要 --name 参数`……当前命令行的要求我似乎无法实现删除 langchain 这个目录」
  2. 「是不是直接用 `--group` 参数就行了？`--parent` 和 `--name` 根本就没必要吧」
  3. 「我觉得 `query-group` 可以并入到 `ki group` 中啊，比如 `ki group query`？……然后本次修改，不做任何的兼容操作。」
- **分析口径**：debug（根因取证）→ product-manager M1（变更评估）→ acceptance-verify 阶段 0/1（全量功能审计）
- **证据声明**：`🟢` 最高等级 = **代码直读 + 5 条运行时实测**（沙箱 scope，已清理）；未跑正式验收轮
- **已拍板结论**（2026-10-19：全部落定，无待拍板项）：
  - **D1 命名**：`ki group`（否决 `manage-group`，否决保留 `manage-index`）
  - **D2 `delete-relation` 语义**：硬切 —— 只删 relation，删组一律走 `ki group delete`
  - **D3 wiki 行为**：**永不动**（不移动 / 不删除 / 不进回收站）；`--to-trash` 选项与 `.ki/trash` 机制**整体移除**
  - **D4 `source.dir`**：**绝不触碰**（无例外）
  - **D6-1 list 归属**：**不新增** `ki group list` / `ki_group_list`；`ki_manage_index_list` 的 `topGroups` 并入 `ki_scope_list` 输出后删除该工具
  - **D5 兼容策略**：**零兼容**（不保留旧命令别名；仅保留"已更名"报错提示）
  - **D6 MCP 工具名**：**同步改名**（`ki_query_group` → `ki_group_list`、`ki_manage_index_create` → `ki_group_create`、`ki_manage_index_delete` → **`ki_group_delete_empty`**；旧名不保留别名）
  - **D6-2 参数形态（全族）**：`ki_group_create` / `ki_group_delete_empty` 只接受**单一路径 `path`**；**一律取消 `--parent` / `--name` / `--parents`**（MCP 同样不接受 `name` / `parent` / `parents` 字段）
  - **D6-3 MCP 删组能力边界**：**保留 NEG-15 限制**（MCP 只删空节点）；因能力与 CLI 不等价，**工具名加 `_empty` 后缀**，不再与 `ki group delete` 同名
  - **D7 文档级删源文件**：配置了 wiki 源目录时，`ki delete-relation -g -r` **直接删除源 `.md`**（不进回收站）
  - **Q 合并范围**：`query-group` 并入 `ki group list`（原名 `query` 一并改为 `list`），`manage-index` 更名 `ki group`，二者原命令**物理删除**

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | **用户不是"参数记不住"，而是同一个"删除 Group"意图在系统里有 3 套实现、4 个入口、2 种互不兼容的副作用** | 见 §2 对照表 🟢 |
| 2 | **`--parent` / `--name` 会丢失一个安全性质**：自动补全只作用于"容器"，被删对象必须精确命中 —— 合成单一路径参数后若不额外约束，就变成"自动补全 → 自动删除" | `src/manage-index.ts:720-734`、`src/lib/group-resolve.ts:117-207` 🟢 |
| 3 | **命令名族早已是"名词 + 子命令"**：`ki scope list\|delete\|clear`、`ki doc list\|delete`、`ki tag list`；Group 是唯一拆成两个复合动词命令（`manage-index` / `query-group`）的领域 | `src/scope.ts:339-399`、`src/doc.ts:172-196` 🟢 |
| 4 | **用户级 skill 模板已在把 `create` 当子命令写**（`ki manage-index create --scope … --name …`），今天能跑只是因为 `--action` 默认值为 `create` | `~/.codebuddy/skills/agents-md-init/AGENTS-template.md:29-41`、`src/manage-index.ts:576` 🟢 |
| 5 | **CLI 存在两套实现**：daemon 路径（有写锁 + 迁移守卫）与 CLI 内联路径（两者都没有），实测输出 schema 已分叉 | `src/manage-index.ts:653-813` vs `:348-421`；实测 E1/E2/E3 🟢 |
| 6 | **`delete-relation` 漏 `-r` 即递归删除整组且零确认** | `src/delete-relation.ts:771,795-800`；实测 E5 🟢 |
| 7 | **删组会移动 `source.dir` 下同名目录**（实测把暂存目录的 `playground/` 移入 `.ki/trash`） | `src/delete-relation.ts:447-486`；实测 E5 🟢 |
| 8 | **`manage-index` 删组残留 assets 与空目录**（实测 157 个 svg / 1.3 MB），与 `scope.ts` 注释承诺相反 | `src/manage-index.ts:551-562`、`src/lib/scope.ts:121-131` 🟢 |

---

## 2. 现状：入口 × 实现 × 语义对照

| # | 入口 | 实现 | 确认参数 | relations | 本地 KB 目录 | assets | wiki | 向量 | 树节点 | 写锁 | 迁移守卫 | 提交顺序 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ki manage-index --action delete --name X --force`（真实 CLI 走 daemon） | `src/manage-index.ts:348-421` | `--force`（仅非空时） | 删 | 只 `unlink index.json` | **残留** | **保留** | 删 | 删 | ✅ | ✅ | 无 |
| 2 | `npm run manage-index` / `npx jiti …`（**测试走这条**） | `src/manage-index.ts:709-813` 内联副本 | 同上 | 删 | 同上 | **残留** | **保留** | 删 | 删 | ❌ | ❌ | 无 |
| 3 | `ki delete-relation -g X`（**省略 `-r`**） | `src/delete-relation.ts:255-440` | **无** | 删 | 递归 `rmSync` | 删 | **移回收站** | 删 | 删 | ✅ | ✅ | ✅ |
| 4 | MCP `ki_manage_index_delete` | `src/manage-index.ts:208-330` | — | 仅空壳 key | 不删 | 不删 | 不删 | 不删 | 删 | ✅ | ✅ | — |
| 5 | `ki manage-index --action create` | daemon `:85-151` / 内联 `:653-706` | — | — | — | — | — | — | 建 | daemon ✅ / 内联 ❌ | 同左 | — |
| 6 | `ki manage-index --action list-scopes` | `src/manage-index.ts:166-187` | — | — | — | — | — | — | — | — | — | — |
| 7 | `ki scope list`（能力重复且更全） | `src/scope.ts:339-380` | — | — | — | — | — | — | — | — | — | — |

### 2.1 运行时实测记录（沙箱 scope，已清理）

| 实验 | 结果 | 结论 |
|---|---|---|
| E1 两套 delete 输出对比 | 内联 `{ok,path,cascade}`；daemon `{ok,scope,path,cascade}` | schema 已分叉，`docs/cli.md:192-206` 写的是内联形状 |
| E2 持 scope 写锁后分别执行 | 内联 create `ok:true`；daemon create 返回「该知识库已有导入或还原任务正在写入」 | 内联路径无 `withScopeWriteLock` |
| E3 grep 迁移守卫 | daemon 三条路径有（`:91,:212,:359`），内联无 | 内联少一道守卫 |
| E4 `--parent langchain`（缺 `--name`） | `{ok:false,error:"delete 需要 --name 参数"}`，无 hint | 死胡同 |
| E5 `ki delete-relation -s <沙箱> -g playground` | `ok:true`、`relationCount:5`、目录整体消失、`wikiMoved:true`、**零确认** | F2/F3 成立 |

> E5 副作用已恢复：沙箱 scope 的 `source.dir` 指向 Web 导入暂存目录，`playground/` 被移入 `.ki/trash`，已原样移回并核对内容（`kb/*.md` 5 篇、`tests_l13/`、`.venv/` 均在）。

---

## 3. 问题清单

### P0 — 语义 / 安全

| ID | 问题 | 证据 | 后果 |
|---|---|---|---|
| F1 | 删组有 3 套实现、4 个入口，副作用互不兼容 | §2 全表 | 用户无法预判"wiki / 本地文档 / assets 会不会被删" |
| F2 | `delete-relation` 省略 `-r` 即递归删整组且零确认 | `delete-relation.ts:771,795-800`；E5 | 漏一个参数就删掉整棵子树 |
| F3 | 删组会把 `source.dir` 下同名目录整棵移走 | `delete-relation.ts:447-486`；E5 | `source.dir` 为用户文档目录时 = "删知识库组，本地文档被搬进 `.ki/trash`" |

### P1 — 正确性 / 可维护性

| ID | 问题 | 证据 |
|---|---|---|
| F4 | CLI 内联路径无写锁、无迁移守卫 | E2、E3、`manage-index.ts:653-813` |
| F5 | 测试覆盖内联路径，用户走 daemon 路径 | `test/manage-index.test.ts:24-42` vs `bin/ki.mjs:160` |
| F6 | `--action` 默认 `create`（写操作是默认值） | `manage-index.ts:576` |
| F7 | 参数术语孤岛 `--parent`+`--name`，错误无出路 | `manage-index.ts:577`；E4 |
| F8 | `--action list-scopes` 与 `ki scope list` 重复且更弱 | `manage-index.ts:166-187` vs `scope.ts:339-380` |

### P2 — 一致性 / 文档

| ID | 问题 | 证据 |
|---|---|---|
| F9 | 确认参数不统一：`--force` vs `--yes` | `scope.ts:386`、`doc.ts:196` |
| F10 | `bin/ki.mjs` 帮助仍在教不存在的 `--action create-root --root-name` | `bin/ki.mjs:11,120` |
| F11 | `docs/cli.md` 删除输出样例与实际不符（缺 `scope`） | `docs/cli.md:192-206` |
| F12 | 删组残留 assets + 空目录，与 `scope.ts` 注释承诺冲突 | `manage-index.ts:551-562`、`scope.ts:121-131` |

---

## 4. 目标与非目标

### 4.1 目标

| # | 目标 | 判据 |
|---|---|---|
| G1 | **一个动作 = 一条命令 = 一个实现**：Group 的增/删/查全部收敛到 `ki group`，底层只有一个 core；组级删除从 `delete-relation.ts` 迁出为独立 core，**MCP 空节点删除也复用该 core（`requireEmpty` 前置校验）**；**旧 core 与 daemon RPC 同步下线**（`executeManageDelete*` / `cascadeDeleteGroupData` / `manage-delete` 移除；`delete-group` 改名 `group-delete`，旧名不再注册） | 全仓（含 `daemon-dispatch.ts` 与测试）不存在第二处删除 Group 的实现 |
| G2 | **删除可预告**：`ki group delete <path>` 默认只预览，`--yes` 才执行 | 无 `--yes` 时零写入 |
| G3 | **删除不越界**：只动 `kb/<scope>/<group>/` 与该组的关系/向量/树节点 | `source.dir` 删除前后哈希一致 |
| G4 | **读写在同一个命令族**：`ki group list` 取代 `query-group`（原名 `query` 一并改 `list`） | `ki query-group` 不存在 |
| G5 | **错误都给出路**：抽样 8 条错误出口，每条含可复制的正确命令 | 走查记录 |
| G6 | **零兼容**：旧命令物理删除，仅保留"已更名"提示 | `ki manage-index` / `ki query-group` 均不可执行 |

### 4.2 非目标

- 不改 `group-index.json` 存储格式、不改 `Group` 概念本身。
- 不把 `ki scope list` / `get-module-info` / `sync-relation` 并入 `ki group`（它们服务的对象不同）。
- 不新增独立的结构枚举子命令：`list` 已覆盖结构可见性（且额外提供评分分区与语义兜底），再拆一个纯枚举入口只会重叠。
- MCP 仅调整工具名与 `create` / `delete` 的入参形态（`path`，见 §5.4 / D6-2），其余工具 schema 不动。

---

## 5. 目标 CLI 表面

```bash
ki group create <path> [--scope <s>]                    # 只建单个节点，父路径必须已存在
ki group delete <path> [--yes]       [--scope <s>]     # 无 --yes = 仅预览
ki group list   [<path>] [--mode hot|warm|cold|emerging|full] [--depth N] [--hot-count N]
                         [--groups a,b] [--no-auto-fallback] [--scope <s>]
```

> `list` 即原 `query-group` 的完整能力（评分分区 + 语义兜底 + 树渲染），**不是**纯路径枚举；
> 改名理由：与 `ki scope list` / `ki doc list` / `ki tag list` 同族，且"列出组"比"查询组"更贴合用户心智。

### 5.1 旧 → 新 映射

| 旧 | 新 |
|---|---|
| `ki manage-index --action create --name X [--parent Y]` | `ki group create "Y/X"` |
| `ki manage-index --action delete --name X [--parent Y] --force` | `ki group delete "Y/X" --yes` |
| `ki manage-index --action list-scopes` | `ki scope list`（输出补 `topGroups`，见 §5.4） |
| `ki query-group --subtree <path>` | `ki group list <path>`（`--subtree` 取消，位置参数即子树） |
| `ki query-group -g a,b --mode full` | 参数不变 |
| `ki delete-relation -g X`（漏 `-r`） | `ki group delete X` —— `delete-relation` 只删 relation |

### 5.2 必须固化的语义

| # | 规则 | 理由 |
|---|---|---|
| S1 | `delete` 的 `<path>` **只精确匹配**，近似路径报错并给候选 | 破坏性操作不容自动补全（§1 结论 2） |
| S2 | `delete ""` / `"/"` / 全空白一律拒绝 | 空路径 `path.join` 会指向 scope 根目录 |
| S3 | `create` **只接受单一路径，只建单个节点**：父路径必须已存在；**禁用 `resolveGroupPath` 语义补全**（与 delete 同口径）；父级缺失时报错并给候选 + 提示"先创建父组"。**全仓不提供 `--parent` / `--name` / `--parents` 任何形态** | 避免笔误静默挂到别的组（现状 `manage-index.ts:668` 会自动补全）；也避免多参数组合再次长出"参数孤岛" |
| S4 | `list`：位置参数 = 单子树；`--groups a,b` = 批量；二者互斥；删除 `--subtree` | 消除重叠入口 |
| S5 | 所有写路径经 `withScopeWriteLock` + `assertNoPendingVectorMigration` | 修 F4 |
| S6 | 删除走 `withMetadataCommitSync` 提交窗口 | 避免"列表在、点开 404" |
| S7 | 删组在 wiki / `source.dir` 侧**零写操作**（不 rename、不 unlink、不建 `.ki/trash`） | D3 + D4 |
| S8 | MCP 工具名与 CLI 同族（`ki_group_*`），旧名**不保留别名**；**命名同族 ≠ 能力等价**（`ki_group_delete_empty` 的能力边界见 D6-3） | D6 / D6-3 |
| S9 | `<path>` 与 `--groups` 等用户输入中的 `.` / `..` 段一律拒绝（含 URL 编码形式） | 防路径穿越；`.ki/trash` 机制移除后不再有兜底 |
| S10 | 文档级删除源文件前必须做**双重校验**：① 归属——`rel.sourcePath` 存在时，候选文件必须等于 `realpath(sourceDir + sourcePath)`，不匹配拒绝（`source-mismatch`）；② containment——`realpath(文件)` 必须落在 `realpath(sourceDir)` 之内 | 硬删不可恢复；只按文件名匹配会误删同目录同名文件 |
| S11 | 文档级删除仅在 **wiki 源目录已配置且文件存在** 时删源文件；未配置或文件缺失不报错、不猜测路径 | 避免"没配置却删错位置" |

### 5.3 删除的目标清单（D3/D4 已拍板）

| 目标 | 默认 | 备注 |
|---|---|---|
| relations 缓存（含子组前缀键） | 删 | |
| `kb/<scope>/<group>/` 目录（含 assets） | 递归删 | 修 F12 |
| group-index 树节点 | 删 | |
| 向量（记忆 id 批量） | 删 | |
| wiki 目录 | **保留**（不移动、不删除、不进回收站） | D3，仅删组 |
| `source.dir` 下同名目录 | **绝不触碰** | D4，修 F3 |

> **垃圾桶机制整体移除（2026-10-19 拍板）**：删除 `moveDirToTrash` / `moveToTrash` / `.ki/trash` 全部实现与文档承诺。
> `resolveWikiTarget`（`src/lib/wiki-sync.ts:49-56`）优先返回 `source.dir`，故"wiki 目录"与"`source.dir/<group>`"
> 在多数 scope 下是**同一路径**；移除垃圾桶后，删组对该路径**零写操作**（无例外分支）。
>
> **文档级删除是唯一例外（D7）**：`ki delete-relation -g <g> -r <r>` 在 wiki 源目录已配置且文件存在时，
> **直接 `unlink` 该源 `.md`**（不再移入回收站）；删除前必须通过 S10 的 containment 校验。
> **必须保留既有的编辑草稿守卫**：在 `withScopeWriteLock` 内、`unlink` 之前检查 `activeDrafts(scope)` 中是否存在同 group + relation 的活跃草稿
>（`delete-relation.ts:139-147`，status 为 `editing/queued/running/failed`），命中则拒绝并提示先 cancel/finish。
> 否则源文件被硬删后草稿的 `baseRevision` 永远无法收口，只能手工清理 `.relation-edits/*.json`。
> `--input` 批量删除复用 `executeDeleteRelation`（`delete-relation.ts:700-733`），故**同样硬删**，不走另一套语义。
> 这一不对称是刻意的：文档级是用户点名删除单个 relation，删组是批量操作、一律不碰用户文件。

### 5.4 MCP 工具映射（D6 已拍板）

| 旧 | 新 | 备注 |
|---|---|---|
| `ki_query_group` | `ki_group_list` | 能力与参数 schema 不变（mode / depth / hot_count / groups / auto_fallback） |
| `ki_manage_index_create` | `ki_group_create` | **入参只有 `{ scope, path }`**：废弃 `name` + `parent`，也**不提供 `parents`**；父级缺失时返回错误 + 候选 + "先创建父组"指引（D6-2） |
| `ki_manage_index_delete` | **`ki_group_delete_empty`** | **入参同步改 `path`**；仍只允许删空节点（NEG-15 边界不变），**复用 `src/lib/group-delete.ts` core 并传 `requireEmpty: true`**；因与 CLI `ki group delete` 能力不等价，**名字带 `_empty` 显式区分**（D6-3） |
| `ki_manage_index_list` | **不另起工具**：`topGroups` 并入 `ki_scope_list` 输出后删除该工具 | 见 §9 D6-1；跨 scope 枚举归 `ki_scope_list`，单 scope 结构归 `ki_group_list` |

> **全局参数原则（2026-10-19 拍板）**：本族命令**一律不保留 `--parent` / `--name` / `--parents`**，也不接受 MCP 的 `name` / `parent` / `parents` 字段；
> 组的位置只由单一路径 `path` 表达。嵌套创建 = 逐层调用 create（父级必须已存在）。
>
> **`ki_group_delete_empty` 是唯一没有 CLI 对应物的工具**（CLI 侧删组一律是级联的 `ki group delete`）。
> 工具描述与拒绝信息必须写明"仅空节点；级联删除请用 CLI `ki group delete <path> --yes`"，否则 AI 会把"能力受限"误读成"不能删组"。
> **代码内 AI 可见文案同步**：`src/lib/chat/prompt-config.ts:117` 的标签现为「删除 Group 节点及其下内容」，与新能力矛盾，
> 必须改为「删除空 Group 节点（非空请用 CLI `ki group delete`）」。
>
> 改名波及（已 grep 实测）：`src/lib/mcp-tools/manage-index.ts`、`src/lib/mcp-tools/query-group.ts`、
> `src/lib/chat/mcp-tool-registry.ts`（4 处工具定义 + submitScoped 名）、`src/lib/chat/prompt-config.ts`（3 组工具清单 + 标签）、
> `src/lib/chat/retrieval/retrieval-skill.ts`、`src/lib/mcp-http.ts:138,769`（`SCOPE_LESS_TOOLS` 与全局独占判定）、
> `src/lib/operation-coordinator.ts:75`（`READ_MCP_TOOLS`）、`docs/cli.md`、`docs/mcp-http.md`、`docs/error-handling.md`、`README.md`、
> `test/`（4 文件）、仓库内 `skills/`（3 文件 34 处）、仓库外 `~/.codebuddy/skills/`（9 个 skill / 17 文件 / 72 处）。

> **`ki_group_create` 必须保留的既有语义**：scope 不存在时**自动创建**（`ensureScopeDir`）并返回 `createdScope: true`。
> `skills/agents-md-init` §1.5 的引导链（④⑤）完全依赖这一点 —— 它不调用任何"建 scope"接口，只调 create 顺带建库；
> 改名为 `ki_group_create` 时若丢掉该行为，初始化 AGENTS.md 会在全新 scope 上直接失败。

---

## 6. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| CLI 用户（`ki manage-index` / `ki query-group`） | 流程 | **破坏** | 零兼容决策 | `bin/ki.mjs` 加 `RENAMED` 映射，报错并指向新命令（不执行） | — |
| `ki delete-relation` 漏 `-r` 行为 | 流程 | **破坏** | `delete-relation.ts:795-800` | 改为报错 + 指向 `ki group delete` | — |
| 回收站机制（`.ki/trash`） | **数据行为** | **破坏** | `delete-relation.ts:186,419,466,658`、`test/delete-group.test.ts:157`、`docs/cli.md:791,810` | 整体移除 `moveToTrash` / `moveDirToTrash`；文档级改为直接 `unlink` 源文件（S10 containment 校验），删组仍零触碰 | ✅ D7 |
| MCP 工具名（`ki_query_group` / `ki_manage_index_*`） | **外部契约** | **破坏**（已决定同改） | `src/lib/mcp-tools/*.ts`、`chat/mcp-tool-registry.ts`、`chat/prompt-config.ts`、`mcp-http.ts:138,769`、`operation-coordinator.ts:75` | 按 §5.4 改名，**不留旧名别名**；`ki_manage_index_list` 合并进 `ki_scope_list`（输出增 `topGroups`）后删除 | ✅ D6 / D6-1 |
| 内部 RPC 名（`query-group` / `manage-*` / `delete-group`） | 展示 | 无感 | `daemon-dispatch.ts:46,52,58-60` | 一并改为 `group-*`；**旧名可保留一版别名**（指向同一 handler，仅参数适配，不得复制实现）；`manage-delete` 直接删除 | — |
| 仓库内 skill（`skills/`） | 流程 | **破坏** | 3 文件 / 34 处，见 §6.1 | 必须先于文档清扫改完，否则初始化 AGENTS.md 直接失败 | — |
| 仓库内文档（`docs/` + `README` + `bin/ki.mjs`） | 展示 | 降级 | docs 15 文件 102 处、README 13 处、`bin/ki.mjs` 8 处，见 §6.1 | S4 一次性清扫（`docs/manage-index.md` 需整篇重写） | — |
| 仓库内规则（`rules/`） | 展示 | 降级 | `rules/ai-codekb-memory.md` 2 处 | 与 skill 同批替换；M-11 grep 范围需含 `rules` | — |
| **仓库外用户级 skill** | 流程 | **破坏** | 9 个 skill / 17 文件 / 72 处（`ki-memory-lookup` 34、`ki-memory-write` 15、`ki-foundation` 10、`memory-skill` 5、`codekb-skill` 5、`strong-relation` 2、`code-review` 1） | 同批修改；注：`~/.codebuddy/skills/agents-md-init/` 实测**不存在**，源在仓库 `skills/agents-md-init/` | — |
| ki 自身知识库（CodeWikiHub） | 数据 | 降级 | 107 文件/522 处 + 124 文件/645 处旧命令 | S4 完成后重新 `ki import` 刷新 | — |
| 现有单测 | 测试 | 降级 | `test/manage-index.test.ts`、`test/query-group.test.ts` 等 | 随实现重写（并改为覆盖真实 CLI 路径） | — |

### 6.1 skill / 文档同步清单（2026-10-19 grep 实测）

**① 仓库内 skill（S3 后立即改，否则 skill 指向不存在的命令）**

| 文件 | 命中 | 需要改的内容 |
|---|---|---|
| `skills/agents-md-init/SKILL.md` | 14 | `ki_manage_index_list`→`ki_scope_list`（7 处）；`ki_query_group`→`ki_group_list`（6 处）；`ki_manage_index_create(scope, name)`→`ki_group_create(scope, path)`（2 处，含 §1.5 引导链 ④⑤）。**附带修正非法参数**：`:81` 的 `mode: "full,depth=4"` → `mode: "full", depth: 4`；`:82` 的 `mode: "hot,hot_count=3"` → `mode: "hot", hot_count: 3`（`depth`/`hot_count` 是独立参数，未知 mode 片段被 `query-group.ts:613-619` 静默丢弃，现状实际按默认 5 条渲染） |
| `skills/agents-md-init/AGENTS-template.md` | 15 | `ki query-group --mode full`→`ki group list --mode full`（1）；13 处 `ki manage-index create --scope X --name "Y"`→`ki group create "Y" --scope X`；`ki_query_group(...)`→`ki_group_list(...)`（1） |
| `skills/ki-search/SKILL.md` | 5 | `ki_manage_index_list()`→`ki_scope_list()`；`ki_query_group`→`ki_group_list`（2 处）；`ki_manage_index_create(scope, parent, name)`→`ki_group_create(scope, path)`；**第 167 行需语义重写**：原文"MCP 不支持删除"已不准确 —— `ki_group_delete_empty` 支持空节点，级联删除走 CLI `ki group delete <path> --yes` |

**② 仓库内规则**

| 文件 | 命中 | 处理 |
|---|---|---|
| `rules/ai-codekb-memory.md` | 2 | `ki_query_group`→`ki_group_list`（181/240 行） |

**③ 仓库内文档（S4 清扫）**

| 文件 | 命中 | 处理方式 |
|---|---|---|
| `docs/manage-index.md` | 11（整篇 355 行） | **整篇重写 / 改名 `docs/group.md`**（或并入 `docs/cli.md`），不是字符串替换 |
| `docs/cli.md` | 29 | `manage-index` / `query-group` 两章合并为 `group` 一章；输出样例逐字段对齐（M-10） |
| `docs/ki-command-guide.md` | 12 | 命令速查替换 |
| `docs/codekb-agent-guide.md` | 10 | 命令 + mermaid 节点文本 |
| `docs/query-kb.md` | 6 | 命令 + `manage-index.ts` 字样 |
| `docs/error-handling.md` | 6 | 错误文案与工具名 |
| `docs/verify-index.md` | 6 | 逐处替换 |
| `docs/backup-restore.md` | 4 | `list-scopes`→`ki scope list`；`create --name`→`group create` |
| `docs/workflows.md` | 4 | 命令 + 流程图节点 |
| `docs/tags-design.md` | 4 | 逐处替换 |
| `docs/architecture.md` | 3 | 组件名与 `query-group` 分区语义引用 |
| `docs/mcp-http.md` | 3 | MCP 工具名 |
| `docs/build-kb.md` | 2 | 逐处替换 |
| `docs/import.md` / `docs/vector-engine-mem.md` | 各 1 | 逐处替换 |
| `README.md` | 13 | 概览与文档索引描述 |

**④ 不改写（历史记录）**

| 文件 | 命中 | 理由 |
|---|---|---|
| `docs/req-chat-mcp-tools-refactor.md` | 2 | PM 报告存档，改写会篡改历史；M-11 grep 需 allowlist |

**⑤ 仓库外用户级 skill（9 个目录 / 17 文件 / 72 处）**

| skill | 命中 | 备注 |
|---|---|---|
| `ki-memory-lookup` | 34 | SKILL + 5 个 reference（strong-relation / decision / pending-change / error / data-flow / api） |
| `ki-memory-write` | 15 | SKILL + 4 个 reference |
| `ki-foundation` | 10 | 含旧 CLI 名（`manage-index` / `query-group`） |
| `memory-skill` | 5 | |
| `codekb-skill` | 5 | 含旧 CLI 名 |
| `strong-relation` | 2 | |
| `code-review` | 1 | |

> **顺序约束**：skill / rules / docs 的文本替换必须与 S3 **同批或之后**落地；先改文本会让 skill 指向尚不存在的 `ki group`。
> `test-data/bk-monitor-wiki/` 是导入测试夹具（内容含旧命令属历史数据），**不修改**，也不在 M-11 grep 范围。

---

## 7. 验收指标草案（正式验收轮使用，slug 建议 `ki-group-cli`）

| ID | 类型 | 指标 | 判据 | 证据层 | 必达 |
|---|---|---|---|---|---|
| M-01 | 🎯 | `ki group delete <path> --yes` 可删顶层组与嵌套组 | 两种路径均删净，`ki group list` 不再出现该组 | L2+L3 | 🔴 |
| M-02 | 🧱 | 删除路径不精确必须拒绝 | 近似路径报错 + 给候选，零删除 | L2 | 🔴 |
| M-03 | 🧱 | 空路径 / 根路径必须拒绝 | 返回错误，scope 目录零变化 | L2 | 🔴 |
| M-04 | 🔗 | 删组不动 `source.dir` | 删除前后 `source.dir` 目录树哈希一致 | L3 | 🔴 |
| M-05 | 🔗 | `delete-relation` 漏 `-r` 不再删整组 | 返回错误 + 指向新命令，数据零变化 | L1+L2 | 🔴 |
| M-06 | 📊 | 所有写路径共用同一 core（锁 + 迁移守卫） | 持锁时任意**写入口**（CLI create/delete、MCP create/delete_empty、daemon RPC）均返回 `SCOPE_OPERATION_BUSY`；读入口 `list` 不在此列 | L2 | 🔴 |
| M-07 | 📊 | 旧命令物理不存在但报错给出路 | `ki manage-index` → 报错含 `ki group` 提示，非"未知命令" | L2 | 🔴 |
| M-08 | 🎯 | 删组后磁盘无残留 | `<scope>/<group>/` 整体消失（含 assets、空目录） | L2 | 🟡 |
| M-09 | 💎 | 每个错误出口都"给出路" | 抽样 8 条：① delete 空/根路径 ② delete 近似路径 ③ delete 组不存在 ④ delete 非空（MCP empty）⑤ 锁占用 ⑥ 迁移中 ⑦ 旧命令 RENAMED ⑧ `delete-relation` 漏 `-r`；每条含可复制正确命令 | L2 走查 | 🟡 |
| M-10 | 📊 | 文档与实现同源 | `docs/cli.md` 输出样例 = 真实输出（逐字段） | L2 | 🟡 |
| M-11 | 🌐 | 全仓无旧命令引用（RENAMED 表 + 历史归档除外） | `grep -rn "manage-index\|query-group" docs skills rules bin README` **仅命中** `bin/ki.mjs` 的 RENAMED 映射与 `docs/req-chat-mcp-tools-refactor.md` | L1 | 🔴 |
| M-12 | 🧱 | 删组在 wiki / `source.dir` 侧**零写操作**（无例外开关） | 删除前后 `source.dir` 目录树哈希一致；全仓不存在 `.ki/trash` 写入路径 | L2+L3 | 🔴 |
| M-13 | 📊 | MCP 工具名与 CLI 同族 | `tools/list` 只出现 `ki_group_list` / `ki_group_create` / `ki_group_delete_empty`，无 `ki_manage_index_*` / `ki_query_group`；`ki_scope_list` 输出含 `topGroups`；**chat 工具标签不再写"及其下内容"** | L2 | 🔴 |
| M-14 | 🔗 | 文档级删除按 D7 硬删源文件且不越界 | 配置源目录时源 `.md` 消失；`sourcePath` 不符时拒绝（`source-mismatch`）且文件零变化；无 `sourcePath` 时标注 `legacy-name`；构造 `..` / 软链逃逸时被拒绝；未配置源目录时不报错；存在活跃编辑草稿时拒绝删除（提示 cancel/finish） | L2+L3 | 🔴 |
| M-15 | 📊 | `ki_group_create` / `ki_group_delete_empty` 入参只能是 `path` | 传 `name` / `parent` / `parents` 一律被拒绝并提示改用 `path`；CLI 不识别 `--parent` / `--name` / `--parents`；两种路径（顶层/嵌套，父级已存在）均可用 | L2 | 🔴 |
| M-16 | 🌐 | 用户级 skill 无旧命令/旧工具名引用 | `grep -rn "manage-index\|query-group\|ki_manage_index\|ki_query_group" ~/.codebuddy/skills` 为 0（9 个 skill 目录） | L1 | 🔴 |
| M-17 | 🌐 | 仓库内 skill 不再引用旧工具名 | `grep -n "ki_manage_index\|ki_query_group" skills/` 为 0；`skills/ki-search/SKILL.md` 的 MCP 删除描述与新能力一致；`agents-md-init` 的 `depth` / `hot_count` 为独立参数（不再塞进 `mode`） | L1 | 🔴 |
| M-18 | 📊 | 全仓只有一个删组实现 | `grep -rn "cascadeDeleteGroupData\|executeManageDelete\|executeDeleteGroupLocal" src` 仅命中新 core 内部；`daemon-dispatch.ts` 无 `manage-delete`；旧 `delete-group` 最多作为**指向同一 handler 的别名**（不得有独立实现）；测试不直接调用旧实现 | L1+L2 | 🔴 |
| M-19 | 🧱 | `create` 不做语义补全 | 创建父路径不存在的组必须报错并给候选，不得挂到近似命中组（对照现状 `manage-index.ts:668`） | L2 | 🔴 |

---

## 8. 实施拆解

| 步 | 内容 | 前置 |
|---|---|---|
| **S1 止血** | 删除 `.ki/trash` 全部实现（`moveDirToTrash` / `moveToTrash`）；**把 `executeDeleteGroupLocal` 从 `delete-relation.ts` 迁出到 `src/lib/group-delete.ts`，改造为唯一删组 core**（不碰 wiki / `source.dir`、递归清 assets 与空目录、删 dense 向量 + FTS、继承 `activeDrafts` 守卫；`requireEmpty` 开关供 MCP 空节点删除复用）；文档级改为直接 `unlink` 源文件（S10 containment 校验 + S11 缺省不报错 + **保留 `activeDrafts` 草稿守卫**）；`delete-relation` 漏 `-r` 改报错并指向 `ki group delete` | 已解除（D3/D4/D7 已拍板） |
| **S2 收敛 core** | 删除 `manage-index.ts:651-824` 内联副本 + `executeManageDelete` / `executeManageDeleteLocal` / `cascadeDeleteGroupData` / `executeListScopes`（`topGroups` 逻辑并入 `executeScopeList`）+ daemon `manage-delete` RPC（**不得留可绕过新 core 的入口**）；`executeManageDeleteEmpty` 改为调用新 core（`requireEmpty: true`）；所有入口走同一实现（写锁 + 迁移守卫 + 提交窗口）；补"测真实 CLI 路径"用例；`test/delete-group.test.ts` / `test/group-key-invariant.test.ts` / `test/read-write-concurrency.test.ts` 改指向新 core | S1 |
| **S3 新命令** | 新建 `src/group.ts`（create/delete/list 三子命令，`list` 承接原 `query-group` 全部参数；create 保留"scope 不存在自动创建 + `createdScope`"语义，**create/delete 均禁用 `resolveGroupPath` 语义补全**）；物理删除 `manage-index` / `query-group` 入口与 `delete-group` RPC（改为 `group-delete`）；`bin/ki.mjs` 加 `RENAMED` 提示；MCP 工具按 §5.4 改名（含 `chat/mcp-tool-registry.ts`、`prompt-config.ts`、`SCOPE_LESS_TOOLS`、`READ_MCP_TOOLS`）；`ki_scope_list` 增 `topGroups` 并删除 `ki_manage_index_list`；内部 RPC 名改 `group-*` | S2（D6 / D6-1 已拍板） |
| **S4 清扫** | 按 §6.1 清单执行：① 仓库内 skills（3 文件 34 处，含 `ki-search` 第 167 行语义重写）② `rules/ai-codekb-memory.md`（2 处）③ docs 15 文件 102 处（`docs/manage-index.md` **整篇重写**）+ README 13 处 + `bin/ki.mjs` 帮助 ④ 仓库外 9 个 skill / 17 文件 / 72 处；完成后 `ki import` 刷新 CodeWikiHub | S3 |

---

## 9. 决策记录（全部已拍板）

| # | 决策 | 结论 | 理由 / 落地约束 |
|---|---|---|---|
| **D1** | 命令族命名 | `ki group`，子命令 `create` / `delete` / `list` | 与 `ki scope` / `ki doc` / `ki tag` 的"名词 + 子命令"一致；`list` 比 `query` 更贴合"列出组"的意图 |
| **D2** | `delete-relation` 语义 | 只删 relation；删组一律 `ki group delete` | 消除"漏一个参数删整棵树"的隐式危险 |
| **D3** | 删组时 wiki | **永不动**（不移动 / 不删除 / 不进回收站）；`--to-trash` 与 `.ki/trash` **整体移除** | 破坏性副作用一律不承诺，退回"只删知识库自己的数据" |
| **D4** | 删组是否触碰 `source.dir` | **绝不触碰**（仅约束删组；文档级见 D7） | 实测已把用户本地文档搬进 `.ki/trash`，属越界 |
| **D5** | 兼容策略 | **零兼容**：旧命令物理删除，仅 RENAMED 提示；MCP 旧名不留别名 | 避免两套表面长期并存 |
| **D6** | MCP 工具名 | **同步改名**：`ki_query_group` → `ki_group_list`、`ki_manage_index_create/delete` → `ki_group_create/delete` | 否则 AI 侧永久留 `query` / `manage_index` 旧词，与 CLI 再次分叉 |
| **D6-1** | `ki_manage_index_list` 归属 | **已定**：不新增 `ki_group_list`；`topGroups` 并入 `ki_scope_list` 输出，删除 `ki_manage_index_list` | `list` 与 `query` 的结构可见性重叠（`query` 是其超集），而跨 scope 枚举属 `scope` 领域 |
| **D6-2** | `create` / `delete` 参数形态（CLI + MCP） | **已定**：只接受单一路径 `path`；`--parent` / `--name` / `--parents` 与 MCP 的 `name` / `parent` / `parents` **全部不保留** | 用户的原始诉求是"`--parent` + `--name` 没必要"；嵌套创建退化为逐层调用，不引入第二套参数组合 |
| **D6-3** | MCP 删组能力边界 | **已定（方案 B）**：保留 NEG-15（MCP 只删空节点），工具名改为 **`ki_group_delete_empty`**，不与 CLI `ki group delete` 同名 | 同名必须同能力；要么统一能力（需推翻 NEG-15），要么把能力差异写进名字。选后者，改动面最小 |
| **D7** | 文档级 `delete-relation` 移除垃圾桶后的源文件处理 | **已定**：wiki 源目录已配置且文件存在时**直接 `unlink`**（硬删）；未配置或文件缺失不报错 | 文档级是用户点名删除单个 relation，应删干净；删组仍按 D3/D4 零触碰 |

> D6-1 的落地依据：`ki_manage_index_list` 走 `executeListScopes`，独有字段只有 `topGroups`（**仅顶层组名**）；
> `ki_scope_list` 走 `executeScopeList`（层标记 / 注册 / 文档数），**当前不含任何 Group 字段**。
> 故合并方式为：给 `ScopeEntry` 增加 `topGroups: string[]`（复用 `readGroupIndex`，失败则空数组），
> `ki_scope_list` 输出随之为增字段（不改输入 schema）；随后删除 `ki_manage_index_list` 及其 `SCOPE_LESS_TOOLS` / `needsGlobal` 特判。
> 服务端 `topGroups` 为顶层名，完整层级与 Relations 仍由 `ki_group_list` 提供。
