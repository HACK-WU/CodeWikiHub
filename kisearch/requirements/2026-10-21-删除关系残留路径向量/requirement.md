---
id: REQ-20261021-002
feature: 删除关系后残留 ki-relation 路径向量
status: 实施中
created: 2026-10-21
updated: 2026-10-21
version: 2
tags: [bug, vector]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：删除关系后残留 ki-relation 路径向量

- **来源**：2026-10-20/21 写入页 debug 的清理环节 —— 每次 `ki delete-relation` 后执行 `ki doc list` 仍剩 1 条 `tag=ki-relation` 的记录，需手工 `ki doc delete` 补删。当日复现 3 次（scope `ui-debug-write` 1 次、`ui-write-check` 2 次）。
- **分析口径**：debug 顺带发现的既有缺陷（`review/challenge-report.md` Q10），未被当日修复覆盖。
- **证据声明**：`🟢` = 代码直读 + 实测；`🟡` = 推理未验证。

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | `delete-relation` 只按 `relation.memoryIds / memoryId`（**内容向量**的 docId）删除，路径向量（`tag=ki-relation`）不在其中 | `src/delete-relation.ts:236` `deleteMemMemory(scope, relation, rel?.memoryIds ?? ...)` 🟢 |
| 2 | 路径向量**故意不回写 cache**，注释明确"cache 只记内容向量 docId" | `src/sync-relation.ts:811`「relation 路径向量（ki-relation），不回写到 cache」🟢 |
| 3 | 兜底 `search` 未必能补上：路径向量的内容是**纯 relation 名**（`buildRelationContent` 已退化为 `return relationText`），语义检索不保证命中，且命中判定依赖 similarity 阈值 | `src/lib/path-vectorize.ts:69`、`src/delete-relation.ts:278-300` 🟢/🟡 |
| 4 | **好消息**：`buildRelationContent` 现在不掺 group ⇒ 路径向量 docId 可由 `(relation, scope, 'ki-relation')` **重算**，无需回写 cache 也能精确删除 | `generateDocId(text, scope, tag)` 🟢 |
| 5 | 风险点：历史版本曾让 group 参与路径向量文本，那些文档的 docId 与今天重算值不同，必须按"历史形态"再算一次或提供跳过开关 | 🟡 需在实现时用 `git log` 确认旧 `buildRelationContent` 形态 |

## 2. 现象与复现

### 2.1 复现步骤（本机实测）

```bash
# 1) 写入
ki sync-relation -s ui-write-check --relation 必填走查文档 --module-info "# x" --no-vector

# 2) 删除（返回体自述已删干净）
ki delete-relation -s ui-write-check -g ui-write-check -r 必填走查文档
# → {"deleted":true,"cacheRemoved":true,"kbRemoved":true,"memRemoved":true,"fullTextRemoved":true}

# 3) 复核：仍有 1 条向量
ki doc list -s ui-write-check
# → {"count":1,"docs":[{"tag":"ki-relation","content":"必填走查文档"}]}
```

### 2.2 残留形态

- `tag = ki-relation`（路径向量），`content` = relation 名。
- `delete-relation` 的返回体显示 `memRemoved: true`，**语义上是"内容向量已删"**，但调用方通常理解为"该关系的向量都没了"——属**误导性成功**（正是本项目"反感静默失败"的红线类型）。

## 3. 需求描述

- **R1 精确删除路径向量**：`delete-relation` 在按 `memoryIds` 删除内容向量之外，**必须**按可重算 docId 删除路径向量：`generateDocId(buildRelationContent(relation, group), scope, 'ki-relation')`。
- **R2 幂等**：路径向量不存在（NOT_FOUND）视为成功，不报错、不计入失败（沿用 `vectorDelete` 既有约定）。
- **R3 历史兼容**：若存在"group 曾参与路径向量文本"的历史文档，需按历史形态（如 `relation + group` 的旧拼接方式）再算一次 docId 一并删除；若历史形态无法穷举，提供 `--no-relation-vector` 跳过开关，避免误删。
- **R4 孤儿扫描与清扫**：新增诊断能力（建议 `ki doctor --orphan-vector` 或 `ki vector orphans`）：扫描 `tag=ki-relation` 的向量，与 `relations-cache` 中的 `(scope, group, relation)` 集合比对，输出孤儿清单；`--yes` 时清理（默认只报告）。
- **R5 返回体可读**：`delete-relation` 返回体区分 `denseRemoved`（内容向量条数）与 `relationVectorRemoved`（路径向量布尔/条数），不再用一个 `memRemoved` 概括。
- **R6 级联一致**：`ki group delete`（整组删除）与导入删除候选（`import-prune`）走的是同一套删除逻辑，须同样覆盖路径向量；实现时抽取共用函数，避免三处各写一遍。

## 4. 验收标准

