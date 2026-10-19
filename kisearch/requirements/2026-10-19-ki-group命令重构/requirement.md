---
id: REQ-20261019-005
feature: Group 命令重构（ki group）
status: 已确认
created: 2026-10-19
updated: 2026-10-19
version: 1
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
- **已拍板结论**：
  - **D1 命名**：`ki group`（否决 `manage-group`，否决保留 `manage-index`）
  - **D2 `delete-relation` 语义**：硬切 —— 只删 relation，删组一律走 `ki group delete`
  - **D5 兼容策略**：**零兼容**（不保留旧命令别名；仅保留"已更名"报错提示）
  - **Q 合并范围**：`query-group` 并入 `ki group query`，`manage-index` 更名 `ki group`，二者原命令**物理删除**
- **仍待拍板**：D3（删组时 wiki 默认行为）、D4（删组是否触碰 `source.dir`）、D6（MCP 工具名是否同步改名）

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
| G1 | **一个动作 = 一条命令 = 一个实现**：Group 的增/删/查全部收敛到 `ki group`，底层只有一个 core | 全仓不存在第二处删除 Group 的实现 |
| G2 | **删除可预告**：`ki group delete <path>` 默认只预览，`--yes` 才执行 | 无 `--yes` 时零写入 |
| G3 | **删除不越界**：只动 `kb/<scope>/<group>/` 与该组的关系/向量/树节点 | `source.dir` 删除前后哈希一致 |
| G4 | **读写在同一个命令族**：`ki group query` 取代 `query-group` | `ki query-group` 不存在 |
| G5 | **错误都给出路**：抽样 8 条错误出口，每条含可复制的正确命令 | 走查记录 |
| G6 | **零兼容**：旧命令物理删除，仅保留"已更名"提示 | `ki manage-index` / `ki query-group` 均不可执行 |

### 4.2 非目标

- 不改 `group-index.json` 存储格式、不改 `Group` 概念本身。
- 不把 `ki scope list` / `get-module-info` / `sync-relation` 并入 `ki group`（它们服务的对象不同）。
- 不新增 `group list` 子命令（树查询已由 `query` 覆盖）。
- 不动 MCP 工具的参数 schema（仅工具名可能随 D6 调整）。

---

## 5. 目标 CLI 表面

```bash
ki group create <path> [--parents] [--scope <s>]
ki group delete <path> [--yes]       [--scope <s>]     # 无 --yes = 仅预览
ki group query  [<path>] [--mode hot|warm|cold|emerging|full] [--depth N] [--hot-count N]
                         [--groups a,b] [--no-auto-fallback] [--scope <s>]
```

### 5.1 旧 → 新 映射

| 旧 | 新 |
|---|---|
| `ki manage-index --action create --name X [--parent Y]` | `ki group create "Y/X"` |
| `ki manage-index --action delete --name X [--parent Y] --force` | `ki group delete "Y/X" --yes` |
| `ki manage-index --action list-scopes` | `ki scope list` |
| `ki query-group --subtree <path>` | `ki group query <path>` |
| `ki query-group -g a,b --mode full` | 参数不变 |
| `ki delete-relation -g X`（漏 `-r`） | `ki group delete X` —— `delete-relation` 只删 relation |

### 5.2 必须固化的语义

| # | 规则 | 理由 |
|---|---|---|
| S1 | `delete` 的 `<path>` **只精确匹配**，近似路径报错并给候选 | 破坏性操作不容自动补全（§1 结论 2） |
| S2 | `delete ""` / `"/"` / 全空白一律拒绝 | 空路径 `path.join` 会指向 scope 根目录 |
| S3 | `create` 默认父路径必须存在，`--parents` 才补祖先 | 避免笔误长出脏树 |
| S4 | `query`：位置参数 = 单子树；`--groups a,b` = 批量；二者互斥；删除 `--subtree` | 消除重叠入口 |
| S5 | 所有写路径经 `withScopeWriteLock` + `assertNoPendingVectorMigration` | 修 F4 |
| S6 | 删除走 `withMetadataCommitSync` 提交窗口 | 避免"列表在、点开 404" |

### 5.3 删除的目标清单（默认值，D3/D4 待拍板）

| 目标 | 默认 | 备注 |
|---|---|---|
| relations 缓存（含子组前缀键） | 删 | |
| `kb/<scope>/<group>/` 目录（含 assets） | 递归删 | 修 F12 |
| group-index 树节点 | 删 | |
| 向量（记忆 id 批量） | 删 | |
| wiki 目录 | **待定 D3**：保留 / 移回收站 | 现有两套实现相反 |
| `source.dir` 下同名目录 | **待定 D4**（建议：绝不触碰） | 修 F3 |

---

