# 场景推演：`ki group` 命令重构（需求文档模式）

> 推演时间：2026-10-19
> 推演对象：需求文档模式（仅 `requirement.md` v2，设计未开始）
> 输入文档：`requirements/2026-10-19-ki-group命令重构/requirement.md`
> 证据性质：**推演结论（基于文档 + 源码直读推理，未实际执行）**

---

## 1. 全局理解声明

- **业务目标**：把 Group 的增/删/查收敛为 `ki group` 一套命令与一套实现，消除"同一删除意图、三套实现、四种副作用"的不可预判性；删除必须可预告、不越界；MCP 与文档同名同源。
- **系统位置**：用户 / AI Agent / 脚本（上游）→ CLI（`bin/ki.mjs`）与 MCP（`mcp-tools/*`、`chat/mcp-tool-registry.ts`）→ daemon 队列与写锁 → `manage-index` / `delete-relation` / `query-group` core → `relations-cache`、`kb/<scope>/`、`group-index.json`、向量/FTS、`source.dir`（下游）。旁路：`skills/` 与 `docs/` 消费同一套命令名。
- **整体成功判据**：
  1. 全仓只有一个删组实现，且所有入口都经过它（G1）；
  2. 无 `--yes` 零写入，预览与实际删除口径一致（G2）；
  3. 删组对 `source.dir` 零写操作（G3 + D3/D4）；
  4. 旧命令物理不可执行，但报错能直接粘出正确命令（G5/G6）；
  5. 文档 / skill / MCP 工具名与实现同源（M-10/M-11/M-13）。

---

## 2. 角色清单

| # | 角色 | 类型 | 权限层级 | 职责 | 来源 |
|---|------|------|---------|------|------|
| 1 | CLI 用户 | 用户 | 完整文件系统权限 | 手动 create/delete/list | 需求 §5 |
| 2 | AI Agent（MCP） | 用户（程序代理） | 受 scope Token 限制 | 通过 `ki_group_*` 读写 | 需求 §5.4 |
| 3 | 脚本 / CI | 程序 | 同 CLI | 备份脚本、自动化清理 | 需求 §6（`docs/backup-restore.md`） |
| 4 | daemon | 程序 | — | 队列、写锁、迁移守卫、提交窗口 | 需求 S5/S6 |
| 5 | 文件系统 / 环境 | 环境 | — | `source.dir` 用户文档、软链、并发写、权限 | D7 硬删引入 |
| 6 | 文档 / skill 维护者 | 用户 | — | S4 清扫 | 需求 §6.1 |
| 7 | CodeWikiHub 知识库 | 数据 | — | 消费旧命令文本（需重导刷新） | 需求 §6 |

---

## 3. 推演矩阵（场景 × 需求质量维度）

| 场景 \ 维度 | 场景完整性 | 验收可达性 | 需求一致性 | 角色对齐 | 边界/异常 | 术语一致 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| A 创建组（顶层/嵌套/`--parents`） | ✅ | ⚠️ | ❌ R4 | ✅ | ⚠️ | ⚠️ |
| B 列出组（默认/full/子树/`--groups`） | ✅ | ⚠️ | ⚠️ R10 | ✅ | ✅ | ⚠️ |
| C 删除组（预览 → `--yes`） | ⚠️ R3 | ⚠️ | ✅ | ✅ | ⚠️ R5 | ⚠️ |
| D 删除异常路径（近似/空/根/`..`） | ✅ | ⚠️ R11 | ✅ | ✅ | ✅ | ✅ |
| E 删组副作用（KB/向量/FTS/树/wiki） | ❌ R6/R7 | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| F 文档级删除（D7 硬删） | ⚠️ R14 | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| G MCP 调用（新名/旧名/同名不同能力） | ⚠️ R9 | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |
| H 旧命令 / 脚本升级 | ⚠️ R11 | ⚠️ R12 | ✅ | ✅ | ✅ | ✅ |
| I skill 初始化 AGENTS.md | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ |
| J 并发（删/建/导入交错） | ✅ | ⚠️ R12 | ⚠️ R8 | ✅ | ⚠️ | ✅ |

