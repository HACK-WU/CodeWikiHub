---
id: REQ-20261019-002
document_type: review
created: 2026-10-19
updated: 2026-10-19
version: 1
tags: [feat, fix]
author: AI
---

# Bug 修复影响分析报告：疑似重复判据改按落点比较

## 📋 基本信息

- **Bug**：Group 选 `langchain` 时，预检把 44 篇"落点完全相同的幂等更新"报成「来源路径不同、会新建副本」
- **修复**：判据从「只比 `sourcePath`（裸 rel）」改为「同 sourcePath **或** 同落点（group+relation）」；索引由 `Map<hash,Hit>` 改为 `Map<hash,Hit[]>`；预检链路透传 `group`
- **影响文件**：`import-path.ts`(新) / `duplicate-index.ts` / `import.ts` / `import-preflight.ts` / `mcp-http-api.ts` / `httpApi.ts` / `ImportPage.tsx`
- **验证基线**：真实数据 44→0；单测 6/6；`lib` 37/37；tsc/build 绿

## 🔍 根因分析

```text
{预检把 44 篇幂等更新报成「疑似重复」}
  ▼
{判据只比 sourcePath（相对 sourceDir 的裸路径）}
  ▼
{「同一篇文档」被等同于「来源路径字符串相同」，忽略落点 = group + rel}   ← 根因
  ├─ 上次：sourceDir 选父目录 → rel=`langchain/stages/…`
  └─ 本次：sourceDir 选 `langchain` 子目录 + group=`langchain` → rel=`stages/…`
  ▼
{REQ-20261019-002 引入判据 + 预检接口未接收 group}
```

**根因类型**：设计遗漏（🟡 中）——不是编码疏忽，而是判据的身份键选错。

## 🩹 修复方案评估

**判定：情况 A（对症）**。

| 维度 | 结论 |
|---|---|
| 根因覆盖 | 直接以「落点」为主判据，且预检拿到 `group` 这一必要输入 ⇒ 根治 |
| 场景完整 | 同 sourcePath / 同落点 / 同内容多副本 / 库中无 sourcePath 四种形态都覆盖 |
| 方案级别 | 修正判据设计，不是打补丁（同时抽出 `import-path.ts` 消除落点规则的第二份实现） |

## 📊 影响范围分析

### 调用链影响

```text
collectDuplicateHits（判据）
├─ import-preflight.ts:66 → POST /api/import/preflight → ImportPage 预检面板   ← ❌ 语义变更（修复目标）
└─ import.ts:778 → handleDirectImport（web / CLI / daemon 三端）              ← ❌ 语义变更（同上）
buildLibraryIndex（索引结构）
└─ 仅 collectDuplicateHits 内部消费                                          ← ✅ 无外部消费者
import-path.resolveGroupForSource（提取）
└─ import.ts:965（真实落点计算）                                             ← ✅ 与原实现逐字一致
```

| # | 调用方 | 位置 | 影响级别 | 说明 |
|---|---|---|---|---|
| 1 | 预检 `preflightImportDuplicates` | `import-preflight.ts:66` | ❌ 确定受影响 | 命中数减少（预期）；新增 `group` 入参，旧调用不传即保持旧口径 |
| 2 | 「跳过重复」 | `import.ts:778` | ❌ 确定受影响 | 不再把同落点文件剔除；整批同落点时会真的执行更新（旧实现会抛 `ALL_FILES_DUPLICATES`） |
| 3 | HTTP handler | `mcp-http-api.ts` `handleImportPreflight` | ⚠️ 需检查 | 新增 `group` 校验（拒绝 `..`/反斜杠/绝对路径）；比 `/import/run` 严 |
| 4 | 前端预检 | `ImportPage.tsx` `afterUploadsComplete` | ✅ 无影响 | 仅多传一个字段 |
| 5 | `rebuild-vector` / `restore` | — | ✅ 无影响 | 不经过重复判据 |

### 条件路径影响

| 条件 | 修复前 | 修复后 | 一致性 |
|---|---|---|---|
| 不传 `group`（旧调用 / 第三方） | 只比裸 rel | 仍比裸 rel，**额外**按 `dirname(rel)` 推落点比较 | ⚠️ 可能多判为"同篇"（更准，但属行为变化） |
| 传 `group`，落点相同 | 判重复 | 不判重复 | ❌ 预期变更 |
| 传 `group`，落点不同 | 判重复 | 判重复 | ✅ |
| 库中同内容存在多份 | 只比"第一条"（顺序决定，误判） | 任一条同落点即同篇 | ❌ 改善 |
| 库中条目无 `sourcePath`（旧 sync-relation 写入） | 一律判重复 | 落点相同则不判 | ❌ 改善 |
| 同一 rel、不同 sourceDir | 视为同源（不判重复） | 同左（**未改变**） | ⚠️ 既有局限，见风险 R2 |

