---
id: REQ-20261113-002
feature: FTS-only 转向量化后旧全文索引残留
status: 已实施
created: 2026-11-13
updated: 2026-11-13
version: 2
tags: [bug, 索引一致性, 检索准确性]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：FTS-only 转向量化后旧全文索引残留

- **来源**：2026-11-13 讨论「文档生命周期 / 事件阶段控制检索可见性」时，评估「关闭 dense 能否让文档不被检索命中」过程中顺带发现并实测复现。
- **为什么单独立项**：它是「阶段可见性切换」与「回收站摘索引」两个规划功能的**共同前置能力**。索引切换做不到干净双向，上层任何生命周期设计都会退化成「看起来生效、实际还在污染检索」。
- **证据声明**：`🟢` = 代码直读 + 本机实测（含真实写入 / 检索 / 元数据核对）；`🟡` = 推理未验证。

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | 文档从 FTS-only 切到 dense（`vector` 默认 `true`）时，**旧全文索引记录不会被清理**，`relation.ftsIds` 原样保留 | `src/sync-relation.ts:1281-1290`（`fts` 仅在 `vector===false` 时赋值）、`:1317-1320`（仅在 `!ftsIds.length` 时清理状态）🟢 |
| 2 | 后果：`mode: fulltext` 检索**命中并返回旧版本内容**，而 KB 原文已是新内容 —— 返回的是一份已不存在的文本 | 实测见 §2.1 🟢 |
| 3 | 正常 `hybrid` 检索**看不到**该问题，但原因是**物理隔离**、不是去重：hybrid 只查 hybrid Collection，FTS-only Collection 只有 `fullTextSearch` 会查（`ftsOnlySearch` 全仓唯一调用点在 `fullTextSearch` 内），旧记录压根不进候选池 | 实测见 §2.2 🟢 |
| 4 | **反向**（dense → FTS-only）是**干净的**：旧 dense 向量会被 `vectorDelete` 清掉 | 实测见 §2.3 🟢 |
| 5 | 元数据层有「脏标记」但**不等于清理**：`ftsIndexComplete` 被前置置为 `false`，而**检索链路完全不消费该字段**，记录照样能被召回 | `src/sync-relation.ts:1256-1262`；`ftsIndexComplete` 消费方全量检索见 §3.2 🟢 |
| 6 | 同类清理在**另外三条链路里已经实现**，只有逐条 / 批量写入这两条漏了 —— 属于「实现不一致」而非「设计中未考虑」 | `rebuild-vector.ts:1071-1085`、`import.ts:1912-1922`、`relation-edit-publish.ts:327-345` 🟢 |
| 7 | **不需要跨组共享保护**：FTS docId 的 hash 含 `scope+group+relation+tag+text`（`fts-client.ts:82-87`），天然唯一；而 dense docId 不含 group 故需要 `referencedDenseIds` 保护 —— 两者不可照抄 | `fts-client.ts:82-87` vs `sync-relation.ts:1296` 🟢 |
| 8 | **危害比「只有 `--mode fulltext` 才暴露」更广**：向量服务不可用时默认检索会静默降级为全文（含查询 embedding 失败），此时 `hybrid` 调用同样返回旧内容 | `src/search.ts` 的 `ensureVectorAvailable` 失败分支、`src/lib/vector-client.ts` 查询 embedding 降级分支 🟢（代码直读） |

## 2. 现象与复现

### 2.1 复现步骤（本机实测，2026-11-13）

```bash
# ① FTS-only 写入旧内容
ki sync-relation -s fts-switch-probe -g probe -r doc1 \
  --module-info "蓝鲸协议ZZZ 是一段只应存在于旧版本全文索引中的独占文本。" --no-vector
# → { "fullTextStored": true, "vectorStored": false }

# ② 写入后元数据（.relations/probe/cache.json）
#   ftsIds = ['539a511229b6e93d401c727c87319d20']   ftsIndexComplete = true   memoryIds = []

# ③ 同一 relation 改用 dense 写入全新内容（无字面重叠）
ki sync-relation -s fts-switch-probe -g probe -r doc1 \
  --module-info "红隼流程QQQ 是全新版本的唯一文本，与旧版没有任何字面重叠。"
# → { "vectorStored": true }

# ④ 写入后元数据 —— 旧 FTS ID 仍在
#   memoryIds = ['7c5afa2c8c6d8626ea414db7b9ab84ed']   ← 新
#   ftsIds     = ['539a511229b6e93d401c727c87319d20']  ← 旧，未清理
#   ftsIndexComplete = false                            ← 被前置标记为脏，但记录还在

# ⑤ 全文检索旧词 —— 命中旧内容
ki search -s fts-switch-probe -q "蓝鲸协议ZZZ" --mode fulltext
# → content: "蓝鲸协议ZZZ 是一段只应存在于旧版本全文索引中的独占文本。"
#   originalHint: "原文存在，但无法从当前查询/清洗 chunk 复核精确命中行"
```