> 需求模式不启用设计 profile。

---

## 4. 核心场景推演

### 4.1 场景 C：删除组（Happy Path + 预告）

```text
{ki group delete "工具库/Redis"}   ← 无 --yes
  ▼
{读 group-index / relations-cache / KB 目录} ✅
  ├─ {打印预览：relations N、KB 文件 M、assets A、wiki 保留} ⚠️ 预览字段未定义（R3）
  └─ {确认无写操作} ✅（G2 判据成立）
  ▼
{用户另一次调用 --yes}
  ├─ {withScopeWriteLock + 迁移守卫} ✅
  ├─ {activeDrafts 检查} ❌ 需求未要求继承（R7）
  ├─ {删 relations（含子组前缀键）} ✅
  ├─ {删 kb/<scope>/<group>/（含 assets）} ✅
  ├─ {删树节点} ✅
  ├─ {删向量} ✅
  └─ {删 FTS} ❌ 目标清单漏项（R6）
  ▼
{输出结果}
  └─ {部分失败语义} ⚠️ 未定义（R8）
```

### 4.2 场景 A：创建组

```text
{ki group create "工具库/Redis"}
  ├─ {父路径 "工具库" 存在？}
  │    ├─ 存在 → 建节点 ✅
  │    └─ 不存在 → S3 要求报错
  │         └─ 但现有实现会走 resolveGroupPath 语义补全（manage-index.ts:668） ← ❌ 规则冲突（R4）
  └─ {scope 不存在 → ensureScopeDir 自动建 + createdScope} ✅（已写入 §5.4 注）
```

### 4.3 场景 E：删除副作用边界

```text
{ki group delete "X" --yes}
  ├─ {source.dir/<X> 存在}
  │    └─ {零 rename / 零 unlink / 零 .ki/trash} ✅（D3/D4）
  ├─ {旧 core 仍可达}
  │    ├─ delete-group RPC → executeDeleteGroup → moveDirToTrash ← ❌ 绕过新语义（R1）
  │    └─ manage-delete RPC → cascadeDeleteGroupData → 不删目录/assets ← ❌ 第二实现（R2）
  └─ {kb/<scope>/<X>/ 下 assets} ✅ 递归删
```

### 4.4 场景 F：文档级删除（D7）

```text
{ki delete-relation -g G -r R}
  ▼
{findWikiFile → source.dir/G/R.md}
  ├─ 未配置源目录 → 跳过、不报错 ✅（S11）
  ├─ 文件不存在 → 跳过 ✅（S11）
  ├─ sourceDir 不存在 / 相对路径 → realpath 抛错 ⚠️ 未定义（R14）
  ├─ realpath(file) 不在 realpath(sourceDir) 内 → 拒绝 ✅（S10）
  ├─ 目标是目录（EISDIR）/ 权限不足（EACCES） → ⚠️ 未定义（R14）
  └─ 校验通过 → unlink ✅（D7）
```

### 4.5 场景 G：MCP 调用

```text
{AI 调用 ki_group_delete(scope, path)}
  ├─ 空节点 → 删除成功 ✅
  └─ 非空节点 → 拒绝
       └─ {工具描述是否给 CLI 出路？} ❌ 需求只写"NEG-15 不变"（R9）
{旧客户端调用 ki_manage_index_delete} → tool not found（零兼容，已接受）
```

---

## 5. 问题汇总

