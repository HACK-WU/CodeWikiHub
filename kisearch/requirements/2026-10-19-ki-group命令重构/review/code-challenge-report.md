# 🎯 代码变更质疑报告：K-01~K-04 修复（第二轮）

> 质疑对象：`6131808` 之上的工作区改动（7 文件，+438/−41）
> 质疑时间：2026-10-20　调用方式：auto-review 接力（不做用户确认，存疑点标 `[待确认]`）
> 关联：`review/code-review.md` §7　·　设计阶段质疑另见 `review/challenge-report.md`

---

## 📋 复现流程确认

- **触发条件**：`ki import` 导入文档后执行 `ki group delete <组> --yes`
- **复现步骤**：① import 2 篇到 `验收` → ② `ki group delete 验收 --yes` → ③ `ki doc list`
- **期望**：删组后该组全部向量消失（含 `ki-relation` / `ki-path`）
- **实际（修复前）**：`doc list` 残留 2 条 `ki-relation`，`ki search a-01` 仍命中且带 `group: 验收`
- **确认状态**：✅ 真实 daemon 复现，修复后回归（`doc list` 0 条、`search` 空）

## 📊 变更概述

- **主张**：删组不再留下可检索的辅助向量幽灵，且不误删存活组仍在使用的共享向量
- **手段**：按向量文档的 `group` 标量字段枚举 aux → 求存活组引用集合做保护 → 与内容向量一并删除

## 🔍 质疑详情

### 质疑 #1：老数据的辅助向量没有 `group` 字段，这套清扫对历史幽灵无效

- 🏷️ **类型**：场景完备性 / 数据守恒（存量）
- 📍 **涉及**：`vector-client.ts:vectorListAuxDocsByGroups()`（filter 依赖 `group`）
- ❓ **质疑点**：`group` 是较晚才写入的元数据。早期写入的辅助向量没有该字段 → 永远枚举不到 → 历史 scope 删组仍残留幽灵，而 `auxFound: 0` 会让人误判「已清理」。
- 🔍 **验证方法**：在旧版本写入的 scope（或手工抹掉 group 字段）上删组，比对 `auxFound` 与实际残留
- ⚠️ **风险**：🟡 中（新数据无影响；`auxFound:0` 语义有「没有」与「查不到」二义）
- 📊 **置信度**：高（字段是新增的，历史文档不可能有）
- 💡 **建议**：已写入 `docs/group.md`「历史遗留需 `ki rebuild-vector`」并在 `known-issues.md` 登记。更强方案（无 group 时按已知 id + 内容反查）成本高且不可靠，不采纳。

### 质疑 #2：预览与执行在共享场景反向偏离（预览 5 / 实际 1），比修复前更刺眼

- 🏷️ **类型**：用户体验 / 契约一致性
- 📍 **涉及**：`planGroupDelete().willDelete.vectors` vs `executeLocal()` 的 `sharedContentKept/sharedKept`
- ❓ **质疑点**：修复前是「预览 2 / 执行 3」（少报）；共享场景变成「预览 5 / 执行 1」（多报 4）。方向反了，用户会以为删除没生效。
- 🔍 **验证方法**：同内容导入 A/B → 预览 → `--yes` → 对比 `vectors`
- ⚠️ **风险**：🟡 中（不误删，但像「删了没反应」）
- 📊 **置信度**：高（实测预览 3 / 执行 `deleted:1 sharedContentKept:2 sharedKept:2`）
- 💡 **建议**：✅ 已修 —— 预览 hint 明说「跨组共享的同名 relation / 同内容向量会保留，实际删除数可能少于预览」。

### 质疑 #3：`listIds` 无分页，枚举被截断时静默当成「没有残留」

- 🏷️ **类型**：异常归宿 / 静默失败
- 📍 **涉及**：`vectorListAuxDocsByGroups()` 的 `limit`（默认 20k）
- ❓ **质疑点**：`querySync({topk: limit})` 超限只返回前 limit 条且无 offset。大子树（每 chunk 一条 ki-relation）容易破 20k —— 清扫只覆盖一部分而看不出截断。
- 🔍 **验证方法**：构造 > limit 条 aux 后删除，比对残留
- ⚠️ **风险**：🔴 高（静默残留，与修复目标相悖）
- 📊 **置信度**：高（引擎 `handleListIds` 即 `topk: limit`）
- 💡 **建议**：✅ 已修 —— 返回 `{ docs, truncated }`，截断即 warning，新增用例覆盖。

