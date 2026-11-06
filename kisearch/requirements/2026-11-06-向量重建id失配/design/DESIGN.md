# B-01 向量重建后 relation 反查失效（BUG）

> 状态：待修复 ｜ 发现日期：2026-11-06 ｜ 触发命令：`ki restore <scope> --rebuild-vector`

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| **memoryId** | 向量文档（chunk）的 docId，由 `rebuild-vector` / `import` 生成，写入 zvec 的 `id` 字段 |
| **ftsId** | 全文索引的文档 id，与 memoryId 相互独立 |
| **relations-cache** | 文档元数据映射（group / relation / tags / memoryId），检索结果靠它反查「命中的是哪个文件的哪一段」 |
| **反查（lookup）** | 检索命中一条 chunk 后，用 `ftsId ?? memoryId` 去 relations-cache 查出 `group` / `relation` / `sourcePath` |
| **纯向量召回** | 文档只出现在向量路结果里，全文路没有召回它 —— 因此**只有 memoryId，没有 ftsId** |

---

## 2. 问题现象

### 2.1 表现

`ki restore ai-docs --rebuild-vector` 执行成功后，检索结果里**大量文档的 `relation` 为空**：

```json
{
  "memoryId": "92fa5bc4b086c56712b241bd5acdb2c9",
  "group": "saas-backend-datalink/bk-monitor",
  "relation": "",          ← 应该是一个文档名，实际为空
  "content": "…"
}
```

`group` 有值（来自向量文档自带的字段），**只有 `relation` 为空** —— 说明反查没有命中。

### 2.2 触发条件

| 条件 | 是否必需 |
|---|---|
| 执行过 `--rebuild-vector` | ✅ 必需 |
| 命中的文档**只被向量路召回**（无 ftsId） | ✅ 必需 |
| 命中的文档**同时被全文路召回**（有 ftsId） | ❌ 不受影响（ftsId 仍能反查） |

**因此旧排序策略下很难发现**（结果多数来自全文路），单库语义检索（只保留向量召回）会**全军覆没**。

### 2.3 复现步骤

```bash
ki restore ai-docs --rebuild-vector
ki mcp restart
ki search "<任意词>" --scope ai-docs --limit 5
# 观察结果中的 relation 字段：多数为空
```

---

## 3. 根因

### 3.1 直接原因：向量重建后 id 失配，且**没有回写**

```
rebuild-vector：
  重新切分 chunk → 生成新的 memoryId → 写入向量索引
                                        ↓
                            ❌ 没有回写 relations-cache
                                        ↓
  relations-cache 里仍是重建前的旧 memoryId
                                        ↓
  反查时用新 memoryId 查旧表 → 查不到 → relation 为空
```

### 3.2 代码位置

`src/lib/rebuild-vector.ts` **文件头注释与函数注释都声明了这个回写行为**：

```ts
// 第 12 行
 * 内容向量（ki-search）的 docId 回写 relations-cache.json 的 rel.memoryId，

// 第 474 行（函数注释）
 * 回写向量 docId 到 relations-cache 的 rel.memoryId / rel.memoryIds。
 * 匹配键 = groupPath + relationName（index.json 键 ↔ rel.text）。
```

**但全项目检索 `writeBackMemoryIds` 无任何结果** —— 注释描述的意图没有对应实现，回写从未发生。

### 3.3 排查证据（2026-11-06 实测）

| 验证项 | 结果 |
|---|---|
| 查询返回的 memoryId（`92fa5bc4…`）在反查表（15569 条）中 | ❌ 不存在 |
| 该 id 在 `/root/.ki-data/ai-docs/` 任何 JSON 中 | ❌ 搜不到 |
| 缓存文件最近 2 小时是否更新（rebuild 后） | ❌ 无更新 |
| `src/` 下是否存在 `writeBackMemoryIds` | ❌ 不存在 |
| 反查表里其它条目（如 `relation="AGENTS"`）是否正常 | ✅ 正常（旧 id 有映射） |

---

## 4. 影响面

| 场景 | 影响 |
|---|---|
| **单库语义检索**（`requireSemanticRecall`，只保留向量召回） | 🔴 **结果无法定位**（relation 全空，用户不知道是哪个文件） |
| 多库 / 视图检索 | 🟡 部分影响（纯向量命中的文档 relation 为空，字面命中的正常） |
| 全文模式（`--mode fulltext`） | 🟢 不受影响（全部走 ftsId） |
| 原文召回（`includeOriginal`） | 🔴 依赖 `group + relation` 拼路径，会一并失效 |
| `ki doc delete` / `delete-relation` | 🟡 按 memoryId 删除时可能找不到条目（悬空引用） |

---

## 5. 修复方案

### 方案 A（治本）：rebuild 结束后回写 memoryId

在 `rebuild-vector.ts` 的向量写入完成后增加一步：

```
输入：vectorBulkStore 的返回结果（每条含 docId）+ 全量 entries
  ↓
按 `groupPath + relationName` 聚合 → 得到每个 relation 的新 docId 列表
  ↓
与 relations-cache 中的 rel.memoryId / rel.memoryIds 比对
  ↓
有差异则写回（保持 rel.memoryId = 第一个内容向量 docId，rel.memoryIds = 全部）
  ↓
bump relations-cache 的 revision（触发检索侧缓存失效）
```

**关键要求**：

- 写回必须**原子**（先写临时文件再 rename），避免检索读到半截数据
- 必须 bump `revision`，否则 daemon 的 `getRelationMap` 不会重建缓存（有 10 分钟 TTL）
- 局部重建（`--group` / `--tags`）只更新对应子集

### 方案 B（临时）：重建后手动重建映射

```bash
ki sync-relation <scope>
```

需验证它是否更新 `memoryId`（而非只重建 `ftsId` 映射）。若有效，文档中把「rebuild 后必须执行 sync-relation」写成固定步骤。

---

## 6. 验收标准

| # | 场景 | 期望 |
|---|---|---|
| 1 | `ki restore <scope> --rebuild-vector` 后立即查询（不重启 daemon） | 纯向量召回的结果 `relation` **非空** |
| 2 | 同上，重启 daemon 后查询 | 同上 |
| 3 | 查询返回的每个 `memoryId` | 在 `getRelationMap(scope)` 中**可查到** |
| 4 | `--group` 局部重建后 | 未重建的 group 映射**不受影响** |
| 5 | 全文模式结果 | 行为与改动前**完全一致**（ftsId 路径不变） |
| 6 | 重建前后 `relations-cache` 的 `revision` | **必须递增**（否则缓存不失效） |

---

## 7. 附：相关文档

以下文档在代码仓 `knowledge-indexer/docs/` 下：

- 多库检索的执行流程：`multi-scope-query.md`
- 排序分数公式：`multi-scope-ranking.md` / `single-scope-ranking.md`
- 备份与还原：`backup-restore.md`

---

## 8. 待确认

1. `ki sync-relation` 是否会更新 `memoryId`？（决定方案 B 是否可行）
2. 历史库（rebuild 前导入的）是否也存在同样问题？（用其它 scope 抽查）
3. `import` 路径是否已正确回写？（`import` 时会 `writeRelations`，可能只写了 ftsIds）