| # | 用例 | 期望 |
|---|---|---|
| A1 | 上述复现步骤 1→2→3 | `doc list` 中该 relation 的 `ki-relation` 记录为 **0**；`count` 归零 |
| A2 | 连续删除同一个（已删的）relation | 返回 `ok:true`，不因 NOT_FOUND 报错；向量仍为 0 |
| A3 | `--no-vector`（FTS-only）写入后删除 | FTS 记录与路径向量都清空（当前路径向量是否在 FTS-only 模式下写入需先确认） |
| A4 | 删除组（`ki group delete --yes`）后扫描 | 该组下所有 relation 的路径向量均为 0 |
| A5 | 人为造 3 条孤儿路径向量 → `doctor --orphan-vector` | 报告准确列出 3 条；`--yes` 后清空；不误删仍在册的 relation |
| A6 | 历史文档（group 参与过向量文本）删除 | 若 R3 已实现：一并清除；若走 `--no-relation-vector`：跳过且返回体说明 |

## 5. 影响面

| 位置 | 影响 |
|---|---|
| `src/delete-relation.ts` | 删除清单增加路径向量；返回体字段扩展（R5） |
| `src/lib/group-delete.ts` | 整组删除需复用同一函数（R6） |
| `src/lib/import-prune.ts` / `import.ts` | 导入删除候选与同名覆盖路径是否同样残留，需一并核查 |
| `src/lib/vector-client.ts` | 复用 `vectorDelete`；确认批量上限与 NOT_FOUND 幂等语义 |
| `src/lib/path-vectorize.ts` | `buildRelationContent` 作为 docId 计算入口（R4 的比对基准） |
| 测试 | 新增 `test/delete-relation-relation-vector.test.ts`；既有 `delete-relation-wiki.test.ts` 不应回归 |

## 6. 未决问题（待设计阶段拍板）

1. **是否顺便清理历史孤儿**：全库扫描并自动删除有风险（误删无法恢复），倾向"先只报告 + 手工 `--yes`"。
2. **历史 docId 形态**：需要用 `git log -L` 查 `buildRelationContent` 的旧实现（是否曾拼接 group），决定 R3 的具体算法；穷举不到就只做"新写入的精确删除 + 孤儿扫描兜底"。
3. **返回体字段命名**：`relationVectorRemoved` vs `pathVectorRemoved`；与既有 `memRemoved` / `fullTextRemoved` / `kbRemoved` 命名风格对齐。
4. **FTS-only 模式是否写路径向量**：本次未验证（🟡）。若 FTS-only 不写 dense 路径向量，则 A3 的期望要相应调整——实现前必须先确认，否则测试会写错。

---

## 7. 实施进度（2026-10-21）

| 需求 | 状态 | 落地位置 |
|---|---|---|
| R1 精确删除 | ✅ | `src/delete-relation.ts::deleteRelationVector`：候选 docId = `generateDocId(buildRelationContent(relation, group), scope, 'ki-relation')` + 历史无 keywords 形态 `generateDocId(\`${relation} | Group: ${group 空格化}\`, scope, 'ki-relation')`，批量 `vectorDelete` |
| R2 幂等 | ✅ | 未命中视为"本就不存在"，不写 reason、不阻断；重复删除 `ok:true` |
| R3 历史兼容 | ⚠️ 部分 | 覆盖"无 keywords"历史形态 + **tag 精确检索兜底**（`tags:['ki-relation']` + 只认以 relation 名开头的 content）；带 keywords 的更早形态未覆盖（该机制已废弃，风险低），未加 `--no-relation-vector` 开关 |
| R4 孤儿扫描 | ❌ 未做 | `ki doctor --orphan-vector` 未实现（历史遗留孤儿仍需手工 `ki doc delete`） |
| R5 返回体可读 | ✅ | 新增 `relationVectorRemoved` / `relationVectorDeleted` / `relationVectorReason` 三个字段，不再用一个 `memRemoved` 概括 |
| R6 级联一致 | ⚠️ 部分 | `group-delete` **原本就有** ki-relation 清扫（`vectorListAuxDocsByGroups` + 跨组共享保护），无需改动；`import-prune` / 导入同名覆盖路径未核查 |

### ★ 实施中新发现的两条必要约束

1. **`ki-relation` 的 docId 跨组共享**：docId = `sha256(relation 名 + scope + tag)`，不含 group。因此删除单个 Relation 前必须确认**没有其他组持有同名 relation**，否则会误删兄弟组的路径向量。实现里先扫 `cache.groups`（此刻当前条目已 splice 掉）再决定删或保留，保留时把原因写进 `relationVectorReason`，并有用例覆盖。
2. **`deleteBySearch` 会顺手删掉路径向量**：它的"标题前缀"严格匹配对路径向量恒成立（其 content 就是 relation 名），导致职责重叠，且路径向量已被它删掉后 `deleteRelationVector` 命中不到 → 结果被误报成"未删除"。现已在兜底里 `if (r.tag === 'ki-relation') return false`，把路径向量清理收敛到单一函数。

### 验证

- 单测 `test/delete-relation-relation-vector.test.ts` **5/5**：可重算 docId 进入删除清单 / 跨组共享保留 / 未命中不报错 / 兜底失败只降级 / 历史形态靠检索兜底且不误删无关条目
- 回归 `test/delete-relation-wiki.test.ts` **4/4**
- 端到端（daemon 重启后）：写入 1 篇（向量层 `count: 2` = ki-relation + ki-search）→ `ki delete-relation` → 返回 `relationVectorRemoved: true, relationVectorDeleted: 1` → `ki doc list` **count 0**（修复前必剩 1 条 ki-relation）