### 质疑 #4：新增「扫全部存活组」是全新失败面

- 🏷️ **类型**：副作用 / 可用性
- 📍 **涉及**：`collectSurvivingReferences()`（`loadGroupCache` / `loadCacheShape`）
- ❓ **质疑点**：旧实现只读本子树；新实现读**所有存活组**分片。任一兄弟分片损坏 → 抛错 → 删除失败（虽在提交窗口前，不造成不一致，但用户「删不掉」）。
- 🔍 **验证方法**：写坏一个无关组的 shard 后删另一组
- ⚠️ **风险**：🟡 中
- 📊 **置信度**：中高（异常路径未保护）
- 💡 **建议**：✅ 已修 —— try/catch → `degraded` + 退回旧行为；并加「无 relation 且无 aux 时跳过扫描」短路。

### 质疑 #5：真引擎上的 filter 契约没有自动化回归

- 🏷️ **类型**：测试覆盖
- 📍 **涉及**：`{field:'group',op:'=='}` + 50 组分块 + 值转义
- ❓ **质疑点**：整套修复依赖「`group` 可 filter 且已建索引 + 值转义正确」。当前仅一次人工 e2e；分块合并、中文组名、`'` 转义无自动化断言。schema 若去掉该字段会走 catch（有 warning，不静默），但回归成本高。
- 🔍 **验证方法**：纳入 `test/zvec-engine*.test.mjs` 真引擎用例
- ⚠️ **风险**：🟡 中
- 📊 **置信度**：高
- 💡 **建议**：登记跟进（已写入 `code-review.md` §7.5），本轮不做。

### 质疑 #6：搭车变更审计 —— `group-create.ts` 两处类型修复

- 🏷️ **类型**：搭车变更
- 📍 **涉及**：`type TreeNode = { [name: string]: TreeNode }`、`withScopeWriteLock(..., async () => createLocal(...))`
- ❓ **质疑点**：与「删组残留」无直接关系
- 🔍 **围栏检查**：均为类型层问题（`Record` 是映射类型，自引用触发 TS2456；`run` 需返回 Promise）。前者零运行时影响；后者行为等价（本就 `await run()`）。
- ✅ **正确性**：已证 —— root `tsc` 从 4 条回到 2 条既有错误；用例 9/9
- 💡 **建议**：✅ 正确 → 放行；提交时建议拆成独立的 `fix(types)` commit

### 质疑 #7：全局回扣

| 回扣维度 | 结论 |
|---|---|
| **目标回扣** | ✅ 「删组不留可检索残留」达成（`doc list` 0 / `search` 空），共享向量不误删；老数据靠 rebuild-vector 兜底（已文档化） |
| **位置回扣** | ✅ 枚举与删除都在 scope 写锁内，无并发写者；异常一律落 warning + degraded，不静默 |
| **判据回扣** | ✅ 无残留 / 搜索不命中 / 存活组完好 / 预览口径（共享场景已在 hint 说明）/ 纯树 scope 可 list |

## 📝 结论

| # | 质疑 | 风险 | 处置 |
|---|---|---|---|
| 1 | 老数据无 group 字段 → 清不到 | 🟡 | 已文档化 + rebuild-vector 兜底 |
| 2 | 共享场景预览/执行反向偏离 | 🟡 | ✅ 已修（hint） |
| 3 | 枚举截断静默 | 🔴 | ✅ 已修（truncated + warning + 用例） |
| 4 | 存活组扫描新增失败面 | 🟡 | ✅ 已修（catch → degraded + 短路） |
| 5 | filter 契约无自动化回归 | 🟡 | 跟进项 |
| 6 | 搭车类型修复 | 🟢 | 已证正确，建议拆分提交 |
| 7 | 全局回扣 | — | 三项均成立 |

**总评**：1 项 🔴 在审查内已修复并补测，其余 🟡 为跟进/已文档化的历史限制。**不推翻 `code-review.md` §7 的 ✅ 结论。**
