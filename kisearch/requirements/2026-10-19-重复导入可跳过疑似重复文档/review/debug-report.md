---
id: REQ-20261019-002
document_type: review
created: 2026-10-19
updated: 2026-10-19
version: 1
tags: [feat, fix]
author: AI
---

# Debug：疑似重复误判（group 吸收了路径前缀）

## 现象

用户导入时 Group 选 `langchain`，预检面板报「45 篇内容与库中已有文档重复 / 继续导入会按当前策略处理」，但每条的「库中已有」落点（如 `langchain/stages/1-入门与模型层/lessons` + `01-LangChain是什么`）与本次文件的目标落点**完全相同** —— 按语义这是幂等更新，不该算「来源路径不同」。

## 证据链

| # | 证据 | 来源 |
|---|---|---|
| 1 | 库中该 scope 存在三条 `01-LangChain是什么`：`langchain/stages/…`（sourcePath 带 `langchain/` 前缀）、`stages/…/lesson-01-…`、`stages/…/01-…` | 读 `.ki-data/langchain/.relations/**/cache.json` |
| 2 | 旧判据：`hit.existingSourcePath === rel` 才算同源；本次 rel=`stages/1-入门与模型层/lessons/01-LangChain是什么.md`，命中条 sourcePath=`langchain/stages/…/01-…md` ⇒ 不等 ⇒ 判重复 | `duplicate-index.ts:95`（修复前） |
| 3 | `resolveGroupForSource('langchain', 'stages/…/01-….md')` = `langchain/stages/1-入门与模型层/lessons` = 库中 `existingGroup` ⇒ **落点相同** | `import.ts` 落点规则 |
| 4 | 真实数据复跑（172 篇暂存目录、103 篇参与比对）：**不传 group → matched=44；传 group → matched=0** | `temp/verify-dup-group-fix.cjs` |

## 根因树

```text
{预检把 44 篇幂等更新报成「疑似重复」}
  ▼
{判据只比 sourcePath（相对 sourceDir 的裸路径）}
  ▼
{「同一篇文档」被等同于「来源路径字符串相同」，忽略了落点 = group + rel}   ← 根因（设计遗漏）
  ├─ 上次：sourceDir 选父目录 → rel = `langchain/stages/…`、落点 `langchain/stages/…`
  └─ 本次：sourceDir 选 `langchain` 子目录 + 显式 group=`langchain` → rel = `stages/…`、落点仍 `langchain/stages/…`
  ▼
{REQ-20261019-002 引入判据时未覆盖该形态}
```

**直接原因**：`collectDuplicateHits` 的比较键是裸 `rel`，而不是解析后的落点。
**根本原因**：判据设计把「来源路径」当唯一标识，未考虑 group 会吸收路径前缀；且预检接口根本没接收 `group`，从源头拿不到落点信息。

## 修复（最小改动）

| 文件 | 变更 |
|---|---|
| `src/lib/import-path.ts`（新增） | 落点推导单一实现：`resolveGroupForSource` / `deriveGroupPath` / `relationOfPath`（只依赖 `node:path`，避免与 `import.ts` 循环） |
| `src/lib/duplicate-index.ts` | ① 索引从 `Map<hash, Hit>` 改为 `Map<hash, Hit[]>`（库中同内容多副本时不再只留第一条）；② 判据改为「**任一条**同 sourcePath **或** 同落点（group+relation）」⇒ 视为同篇，不算重复；③ 提示对象按 group/relation 排序取第一条，输出稳定 |
| `src/lib/import.ts` | 删除本地 `resolveGroupForSource`（改由 `import-path.ts` 提供）；「跳过重复」调用传 `group` |
| `src/lib/import-preflight.ts` | `preflightImportDuplicates` 新增 `group?`，透传判据 |
| `src/lib/mcp-http-api.ts` | `/api/import/preflight` 接收 `group`（含 `..`/反斜杠/绝对路径拒绝） |
| `web/src/api/httpApi.ts` + `web/src/pages/ImportPage.tsx` | `preflightImport` 传**当前表单**的 Group（与 `runImport` 同源） |

## 验证

| 项 | 结果 |
|---|---|
| 真实数据（103 篇比对） | 不传 group **matched=44** → 传 group **matched=0** ✅ |
| 新增单测 | `group 吸收路径前缀时不算重复` 2 例：落点相同不重复（且不传 group 仍误报，锁住修复必要性）、落点不同仍报重复（防止放宽成"永不重复"） |
| `test/import-preflight.test.ts` | 5/5 ✅ |
| `test/lib.test.ts` | 37/37 ✅ |
| web 单测 / tsc / build | 442/442 · exit 0 · exit 0 ✅ |
| 后端 tsc | 仅 2 个既存错误（`import-budget.ts:78`、`mcp-http.ts:65` 无关文件） |

## 影响面

- 「疑似重复」判据（预检 + 导入侧「跳过重复」）都随之收紧：**落点相同不再提示**——这正是期望语义（导入会覆盖同一篇，不会新建副本）。
- 与「同名冲突」（relation 名相同、内容不同）是两个独立概念，未受影响。
- 旧调用方（不传 `group`）行为保持不变（仍按裸 rel 比较），故 CLI 直连导入不在本次修复范围——若要一致，需在 CLI 侧同样透传 `--group`（当前 `import.ts` 已传，CLI 路径已覆盖）。

---

## 补充（同日）：报告显示「已覆盖」但实际零写入

**现象**：用户导入成功后，结果面板显示 `02-Models模型层 → 02-Models模型层（已覆盖）`，但知识库原文没变。

**证据链**

| # | 证据 | 来源 |
|---|---|---|
| 1 | 任务台账：`files.unchanged=103`（全部内容未变）、`conflicts=20` | `.ki-data/.ki-tasks/ee8bbe4d` |
| 2 | `conflicts.push({action:'overwrite'})` 在 `import.ts` 冲突判定阶段；`unchanged` 跳过在其后（更晚），conflicts 不回改 | `import.ts` 代码顺序 |
| 3 | 库中存在两份同名文档：`langchain/stages/…`（24069 字符，含 `::: code-group` + TS 块）与 `stages/…`（20172，单 Python） | 两份 local KB 对比 |
| 4 | 用户看到的是 `stages/…` 那份旧副本 | 截图内容与旧版逐字对应 |

**根因**：`conflicts[].action` 表达「按策略将如何处理」，不是「实际做了什么」。增量导入判定内容未变后跳过写入，但冲突明细仍保留 `overwrite`，UI 据此渲染「已覆盖」。

**修复**

- `ImportConflict` 新增 `unchanged?: boolean`；`handleDirectImport` 在「内容未变」跳过分支持回写该标记（从后往前找同 path 的 overwrite 条目）
- `task-snapshot` 透传、`task-registry` 卫生化、前端类型同步
- 两处文案：导入页「同名处理结果」→「内容未变，跳过重算（原文未改动）」；任务详情冲突明细同上

**验证（真实链路）**

| 项 | 结果 |
|---|---|
| CLI 导入（group=langchain，103 篇） | `files.unchanged=103`，`conflicts=45`，**其中 unchanged=45** |
| 任务台账 | `conflicts=20`（上限截断），**全部 unchanged=true** |
| 单测 | `task-snapshot` 13/13（新增 unchanged 透传）· web 443/443（新增详情文案区分） |
| 类型/构建 | 后端 tsc 仅 2 既存错误 · web tsc/build 绿 |

**遗留**：同名两份文档（`langchain/stages/…` 与 `stages/…`）未清理，属历史遗留，需用户确认后单独处理。
