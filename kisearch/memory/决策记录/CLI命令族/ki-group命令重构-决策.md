---
groupPath: 决策记录/CLI命令族
relation: ki-group命令重构-决策
exportedAt: "2026-10-19T14:52:53.266Z"
---
# ki group 命令重构 · 决策记录（2026-10-19，全部落定）

需求 REQ-20261019-005，需求包 `CodeWikiHub/kisearch/requirements/2026-10-19-ki-group命令重构/requirement.md`。推演：`review/scenario-rehearsal.md`。

## 拍板结论

- D1 命名 `ki group`，子命令 `create` / `delete` / `list`。`list` 承接原 `query-group` 全部能力，**不是纯路径枚举**。
- D2 `delete-relation` 只删 relation；删组一律 `ki group delete`。
- D3 删组 wiki **永不动**；`--to-trash` 与 `.ki/trash` 机制整体移除。
- D4 删组**绝不触碰 `source.dir`**。
- D5 **零兼容**：旧命令物理删除，仅 `bin/ki.mjs` RENAMED 提示；MCP 旧名不留别名。
- D6 MCP 工具改名：`ki_query_group`→`ki_group_list`、`ki_manage_index_create`→`ki_group_create`、`ki_manage_index_delete`→**`ki_group_delete_empty`**。
- D6-1 `ki_manage_index_list` 的 `topGroups` 并入 `ki_scope_list`（`ScopeEntry` 增字段），随后删除该工具及其 `SCOPE_LESS_TOOLS` / `needsGlobal` 特判。
- **D6-2 参数形态（全族）**：只接受单一路径 `path`；`--parent` / `--name` / `--parents` 与 MCP `name`/`parent`/`parents` **全部不保留**。create 只建单节点，父级必须已存在；嵌套创建=逐层调用；父级缺失报错+候选+"先创建父组"。
- **D6-3 MCP 删组能力边界（方案 B）**：保留 NEG-15（只删空节点），工具名带 `_empty`；描述须给出 CLI 出路。
- D7 文档级 `ki delete-relation -g -r`：源目录已配置且文件存在时**直接 `unlink`**；未配置/缺失不报错；`--input` 批量同样硬删；保留 `activeDrafts` 草稿守卫；删组仍零触碰。

## 关键事实与约束

- `ki_scope_list` 当前不返回 Group；`ki_manage_index_list` 独有 `topGroups`（仅顶层名）。
- `query-group`（`src/query-group.ts:988`）是评分 + 分区 + 语义兜底渲染器，被 chat 列入 `READ_MCP_TOOLS`。
- `resolveWikiTarget`（`src/lib/wiki-sync.ts:49-56`）优先返回 `source.dir` →“wiki 目录”与“`source.dir/<group>`”常为同一路径。
- D7 硬删前必须做 containment 校验：`realpath(文件)` 必须落在 `realpath(sourceDir)` 内；文档级 `activeDrafts` 守卫在 `delete-relation.ts:139-147`。
- **唯一删组 core**：从 `delete-relation.ts` 迁出到 `src/lib/group-delete.ts`；`executeManageDelete*` / `cascadeDeleteGroupData` / `manage-delete` 删除；`delete-group` RPC 改名 `group-delete`；MCP 空节点删除复用 core（`requireEmpty: true`）。
- create / delete **均禁用 `resolveGroupPath` 语义补全**。

## 目标表面

`ki group create <path>`、`ki group delete <path> [--yes]`（无 `--yes` 仅预览）、`ki group list [<path>] [--mode] [--depth] [--groups]`。

## 语义

S1 delete 精确匹配；S2 拒绝空/根路径；S3 create 只建单节点、父必须存在、禁补全、无 parent/name/parents；S4 位置参数与 `--groups` 互斥；S5 统一写锁 + 迁移守卫；S6 删除走 `withMetadataCommitSync`；S7 删组在 wiki/`source.dir` 侧零写操作；S8 MCP 名同族无别名（能力边界见 D6-3）；S9 拒绝 `.`/`..`；S10 文档级删源文件做 realpath containment；S11 未配置源目录不报错。

## skill / 文档同步（按 S3 之后执行）

- 仓库内 skill 3 文件 34 处：`skills/agents-md-init/SKILL.md`（14，另需修正 `:81-82` 非法参数：`mode:"full,depth=4"`/`mode:"hot,hot_count=3"`）、`AGENTS-template.md`（15）、`skills/ki-search/SKILL.md`（5，第 167 行语义重写）。
- `rules/ai-codekb-memory.md` 2 处；`src/lib/chat/prompt-config.ts:117` 标签改为“删除空 Group 节点（非空请用 CLI）”；docs 15 文件 111 处 + README 13 处 + `bin/ki.mjs` 帮助。
- 仓库外用户级 skill 9 个 / 17 文件 / 72 处。`~/.codebuddy/skills/agents-md-init/` 实测不存在。

## 实施顺序

S1 止血（删 trash、core 迁 `src/lib/group-delete.ts`、文档级硬删 + containment + 草稿守卫、`delete-relation` 漏 `-r` 报错）→ S2 收敛 core（删内联副本 + `executeManageDelete*` + `cascadeDeleteGroupData` + `executeListScopes` + `manage-delete` RPC）→ S3 新命令 `src/group.ts` + 物理删旧入口 + RENAMED + MCP/RPC 改名 + `ki_scope_list.topGroups` + 单一路径入参 → S4 按清单清扫 + 重新 `ki import`。