| # | 类型 | 角色 | 场景 | 问题描述 | 功能影响（预期 → 实际） | 建议 | 严重度 |
|---|------|------|------|---------|------------------------|------|:---:|
| R1 | 需求缺口 | CLI / Agent | E | `executeDeleteGroup`（`delete-relation.ts:255-440`）与 `delete-group` RPC（`daemon-dispatch.ts:46`）未被处置，S3 只删 `manage-index` / `query-group` 入口 | 预期：全仓只有一套删组实现 → 实际：仍可经 daemon RPC 走到旧实现，且它会把 `source.dir/<group>` 移进 `.ki/trash`（违反 D3）；G1 判据直接不成立 | S1/S3 明确：把该实现迁入新 core 或删除；`delete-group` RPC 同步下线/改名；`test/delete-group.test.ts` 等 4 个测试改指向新 core | 🔴 |
| R2 | 需求缺口 | CLI / Agent | E | `executeManageDelete` / `executeManageDeleteLocal` / `cascadeDeleteGroupData` 仅剩 daemon `manage-delete` RPC 一个调用方（`daemon-dispatch.ts:60`），S2 只提"删内联副本" | 预期：旧管理面彻底消失 → 实际：RPC 仍可触达一套"不删目录/assets、不删 wiki"的删组语义，绕过 `--yes` 与预览 | 明确删除 `executeManageDelete*` + `cascadeDeleteGroupData` + `manage-delete` RPC；否则 M-11 的 grep 也扫不到（RPC 名不在其范围） | 🔴 |
| R3 | 需求缺口 | CLI 用户 | C | `ki group delete` 的**预览契约**未定义：字段、是否含 wiki 保留说明、执行时是否复核 | 预期：删除可预告（G2）→ 实际：用户仍不知道该组有多少 relation/文件/向量，F1 的原始诉求只解决了一半；且预览与执行是两次调用，期间新增的文档会被一并删除 | 定义预览 schema（`path/exists/relations/kbFiles/assets/vectors/fts/wiki:{path,action:'keep'}`）；`--yes` 执行时再打印一次实际计数 | 🟡 |
| R4 | 需求冲突 | 实现者 | A | S3 要求"create 默认父路径必须存在"，但未废止现有 `resolveGroupPath` 语义补全（`manage-index.ts:668`） | 预期：笔误必须报错 → 实际：父路径不存在时可能被自动补全到别的组，两种行为都能"看起来可用"，验收无从判定 | S3 明确"create 同样禁用语义补全"；近似路径报错并给候选 | 🔴 |
| R5 | 需求缺口 | CLI 用户 | C | 删除目标清单只写"向量（记忆 id 批量）"，漏 FTS-only 文档，而现有实现会删 `ftsIds`（`delete-relation.ts:350-353`） | 预期：删净 → 实际：照需求实现会漏删 FTS，删除后仍可全文搜到（幽灵数据） | §5.3 增加 FTS 行；M-08 加"FTS 检索无残留" | 🟡 |
| R6 | 需求缺口 | CLI 用户 | E | 未要求继承 `activeDrafts` 守卫（现有组级删除在 `delete-relation.ts:314-324` 拒绝含未结束草稿的组） | 预期：不留孤儿草稿 → 实际：删组后编辑端 404，草稿无法收口 | S5 增加"删除前检查 activeDrafts，有草稿则拒绝并列出" | 🟡 |
| R7 | 需求缺口 | CLI 用户 | E | 跨 cache/KB/树/向量/FTS 的**部分失败语义**未定义（现有实现用 `vectorRemoved:false` + `reason`） | 预期：用户能判断删干净没有 → 实际：只返回 ok:true 会掩盖半删状态；M-08 无判定口径 | 定义逐项状态 `{relations,kb,tree,vectors,fts}`；失败项置 false 且 `ok:false` 或 `degraded:true` | 🟡 |
| R8 | 需求冲突 | Agent | G | `ki_manage_index_list` 被特意标为 `needsGlobal` 以保证跨 scope 快照一致（`mcp-http.ts:769`），而 `ki_scope_list` 走只读快车道（`:766-767`）；D6-1 把 `topGroups` 并入后者 | 预期：合并后仍有一致快照 → 实际：要么 scope 列表被导入阻塞（丢掉"下拉不挂起"的设计），要么 `topGroups` 在导入期是中间态 | 明确取舍并写入需求（建议：`ki_scope_list` 保持只读通道，`topGroups` 标注 best-effort；若要求强一致则需单独工具，但与 D6-1 冲突） | 🟡 |
| R9 | 角色对齐 | AI Agent | G | `ki_group_delete`（MCP，仅空节点）与 `ki group delete`（CLI，可级联）**同名不同能力**，需求未要求更新工具描述与错误出路 | 预期：AI 失败后知道怎么改 → 实际：AI 可能反复重试或误报"不能删组"（G5 在 AI 侧失效） | 工具描述与拒绝信息显式给出 `ki group delete <path> --yes`；并说明 MCP 只删空节点 | 🟡 |
| R10 | 验收不可达 | 验收者 | B | `manage-index --action list-scopes` → `ki scope list` 的输出形状不同：`{total, scopes:[{scope,topGroups,registered,initialized}]}` vs `{count, scopeMode, vectorAvailable, scopes:[{scope,kb,vector,registered,wikiCount,...}]}`（`manage-index.ts:160-190` / `scope.ts:149-156`） | 预期：§5.1 映射可直接照做 → 实际：字段集与 `total/count` 都变了，脚本与文档样例需同步改，需求未标注 | §5.1/§5.4 标注形状变化；S4 更新 `docs/backup-restore.md` 等 jq 片段 | 🟡 |
| R11 | 验收不可达 | 脚本/用户 | H | RENAMED 提示粒度未定义：`manage-index` 有 3 个 action，各自应映射到不同新命令；`query-group --subtree` 需提示"改位置参数" | 预期：报错可直接复制正确命令 → 实际：泛化提示"请用 ki group"仍然不会改（G5 打折扣），M-07 只校验"含 ki group" | §5.1 增补 RENAMED 映射表；M-07 改为逐 action 抽样 4 条 | 🟡 |
| R12 | 验收不可达 | 验收者 | D/J | M-06 判据写"持锁时**任意入口**均返回 `SCOPE_OPERATION_BUSY`"，但 `list` 是读入口、走读通道；M-09 的"抽样 8 条"未列举 | 预期：判据可机械执行 → 实际：读入口返回 BUSY 不合理，8 条无清单则无法验收 | M-06 限定"写入口"；M-09 直接列 8 条错误出口 | 🟡 |
| R13 | 需求缺口 | 维护者 | S4 | 文档改名漏了内链：`README.md:375` 链接 `docs/manage-index.md`，改名 `docs/group.md` 后 M-11 的 grep 抓不到 | 预期：文档全绿 → 实际：README 挂死链 | S4 增加内链检查（`grep -rn "docs/manage-index.md"`）；M-11 判据补一项 | 🟡 |
| R14 | 边界覆盖 | CLI 用户 | F | D7 硬删的异常分支未定义：`sourceDir` 不存在 / 是相对路径 / 目标是目录（EISDIR）/ 权限不足（EACCES） | 预期：硬删稳定 → 实际：`realpath` 抛错会让整条删除失败，或 `unlink` 目录报错被吞进 `reason` 而 `ok` 仍为 true | S10/S11 补：realpath 失败→跳过并提示；EISDIR/EACCES→计入失败且 `ok:false` | 🟡 |
| R15 | 术语一致 | 实现者 | 全场景 | "wiki 目录"、"wiki 源目录"、"`source.dir` 下同名目录"三种叫法混用（§5.3 / D7 / G3） | 预期：一个概念一个名字 → 实际：实现者需回读 `wiki-sync.ts` 才能确认它们是同一路径 | 统一为"wiki 目标目录（= `resolveWikiTarget(scope)`）"，首次出现处给定义 | 🟢 |
| R16 | 需求缺口 | CLI 用户 | C | 删子组后是否级联清理空父节点未声明（现有 `removeGroupNode` 会删空父节点，`delete-relation.ts:488-515`） | 预期：只删目标 → 实际：删 `A/B` 后 `A` 也消失，用户会认为"多删了" | 明确行为并在预览里体现（"将同时清理空父节点 A"或"保留空父节点"） | 🟢 |