**危害定性**：返回的 `content` 是一份**当前 KB 中已不存在**的文本（原文已是「红隼流程QQQ…」）。AI 若采信该 `content`，就会把过时内容当现状使用 —— 这与本项目「反感静默失败」的红线同源：**系统给出的结果看起来正常，实际是错的**。

### 2.2 为什么正常 hybrid 下看不出来（物理隔离，不是去重）

```bash
ki search -s fts-switch-probe -q "蓝鲸协议ZZZ"            # hybrid（默认）
# → content: "红隼流程QQQ …"（新内容）, vectorScore: 0.607, ftsScore: 0
```

**机制更正（2026-11-13 复核）**：最初记的是「hybrid 去重保留最高分把旧 FTS 命中吞掉」，实测与代码都不支持这个解释 ——

- `vectorSearch`（hybrid）只对 hybrid Collection 发 `engine.hybridSearch`，**从不查 FTS-only Collection**；
- `ftsOnlySearch`（即 `ftsSearch`）在全仓的唯一调用点就在 `fullTextSearch` 里，而 `fullTextSearch` 只在 `--mode fulltext` 或降级时被调用；
- 所以旧记录**根本没进候选池**，不存在「被去重吞掉」。同理，`--tags` 过滤仍走 `vectorSearch`，也漏不出旧内容。

结论修正为：

- 正常 hybrid 下**物理隔离**，日常 AI 检索感觉不到异常 ⇒ 缺陷具备长期潜伏条件；
- `--mode fulltext` 会直接暴露；
- **★ 但降级时会暴露**：`ensureVectorAvailable` 不可用（未配 key / 服务不可用）或查询 embedding 失败时，默认检索会被静默降级为全文检索 —— 此时**不传 `--mode fulltext` 的用户同样拿到旧内容**。这比「只有显式全文模式才中招」严重，也说明本缺陷在 FTS-only 部署 / 降级启动场景里并非潜伏。

### 2.3 反向切换是干净的（对照组）

```bash
ki sync-relation -s fts-switch-probe -g probe -r doc2 --module-info "蓝隼初始版 AAA"        # dense
ki sync-relation -s fts-switch-probe -g probe -r doc2 --module-info "蓝隼第二版 BBB" --no-vector  # FTS-only
# → doc2: memoryIds = []   ← 旧 dense 已被清理（sync-relation.ts:1296-1309）
#         ftsIds = ['d22d4a01a41943118420d87e539974de']   ftsIndexComplete = true
```

**结论：只有 `fts-only → dense` 这一个方向漏了清理**，是单向缺陷，不是双向皆坏。

### 2.4 测试数据已清理

探针 scope `fts-switch-probe` 已执行 `ki scope delete fts-switch-probe --yes`（`deletedVectors: 3, kbRemoved: true, ftsRemoved: true`），本机无残留。

## 3. 根因

### 3.1 代码定位（单条路径）

```text
executeSyncRelationLocal
├─ :1253  existingRelation = 查旧记录
├─ :1254  previousFtsIds  = 旧 ftsIds 采集（已采集！）
├─ :1255  previousDenseIds = 旧 dense ids
├─ :1256  if (previousFtsIds.length > 0) → 只把 ftsIndexComplete=false 落盘   ← 仅标记，不删
├─ :1281  const fts = params.vector === false ? await fullTextWriteBack(...) : undefined
│          └─ vector=true ⇒ fts = undefined ⇒ 下面整段跳过
├─ :1291  if (fts && relRec) { relRec.ftsIds = fts.ids; ... }                  ← 不执行
├─ :1317  else if (relRec && !relRec.ftsIds?.length) { delete ftsIndexComplete }
│          └─ 条件反了：有旧 ftsIds 时**既不清理也不改**，旧 ID 原地保留       ← 缺口
└─ :1331  params.vector === false ? 跳过 : await vectorWriteBack(...)          ← 新 dense 写入
```