## 6. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| CLI 用户（`ki manage-index` / `ki query-group`） | 流程 | **破坏** | 零兼容决策 | `bin/ki.mjs` 加 `RENAMED` 映射，报错并指向新命令（不执行） | — |
| `ki delete-relation` 漏 `-r` 行为 | 流程 | **破坏** | `delete-relation.ts:795-800` | 改为报错 + 指向 `ki group delete` | — |
| MCP 工具名（`ki_query_group` / `ki_manage_index_*`） | **外部契约** | **破坏**（若同改） | `src/lib/mcp-tools/*.ts`、`chat/mcp-tool-registry.ts` | 随 D6 决定；schema 不变 | ✅ D6 |
| 内部 RPC 名（`query-group` / `manage-*` / `delete-group`） | 展示 | 无感 | `daemon-dispatch.ts:46,52,58-60` | 建议一起改（grep 一致性） | — |
| 仓库内文档 | 展示 | 降级 | docs 22 文件 97 处、skills 3 文件、README 3 处、`bin/ki.mjs` 8 处 | S4 一次性清扫 | — |
| **仓库外用户级 skill** | 流程 | **破坏** | `~/.codebuddy/skills/agents-md-init/AGENTS-template.md`（13 处）、`ki-search/SKILL.md:165` | 同批修改，否则下次初始化 AGENTS.md 直接失败 | — |
| ki 自身知识库（CodeWikiHub） | 数据 | 降级 | 107 文件/522 处 + 124 文件/645 处旧命令 | S4 完成后重新 `ki import` 刷新 | — |
| 现有单测 | 测试 | 降级 | `test/manage-index.test.ts`、`test/query-group.test.ts` 等 | 随实现重写（并改为覆盖真实 CLI 路径） | — |

---

## 7. 验收指标草案（正式验收轮使用，slug 建议 `ki-group-cli`）

| ID | 类型 | 指标 | 判据 | 证据层 | 必达 |
|---|---|---|---|---|---|
| M-01 | 🎯 | `ki group delete <path> --yes` 可删顶层组与嵌套组 | 两种路径均删净，`ki group query` 不再出现 | L2+L3 | 🔴 |
| M-02 | 🧱 | 删除路径不精确必须拒绝 | 近似路径报错 + 给候选，零删除 | L2 | 🔴 |
| M-03 | 🧱 | 空路径 / 根路径必须拒绝 | 返回错误，scope 目录零变化 | L2 | 🔴 |
| M-04 | 🔗 | 删组不动 `source.dir` | 删除前后 `source.dir` 目录树哈希一致 | L3 | 🔴 |
| M-05 | 🔗 | `delete-relation` 漏 `-r` 不再删整组 | 返回错误 + 指向新命令，数据零变化 | L1+L2 | 🔴 |
| M-06 | 📊 | 所有写路径共用同一 core（锁 + 迁移守卫） | 持锁时任意入口均返回 `SCOPE_OPERATION_BUSY` | L2 | 🔴 |
| M-07 | 📊 | 旧命令物理不存在但报错给出路 | `ki manage-index` → 报错含 `ki group` 提示，非"未知命令" | L2 | 🔴 |
| M-08 | 🎯 | 删组后磁盘无残留 | `<scope>/<group>/` 整体消失（含 assets、空目录） | L2 | 🟡 |
| M-09 | 💎 | 每个错误出口都"给出路" | 抽样 8 条，每条含可复制正确命令 | L2 走查 | 🟡 |
| M-10 | 📊 | 文档与实现同源 | `docs/cli.md` 输出样例 = 真实输出（逐字段） | L2 | 🟡 |
| M-11 | 🌐 | 全仓无旧命令引用 | `grep -r "manage-index\|query-group" docs skills bin README` 为 0 | L1 | 🔴 |

---

## 8. 实施拆解

| 步 | 内容 | 前置 |
|---|---|---|
| **S1 止血** | 删组不动 `source.dir`；`delete-relation` 漏 `-r` 改报错；递归清 assets | D3 / D4 |
| **S2 收敛 core** | 删除 `manage-index.ts:653-813` 内联副本，所有入口走同一实现；补"测真实 CLI 路径"用例 | S1 |
| **S3 新命令** | 新建 `src/group.ts`（create/delete/query 三子命令）；物理删除 `manage-index` / `query-group` 入口；`bin/ki.mjs` 加 `RENAMED` 提示 | S2 + D6 |
| **S4 清扫** | 仓库内 docs/skills/README/help + 仓库外 2 个全局 skill；完成后 `ki import` 刷新 CodeWikiHub | S3 |

---

## 9. 待拍板

| # | 决策 | 建议 | 不决策的后果 |
|---|---|---|---|
| **D3** | 删组时 wiki 默认 | **默认保留**，`--to-trash` 显式移回收站 | 两套实现继续相反，用户无法预判 |
| **D4** | 删组是否触碰 `source.dir` | **绝不触碰** | 删知识库会搬走用户本地文档（实测已发生） |
| **D6** | MCP 工具名是否同步改名（`ki_manage_index_*` → `ki_group_*`、`ki_query_group` → `ki_group_query`） | **同步改** | `manage_index` 旧词永久留在 AI 侧，与 CLI 再次分叉 |