**统计**：🔴 3 个 / 🟡 11 个 / 🟢 2 个。

---

## 6. 结论

### 整体评估

- 推演覆盖：7 个角色 / 10 个场景 / 6 个需求质量维度
- 结论：**⚠️ 有条件通过**（无 🔴 则通过；当前 3 个 🔴 必须先补进需求）

### 评审结论

| 条件 | 结论 |
|------|------|
| 存在 ≥1 个 🔴 阻断 | ❌ 不通过（R1/R2/R4） |

> 推演通过（未实际执行）：以上为基于文档与源码直读的推理结论，非执行性证据。

### 下一步建议

1. 先补 3 个 🔴：旧删组实现的下线范围（R1/R2）、create 补全规则（R4）。
2. 再补 🟡 中的契约类：预览 schema（R3）、FTS（R5）、部分失败语义（R7）、`ki_scope_list` 调度语义（R8）。
3. 修订后做增量推演（仅重推 R1-R8 关联场景）。
4. 进入 `design-craft`；涉及锁/提交窗口/并发交错（S5/S6）的部分，建议后续用 e2e-testing 获取执行性证据。

---

## 7. 增量推演（R1/R2/R4 修订后）

> 推演时间：2026-10-19（第二轮）
> 修订内容：G1 判据、S1/S2/S3、§5.4 的 `ki_group_delete`、新增 M-18/M-19