批量路径同构：`itemPriorFtsIds` 在 `:703` 已采集、`:963` 只在 `vector===false` 时使用；`BulkSyncRelationParams.vector` 是**批次级**（`:537`），故整批 `vector=true` 时同样全部漏清。

### 3.2 `ftsIndexComplete` 的消费方全量核查（说明脏标记救不了检索）

| 消费位置 | 行为 | 对检索的影响 |
|---|---|---|
| `src/scope.ts:198` | 统计 `ftsDocCount` 时排除 `complete===false` | 统计偏低，不影响召回 |
| `src/lib/relation-edit-live.ts:31` | `hasFts && (complete===true \|\| !hasDense)` 才判为 `'fts'` | 编辑器侧降级为 dense 口径 |
| `src/lib/import.ts:679` | `complete===false` 时不做增量跳过，强制重做 | 影响导入去重 |
| `src/lib/fts-rebuild.ts:83` | 重建时要求重写 | 仅重建链路 |
| **检索链路（`vector-client` / `fb` / `search`）** | **完全不读该字段** | **旧记录照常召回** ← 本缺陷的核心 |

> 关键认知：`ftsIndexComplete=false` 是「元数据自认不完整」，不是「索引里没有这条记录」。**检索不看它，所以标记不等于清理。**

## 4. 需求描述

- **R1 单条写入补齐清理**：`executeSyncRelationLocal` 在 `params.vector !== false` 且 `previousFtsIds` 非空时，**必须**清理旧全文索引记录，并同步清空元数据 `ftsIds` / `ftsLocators` / `ftsIndexComplete`。
- **R2 批量写入补齐清理**：`executeBulkSyncRelationLocal` 同口径（`itemPriorFtsIds` 已采集，直接复用）；批量内多条失败不得中断整批，逐条记入结果。
- **R3 先写后清（顺序硬约束）**：必须**新的 dense 写入成功之后**才清旧 FTS。若 `vectorWriteBack` 失败（embedding 不可用等），**不得清理旧 FTS** —— 否则文档在新旧两套索引里都不存在，等于把内容从检索里彻底抹掉。这与现有 `fullTextWriteBack` 分支「新 FTS 未完整写入时保留旧 dense」（`sync-relation.ts:1313-1316`）是同一原则的镜像。
- **R4 失败不静默**：清理失败时保留 `ftsIds`（不假装干净），并在返回体新增字段透出失败条数与原因（如 `ftsCleanupFailed` / `ftsCleanupReason`），与既有 `vectorStored` / `fullTextStored` / `wikiSynced` 的「部分成功必须可见」口径一致。
- **R5 NOT_FOUND 幂等**：旧 FTS 记录本就不存在时视为成功，不报错、不计入失败（沿用 `ftsDeleteByIds` 既有约定）。
- **R6 不需要跨组共享保护**：FTS docId 含 `group`，不会跨组共享；**不要照抄** dense 的 `referencedDenseIds` 保护逻辑（那套存在的原因是 dense docId 不含 group）。删除范围就是本 relation 的 `previousFtsIds`。
- **R7 存量脏数据可诊断可修复**：本缺陷已产生存量数据（`ftsIds` 非空 + 有 dense / 或 `complete=false` 的残留）。需提供诊断与修复入口 —— 建议二选一（设计阶段定）：
  - `ki doctor` 增加检查项，报出「FTS 残留但已被 dense 覆盖」的文档数；
  - 或 `ki rebuild-vector` 顺带清理（`rebuild-vector.ts:1071` 已有单文档清理逻辑，只需确认它在全量重建时能覆盖到这批脏数据）。
- **R8 返回体可读**：写入返回体需让人看出「这次从 FTS-only 切到了 dense，清掉了几条旧 FTS 记录」，避免再次出现「看起来成功了、实际留了一地」的情况。

## 5. 验收标准