### 数据流影响

- **返回值**：`buildLibraryIndex` 由 `Map<hash, DuplicateHit>` 变为 `Map<hash, DuplicateHit[]>`——仅内部消费，无外部调用方（全仓 grep 确认）
- **副作用**：无新增 I/O；仍为纯只读（不写 KB / 向量 / 元数据）
- **异常传播**：不变（读文件失败仍按"未命中"）
- **全局状态**：无

### 场景覆盖

| 场景 | 影响 | 说明 |
|---|---|---|
| 正常导入（首次） | ✅ | 库空 → 索引空 → 不命中 |
| 重复导入（同 group） | ✅ | 落点相同 → 视为更新（本次修复目标） |
| 重复导入（换 group） | ✅ | 落点不同 → 仍提示 |
| 高并发预检 | ✅ | 只读、无锁 |
| 库 KB 损坏 / 文件缺失 | ✅ | 该 group 跳过，不 fail-loud（与原设计一致） |

## 🚨 回归风险评估

| 等级 | 数量 | 说明 |
|---|---|---|
| 🔴 高危 | 0 | — |
| 🟡 中危 | 3 | 见下 |
| 🟢 低危 | 2 | 见下 |

**[R1｜🟡 → ✅ 已修复] 预检与 run 的 `group` 校验口径不一致**
- 触发条件：前端被绕过、直接调 `/api/import/run` 传非法 `group`（含 `..`）
- 影响：预检 400 而 run 可能接受（既有缺口，非本次引入）
- **处置**：抽出 `import-path.isSafeGroupPath()` 作为单一判据，`/api/import/preflight` 与 `/api/import/run` 同口径拒绝（绝对路径 / 反斜杠 / `..` 段）；新增 `test/import-path.test.ts` 4 例锁死

**[R2｜🟡] `sourcePath` 不含 sourceDir 身份（既有语义局限，本次未改变）**
- 触发条件：两个不同源目录下存在**同名同内容**文件
- 影响：会被当成"同一来源"而不提示重复（可能建副本/覆盖）
- 说明：本次修复未触碰；补测试时已踩到，建议后续单独评估

**[R3｜🟡] `deriveGroupPath` 仍有两份实现**
- `ai-results.ts:31` 与 `import-path.ts` 各一份（逻辑相同）
- 影响：任一处调整会静默漂移
- 建议：后续让 `ai-results` re-export `import-path` 的实现

**[R4｜🟢] 索引内存**
- `Map<hash, Hit[]>` 每 relation 多一层数组包装；215 条可忽略，10 万级增量亦线性可忽略

**[R5｜🟢] 提示对象排序用 `localeCompare`**
- 仅影响"提示哪一条"，不影响判定；ICU 差异不改变正确性

### 未被修复的同类风险

| 位置 | 状态 |
|---|---|
| `import-retry.ts` 未完成清单的 `path`（相对 sourceDir） | ✅ 不构成同类：重试沿用同一 sourceDir |
| `doc-list` 展示的 `sourcePath` | ✅ 纯展示用途，不参与身份判定 |

## 🧪 测试建议

| 场景 | 优先级 | 状态 |
|---|---|---|
| 落点相同不判重复 / 落点不同仍判重复 | P0 | ✅ 已补（2 例） |
| 导入侧同口径（同落点不跳过、落点不同→整批重复 fail-loud） | P0 | ✅ 已补（1 例） |
| 缺省 group 的落点推导 | P1 | ✅ 已补（`test/import-path.test.ts`：显式/缺省/单文件三形态） |
| 库中同内容多副本（索引不再只留第一条） | P1 | ✅ 已补（`import-preflight.test.ts`：断言同 hash 数组 ≥2 且不误判） |
| 非法 `group` 被拒绝（preflight 与 run 同口径） | P1 | ✅ 已补（`import-path` 4 例 + 两处 handler 统一用 `isSafeGroupPath`） |

**补测后全量回归**：`import-path` 4/4 · `import-preflight` 7/7 · `lib` 37/37 · `task-snapshot` 12/12 · `task-registry` 6/6 · web 442/442 · 真实数据 44→0 · 后端 `tsc` 仅 2 个既存错误。

## 📝 总结与行动项

| 优先级 | 行动项 | 关联 |
|---|---|---|
| P1 | `run` 侧补 `group` 校验，与预检同口径 | R1 |
| P1 | 补 3 个待补测试（缺省 group / 多副本 / 非法 group） | 测试建议 |
| P2 | 收敛 `deriveGroupPath` 两份实现 | R3 |
| P2 | 评估 `sourcePath` 是否需带 sourceDir 身份 | R2 |

**结论：修复对症、风险中低，可合入**（0 高危；3 中危均为既有缺口或后续收敛项）。