### 7.1 复推 R1（旧删组实现）

| 检查点 | 结论 |
|---|---|
| 旧 core 是否有归宿 | ✅ 明确迁出到 `src/lib/group-delete.ts`，`delete-relation.ts` 只保留 relation 级 |
| daemon RPC 是否下线 | ✅ `delete-group` / `manage-delete` 在 S2/S3 显式移除，S3 改名 `group-delete` |
| 是否还有第三条路径 | ⚠️ 首轮漏了 `executeManageDeleteEmpty`（MCP 空节点删除）—— 已补：复用同一 core + `requireEmpty: true` |
| 测试是否仍直连旧实现 | ✅ S2 点名 3 个测试文件改指向新 core |

### 7.2 复推 R2（`executeManageDelete*`）

| 检查点 | 结论 |
|---|---|
| 调用方是否清空 | ✅ 唯一调用方 `daemon-dispatch.ts:60` 的 `manage-delete` 被移除 |
| 连带死代码 | ✅ 首轮漏了 `executeListScopes`（`topGroups` 并入 `executeScopeList` 后无调用方）—— 已加入 S2 |
| `cascadeDeleteGroupData` | ✅ 随 `executeManageDeleteLocal` 一并删除 |

### 7.3 复推 R4（create 补全）

| 检查点 | 结论 |
|---|---|
| 规则是否唯一 | ✅ §5.2 S3 与 §8 S3 两处均写明"禁用 `resolveGroupPath` 语义补全" |
| 验收是否可判定 | ✅ M-19：父路径不存在必须报错并给候选，不得挂到近似组 |
| 与 delete 是否同口径 | ✅ S1 + S3 均要求精确匹配 |

### 7.4 结论

- 3 个 🔴 已闭合；增量推演新发现 3 个关联缺口（`executeManageDeleteEmpty` 复用、core 归属、`executeListScopes` 死代码），均已在同轮补入需求。
- 剩余 🟡 11 条未处理（R3/R5-R14），不阻断进入设计，但建议在 `design-craft` 前至少补 R3（预览契约）、R5（FTS）、R7（部分失败语义）、R8（`ki_scope_list` 调度语义）。
- 证据性质：推演结论（未实际执行）。

---