| # | 用例 | 期望 |
|---|---|---|
| A1 | §2.1 步骤 ①②③ | 写入后 `ftsIds` 为**空数组或字段不存在**；元数据无残留 |
| A2 | §2.1 步骤 ⑤（同一复现后） | `ki search --mode fulltext -q "蓝鲸协议ZZZ"` 返回 **0 命中** |
| A3 | 反向（dense → FTS-only） | `memoryIds` 清空、`ftsIds` 为新值、`ftsIndexComplete=true`；**不回归** |
| A4 | 模拟 dense 写入失败（如 embedding key 无效）后切回 dense | 旧 `ftsIds` **保留**（不能既无 dense 又无 FTS）；返回体给出失败原因 |
| A5 | 模拟 `ftsDeleteByIds` 失败 | `ftsIds` 保留 + 返回体报 `ftsCleanupFailed` 条数与原因；不静默 |
| A6 | 批量写入（`ki_bulk_sync_relation`）同 A1/A2 | 整批一致；单条失败不影响其余并逐条可见 |
| A7 | 重复切同一文档（fts → dense → fts → dense）×3 | 每次收敛到「只有当前模式的那一套索引」，无累积 |
| A8 | 存量脏数据（造 3 篇 `ftsIds` 残留）→ 诊断 | 准确报出 3 篇；修复后 `fulltext` 不再命中旧内容 |
| A9 | `ki doc list` / 统计口径 | 修复后 `ftsDocCount` 与真实 FTS 记录数一致（不再因 `complete=false` 被低估） |
| A10 | 既有用例回归 | `sync-relation`、`bulk-sync-relation`、`fts-rebuild`、`rebuild-vector`、`import` 相关套件全绿 |
| A11 | 修复后把向量服务置为不可用（或配错 key），**默认检索**（不传 `--mode`）搜旧词 | 走降级全文路径，但**不再**返回旧内容（旧记录已被清理） |

## 6. 影响面

| 位置 | 影响 | 需处理 |
|---|---|---|
| `src/sync-relation.ts`（单条 `executeSyncRelationLocal`） | 主修复点：补清理 + 先写后清 + 失败透出 | R1 / R3 / R4 |
| `src/sync-relation.ts`（批量 `executeBulkSyncRelationLocal`） | 同口径 | R2 |
| `src/lib/fts-client.ts` | 复用 `ftsDeleteByIds`；确认批量上限与幂等语义 | R5 |
| `src/lib/scoring.ts`（`Relation` 类型） | 无字段变更（只清字段值），风险低 | — |
| MCP 工具返回体（`ki_sync_relation` / `ki_bulk_sync_relation`） | 新增清理结果字段 | R8 |
| `src/lib/rebuild-vector.ts` / `ki doctor` | 存量脏数据的诊断与修复入口 | R7 |
| 检索链路 | **无需改动**（本次只让索引与元数据对齐） | — |
| 测试 | 新增专项用例；既有 `sync-relation` / `fts-*` 套件不得回归 | A10 |
| 下游规划（文档生命周期 / 事件阶段可见性 / 回收站） | 本需求是它们的共同前置：**索引能干净摘除与装回**，上层才可能成立 | 前置说明 |

## 7. 负向需求

| # | 场景 | 期望行为 |
|---|---|---|
| N1 | 清旧 FTS 失败 | 保留 `ftsIds` + 返回体报原因 + 可重试；**不得**把 `ftsIds` 清空后假装成功 |
| N2 | 新 dense 写入失败 | **不清**旧 FTS（避免两份索引同时消失） |
| N3 | 旧 FTS 记录本就不存在 | 幂等成功，不报错、不计失败 |
| N4 | 批量中某条失败 | 不中断整批；该条保留旧 ID 并可在结果里定位 |
| N5 | 进程在「新 dense 已写、旧 FTS 未清」之间被 kill | 下次写入可重入并补齐；元数据不得出现「ftsIds 为空但引擎里还有记录」（宁可留 ID 被再次清理，也不要丢定位） |
| N6 | scope 只读 / 写锁被占 | 按既有 `withScopeWriteLock` 口径 fail-loud，不降级为「跳过清理静默成功」 |
| N7 | 历史数据 `ftsIds` 存在但 `ftsIndexComplete` 缺失（旧版关系） | 按 `scoring.ts:59-72` 的兼容口径视为已登记，正常纳入清理，不因字段缺失跳过 |

