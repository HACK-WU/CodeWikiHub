# 单库检索改用定标加权（进度）

> 分支：`feat/single-scope-calibrated-ranking` ｜ 最后更新：2026-11-06

---

## 1. 目标

单库检索（`--scope <单库>`）原本走引擎原生融合，分数只反映「库内排第几」，语义相关性为 0 的文档也能靠字面分排到前面。改为与多库一致的**定标加权**，并加上「只保留语义召回」的准入规则。

---

## 2. 已完成

### 2.1 评分公式统一

```
score(x) = rrf(x) + bm25(x) / 1000
```

- 名次分 `rrf` = 两路 `1/(60+排名)` 之和
- 字面分 `bm25` 除以 1000（`BM25 ≈ 33 分 ≈ 一个满档名次`）
- **去掉了名次项的 ½ 权重**（`RRF_WEIGHT: 0.5 → 1`）

### 2.2 单库候选规则

| 规则 | 实现 | 效果 |
|---|---|---|
| 只保留被**语义检索**召回的文档 | 语义分为 0 的直接丢弃 | 纯字面堆词的文档不再出现在结果里 |
| 字面分为 0 时按 **1** 计 | `MIN_FTS_SCORE = 1` | 纯语义相关文档的字面项不为 0 |

**代价**：结果条数可能少于请求条数（语义只召回 2 篇时，请求 5 条也只返回 2 条）。

### 2.3 新增「定标加权·语义补充」策略

```
score = 定标加权 + k × 语义分       // k 可在页面调整，默认 0.1
```

- 新增 `calibrated-semantic` 算法
- 页面下拉选中后出现「语义权重」输入框（0~0.5，步长 0.01）
- CLI：`--ranking calibrated-semantic --semantic-bonus 0.05`

### 2.4 结果字段扩展

每条结果现在返回四个分项，页面展示为一行：

```
字面 9.81 · 语义 0.612 · 名次 0.0285 · 定标 0.0240
```

| 字段 | 含义 |
|---|---|
| `ftsScore` | BM25 原值 |
| `vectorScore` | 语义相似度（`1/(1+余弦距离)`，0.33~1） |
| `rrfScore` | 名次分（两路之和） |
| `baseScore` | 定标加权分（不含语义补充） |

### 2.5 修复向量路分数语义

`vectorScore` 原本直接用了引擎返回的**距离**（越小越相似），被当成相似度用，导致「语义优先」算法排序整体反转。已改为 `1/(1+距离)`。

### 2.6 文档

| 文档 | 状态 |
|---|---|
| `docs/single-scope-ranking.md` | **新建**（单库公式、候选规则、数值示例） |
| `docs/multi-scope-ranking.md` | 更新（公式去掉 ½、`BM25≈33分`、删「为什么减半」） |
| `docs/multi-scope-query.md` | 更新（候选对齐说明） |
| `docs/README.md` | 索引新增单库条目 |
| `.requirements/2026-11-06-向量重建id失配/` | **新建** bug 需求文档 |

---

## 3. 待定

| # | 事项 | 说明 |
|---|---|---|
| **1** | **多库要不要也去掉 ½ 权重** | 目前是全局改动，多库也生效。副作用：探针库 `batch-09` 从第 3 升到第 2（名次优势恢复）。若只改单库，需拆开两条路径 |
| **2** | 语义补充的 `k` 取多少 | 实测 `k=0.1` 时泛词查询会出现「base 低但语义高」的文档冲到第 1；`k=0.02~0.05` 更稳。待你在页面上试完定值 |
| **3** | 单库结果条数偏少 | 语义只召回 2~5 篇时结果就那么多。是否要「语义召回为空时回退全文」？ |
| **4** | `semantic-first` 是否要下沉 | 它仍走上层重排（依赖候选池最大值），没享受库内算分 |

---

## 4. 已知问题

| 问题 | 状态 |
|---|---|
| **向量重建后 `relation` 反查失效** | 🔴 待修（见 [B-01](../2026-11-06-向量重建id失配/design/DESIGN.md)）—— 单库语义检索受影响最重 |
| 多库探针库回潮 | 🟡 由「去掉 ½ 权重」引起，取决于待定项 1 |
| 单库查询耗时翻倍 | 🟢 已接受（逐路查两次，才能拿到语义分） |

---

## 5. 验证记录

| 项 | 结果 |
|---|---|
| 数值验算（5 组，代码 vs 文档） | 5/5 一致 |
| `test/multi-scope-scoring.test.ts` | 12/12 |
| `search-view` / `search-multiscope` / `scope-view` / `mcp-tool-view` | 10 / 17 / 27 / 9 全绿 |
| 前端测试 | 953/953 |
| 单库实测（`ai-docs`，「主机监控性能优化方案」） | 返回 2 条，`state-machine` 0.0174 / `PERF-008` 0.0162；语义 0 的 `PERF-009` 已消失 |
| 多库实测（`just-test`，「告警是如何产生的」） | 设计决策 0.0381 / batch-09 0.0316 / linkd-effective 0.0295 |

---

## 6. 文件清单

### 后端

| 文件 | 改动 |
|---|---|
| `src/zvec-engine/scoring.ts` | `RRF_WEIGHT` 0.5→1、`MIN_FTS_SCORE`、`SEMANTIC_BONUS` |
| `src/zvec-engine/worker.ts` | 语义召回过滤、字面兜底、语义补充分支 |
| `src/zvec-engine/worker-protocol.ts` | `ranking` / `semanticBonus` / `requireSemanticRecall` / `baseScore` |
| `src/zvec-engine/types.ts` | 同上（请求侧） |
| `src/zvec-engine/search/router.ts` | 三个参数透传 |
| `src/zvec-engine/search/normalize.ts` | `rrf` / `baseScore` 透传 |
| `src/lib/vector-client.ts` | 单库强制定标加权 + 语义召回门槛 |
| `src/search.ts` | `ENGINE_FINAL_RANKINGS` 集合、跳过二次重排、CLI 参数 |
| `src/lib/mcp-tools/search.ts` | `ranking` / `semantic_bonus` 参数 |

### 前端

| 文件 | 改动 |
|---|---|
| `web/src/pages/SearchPage.tsx` | 排序算法下拉（5 项）、语义权重输入框、分数构成展示、5 位小数 |
| `web/src/api/mcpClient.ts` | `ranking` / `semanticBonus` 透传 |

### 文档

| 文件 | 状态 |
|---|---|
| `docs/single-scope-ranking.md` | 新建 |
| `docs/multi-scope-ranking.md` | 更新 |
| `docs/multi-scope-query.md` | 更新 |
| `docs/README.md` | 索引 |
| `.requirements/2026-11-06-向量重建id失配/design/DESIGN.md` | 新建（bug） |

---

## 7. 下一步建议

1. **先修 B-01**（relation 反查失效）—— 否则单库语义检索的结果无法定位原文
2. 定 `k` 的取值（在页面上试 `0.02 / 0.05 / 0.1`）
3. 决定多库是否保留 ½ 权重
4. 再考虑 `semantic-first` 下沉与「语义召回为空回退全文」