## 8. R9 结案（D6-3，方案 B）

- **决策**：保留 NEG-15 —— MCP 只删空节点；因与 CLI `ki group delete`（级联）能力不等价，工具名改为 **`ki_group_delete_empty`**，不再同名。
- **关闭项**：R9（同名不同能力）。
- **连带修改**：§1 D6/D6-2/D6-3、§5.4 映射与说明、M-13、M-15、§6.1 skill 清单。
- **新增约束**：名字区分了能力，但工具描述与拒绝信息仍须给出 CLI 出路（`ki group delete <path> --yes`），否则 AI 会把"能力受限"误读为"不能删组"。
- 证据性质：决策记录（推演结论，未实际执行）。

---

## 9. 第三轮推演（增量，requirement v5）

> 推演时间：2026-10-19
> 触发：D6-3（`ki_group_delete_empty`）落地后复验，并检查新命名是否引入新缺口
> 结论：**无新增 🔴**；新增 3 🟡 / 1 🟢；R1/R2/R4 复验通过

### 9.1 上轮 🔴 复验

| # | 检查点 | 结论 |
|---|---|---|
| R1 | 旧 core 是否只剩一套 | ✅ `src/lib/group-delete.ts` 唯一 core，`delete-group` RPC 改名 |
| R2 | `executeManageDelete*` / `manage-delete` | ✅ 已在 S2 明确删除 |
| R4 | create 是否禁补全 | ✅ §5.2 S3 与 §8 S3 双处一致 |
| R9 | 同名不同能力 | ✅ D6-3 已用 `_empty` 后缀区分 |

### 9.2 新发现

| # | 类型 | 角色 | 场景 | 问题描述 | 功能影响（预期 → 实际） | 建议 | 严重度 |
|---|------|------|------|---------|------------------------|------|:---:|
| N1 | 需求缺口 | AI Agent | G | `src/lib/chat/prompt-config.ts:117` 的破坏性工具标签仍是「删除 Group 节点**及其下内容**」，与 `ki_group_delete_empty`（仅空节点）矛盾；§6.1 未列此项 | 预期：AI 从标签理解能力边界 → 实际：标签暗示可级联，AI 会尝试删非空组并反复失败 | §6.1 增加「chat 工具标签」一行：改为「删除空 Group 节点（非空请用 CLI）」 | 🟡 |
| N2 | 需求缺口 | 维护者 | I | `skills/agents-md-init/SKILL.md:81-82` 写的是 `mode: "full,depth=4"` / `mode: "hot,hot_count=3"`，但 `depth` / `hot_count` 是独立参数；未知 mode 片段被静默丢弃（`query-group.ts:613-619`） | 预期：AGENTS.md 缓存 3 条热门 → 实际：`hot_count=3` 被忽略，按默认 5 条渲染，且无任何报错 | S4 不只改名，还要修正为 `mode: "full", depth: 4` / `mode: "hot", hot_count: 3` | 🟡 |
| N3 | 需求缺口 | CLI 用户 | F | 文档级删除现有 `activeDrafts` 守卫（`delete-relation.ts:139-147`），但 D7/S1 只要求组级 core 继承守卫 | 预期：有草稿时拒绝删除 → 实际：硬删源文件后草稿 `baseRevision` 永远无法 finish，只能手工清 | S1/D7 补「文档级删除同样检查 activeDrafts，有草稿则拒绝并指引 cancel/finish」 | 🟡 |
| N4 | 验收不可达 | 验收者 | 全场景 | M-18 用符号名 grep（`executeDeleteGroupLocal`）判定「只有一套实现」，core 迁到 `group-delete.ts` 后符号很可能改名，grep 恒为 0，判据失去鉴别力 | 预期：能证伪"第二套实现" → 实际：改名即可让判据通过，无法证明唯一性 | 改为断言 `daemon-dispatch.ts` 无旧 RPC、`src/lib/group-delete.ts` 为唯一导出 core、其他文件不再直接 `rmSync(kbGroupDir)` | 🟢 |