## 8. 未决问题（设计阶段拍板）

1. ~~**存量修复入口选哪个**~~ → **已定（复核实测）**：`ki restore <scope> --rebuild-vector` **已经是**现成修复入口 —— 它的清理循环无条件执行（`dense 已写 + ftsIds 非空 ⇒ 删 FTS`），实测后 `ftsIds` 被移除、`fulltext` 搜旧词 0 命中。只需新增 `ki doctor` 只读诊断（报数），不需要批量修复工具。⚠️ 使用时注意：rebuild 会顺带把 FTS-only 文档也向量化，不是「只清残留」。
2. **存量规模需要先摸清**：建议实现前先跑一次只读扫描，统计「`ftsIds` 非空且 `memoryIds` 非空」的文档数（这类就是本缺陷的产物）。规模决定要不要做批量修复工具。
3. ~~**返回体字段命名**~~ → **已定**：`ftsRemoved` / `ftsCleanupFailed` / `ftsCleanupReason`（flat，与 `fullTextStored` / `vectorStored` 同风格）。
4. **是否顺便校验「反向也干净」**：单条反向已实测干净；批量反向清理仍未实测，实现时补一个用例。

## 9. 关键假设

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| H1 | FTS docId 含 group ⇒ 无需跨组保护 | 若某历史版本不含 group，会误删兄弟组记录 | `git log` 查 `fts-client.ts::ftsId` 历史实现 |
| H2 | 检索链路确实不消费 `ftsIndexComplete` | 若某路径依赖它，问题表现与验收标准都需改 | 全量 grep 已做（§3.2），实现前再复核一次 |
| H3 | 存量脏数据规模可控 | 若量级很大，需单独做批量修复而非逐个重建 | 只读扫描统计 |
| H4 | ~~`hybrid` 去重按 `group\|relation`，所以旧内容被掩盖~~ → **原假设作废**：hybrid 根本不查 FTS-only Collection（§2.2），去重粒度与本缺陷无关 | 真正需要盯的是「降级到全文」的那些入口（§2.2 末段） | 已有实测 + 读 `vector-client` 的 `vectorSearch` / `fullTextSearch` 分工 |

## 10. 与后续规划的关系

```text
本需求（索引切换干净）
   └─ 是以下两者的前置能力，本身可独立交付
      ├─ 事件阶段可见性（full / fts-only / hidden 三档切换）
      └─ 回收站（删除 = 摘四类索引、恢复 = 重建）
```

**建议独立排期、先做**：它的收益（检索不再返回过时内容）无需等任何上层功能，而它的修复成本远低于上层功能返工。

## 11. 实施记录（2026-11-13）

| 项 | 内容 |
|---|---|
| 落点 | `src/sync-relation.ts`：新增共用清理原语（只删 + 改元数据，不落盘），单条 `executeSyncRelationLocal` 在 dense 写入成功后接入，批量 `executeBulkSyncRelationLocal` 逐条接入 |
| 顺序 | 严格「先写 dense 后清 FTS」；`vectorStored=false` 时只保留不清，并在返回体给出 `ftsCleanupReason` |
| 落盘 | 单条路径清理后的落盘基于**清理前重新读盘**的副本（`vectorWriteBack` 会自读自写 cache 回写 memoryIds，用函数开头的 in-memory cache 落盘会把它们冲掉）；批量路径沿用阶段 4 统一落盘 |
| 返回体 | 新增 `ftsRemoved` / `ftsCleanupFailed` / `ftsCleanupReason`（单条顶层 + 批量逐条） |
| 测试 | 新增 `test/sync-relation-fts-cleanup.test.ts` 9 例（单条 6 + 批量 3）：清爽清理、dense 失败保留、部分失败、抛错、NOT_FOUND 幂等、反向不回归、批量三态；含「先写后删」调用顺序断言 |
| 真机 | 全新 scope：`--no-vector` 写入后 `fulltext` 命中旧文本 → 切 dense 后 `ftsRemoved: 1`、`fulltext` 旧词 **total 0**、新词命中；批量路径同（旧词 total 0、元数据无残留）；`npm run build` 退出码 0 |
| 未做 | `ki doctor` 只读诊断项（R7 的「报数」部分）未实现；批量反向清理用例未补（§8 第 4 条） |