### 9.3 未闭环项（沿用上轮结论）

- 🟡 R3 预览契约、R5 FTS、R6 组级 activeDrafts、R7 部分失败语义、R8 `ki_scope_list` 调度语义、R10 输出形状、R11 RENAMED 粒度、R12 M-06/M-09 判据、R13 文档内链、R14 D7 异常分支。
- 🟢 R15 术语、R16 空父节点。
- 第三轮新增：N1 / N2 / N3（🟡）、N4（🟢）。

### 9.4 总账

| 轮次 | 🔴 | 🟡 | 🟢 |
|---|:---:|:---:|:---:|
| 第一轮 | 3 | 11 | 2 |
| 第二轮（增量） | 0 | 0（闭合 3 🔴，新发现 3 个关联缺口已并入） | 0 |
| 第三轮（增量） | 0 | +3 | +1 |
| **当前未闭环** | **0** | **13** | **3** |

> 证据性质：推演结论（基于文档与源码直读，未实际执行）。

---

## 10. N1 / N2 / N3 结案（2026-10-19）

| # | 落点 | 修法 |
|---|---|---|
| N1 | §5.4 说明、M-13 | `prompt-config.ts:117` 标签改为「删除空 Group 节点（非空请用 CLI）」，M-13 增标签一致性断言 |
| N2 | §6.1 ①、M-17 | `agents-md-init` 除改名外修正参数：`mode: "full", depth: 4` / `mode: "hot", hot_count: 3`；M-17 增参数正确性断言 |
| N3 | §5.3 D7 注、S1、M-14 | 文档级删除保留 `activeDrafts` 守卫（`delete-relation.ts:139-147`），命中则拒绝并提示 cancel/finish；M-14 增该场景 |

未闭环：🟡 10 条（R3/R5/R6/R7/R8/R10/R11/R12/R13/R14）、🟢 3 条（R15/R16/N4）。

---

## 11. 第四轮推演（增量，requirement v7）

> 推演时间：2026-10-19
> 触发：N1/N2/N3 落地后复验，并检查 CLI / MCP 形态是否对齐
> 结论：**无新增 🔴**；新增 2 🟡 / 2 🟢；R1/R2/R4/R9/N1/N2/N3 复验通过

### 11.1 上轮修补复验

| # | 检查点 | 结论 |
|---|---|---|
| N1 | chat 标签与 `_empty` 能力一致 | ✅ §5.4 注 + M-13 已覆盖 |
| N2 | skill 参数独立传参 | ✅ §6.1 ① + M-17 已覆盖 |
| N3 | 文档级草稿守卫 | ✅ §5.3 D7 注 + S1 + M-14 已覆盖 |
| 全局 | 修补是否引入新冲突 | ✅ 未见与 D3/D4/D6-3 冲突 |

### 11.2 新发现

| # | 类型 | 角色 | 场景 | 问题描述 | 功能影响（预期 → 实际） | 建议 | 严重度 |
|---|------|------|------|---------|------------------------|------|:---:|
| P1 | 需求缺口 | AI Agent | A | CLI `create` 有 `--parents`，MCP `ki_group_create` 只有 `path`（`src/lib/mcp-tools/manage-index.ts:18-22` 原 schema 也只有 scope/name/parent）；而 S3 又禁用了语义补全 | 预期：AI 能一次建立 `A/B/C` → 实际：父级缺失直接失败；AI 只能逐层调用，且失败时无 `parents` 出路（G5 在 MCP 侧打折） | 二选一：① `ki_group_create` 增 `parents?: boolean` 与 CLI 对齐；② 明确不支持，并在错误里提示"逐层创建"或走 CLI | 🟡 |
| P2 | 需求缺口 | 脚本 / CI | B | `ki group list` 承接 `query-group` 的 `{ok, scope, output}` 纯文本输出，**没有 `--json`**；原 `manage-index --action list-scopes` 的结构化输出只被 `ki scope list` 取代，而后者只有 `topGroups`（仅顶层名） | 预期：脚本能拿到全部组路径 → 实际：只能解析渲染文本；`ki scope list` 只给顶层名，深层组无可用的结构化枚举入口 | `ki group list --json` 返回 `{ok, scope, groups: string[]}`（或 `{tree}`），复用结构遍历；或明确"脚本请用 export/直接读 group-index" | 🟡 |
| P3 | 验收不可达 | 验收者 | I | `ki_group_create` 的 `createdScope` 语义是 `agents-md-init` 的硬依赖，但 M-15 只校验 `path` 入参与 `name`+`parent` 被拒，未校验自动建 scope | 预期：全新 scope 上初始化 AGENTS.md 成功 → 实际：实现若丢掉 `ensureScopeDir`，验收全绿但 skill 在第一步就失败 | M-15 增加断言：全新 scope 调用 create 返回 `createdScope: true` 且目录被建 | 🟢 |
| P4 | 术语一致 | 实现者 | G | §5.2 S8 写"MCP 工具名与 CLI 同族（`ki_group_*`）"，但 `ki_group_delete_empty` 在能力上无 CLI 对应物，措辞只覆盖命名 | 预期：读者能区分"命名同族"与"能力等价" → 实际：需结合 D6-3 才能正确理解 | S8 补一句"命名同族 ≠ 能力等价，能力边界见 §5.4 / D6-3" | 🟢 |

### 11.3 未闭环项

- 🟡 12 条：R3、R5、R6、R7、R8、R10、R11、R12、R13、R14 + P1、P2。
- 🟢 5 条：R15、R16、N4、P3、P4。
- 第四轮无 🔴，且新发现均属"形态/便利性"而非正确性（不像前三轮那样涉及第二实现或数据副作用）。

### 11.4 收敛评估

| 轮次 | 🔴 | 新增 🟡 | 新增 🟢 | 性质 |
|---|:---:|:---:|:---:|---|
| 第一轮 | 3 | 11 | 2 | 正确性 / 安全 / 一致性 |
| 第二轮 | 0 | 0（补 3 个关联缺口） | 0 | 旧实现收尾 |
| 第三轮 | 0 | 3 | 1 | 文案 / 参数 / 守卫 |
| 第四轮 | 0 | 2 | 2 | CLI ↔ MCP 形态对齐 |

> 趋势：阻断项已连续三轮为 0；新发现从"数据正确性"降级为"接口形态"。建议**冻结需求**，把 P1/P2 作为设计阶段的首批决策点（`ki_group_create.parents`、`ki group list --json`），其余 🟡 随设计一并收口。
> 证据性质：推演结论（基于文档与源码直读，未实际执行）。

---

## 12. P1 结案 + 参数形态最终拍板（2026-10-19）

- **用户拍板**：全族一律取消 `--parent` / `--name` / `--parents`；MCP 同样不接受 `name` / `parent` / `parents` 字段。组的位置只由单一路径 `path` 表达。
- **P1 结案**：不采用"给 MCP 加 `parents?: boolean`"，改为**嵌套创建 = 逐层调用**；父级缺失时报错 + 候选 + "先创建父组"指引。
- **连带修改**：§5 目标表面（`create` 去掉 `--parents`）、§5.2 S3、§5.4 全局参数原则与 create 行、§1 D6-2、M-15、§9 D6-2。
- **新增验收点**：CLI 不识别 `--parent` / `--name` / `--parents`；MCP schema 只有 `{scope, path}`。
- **未闭环**：🟡 11 条（R3/R5/R6/R7/R8/R10/R11/R12/R13/R14 + P2）、🟢 4 条（R15/R16/N4/P3/P4 中的 P3/P4 仍开放）。
- 证据性质：决策记录（推演结论，未实际执行）。
