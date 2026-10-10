# 实验 3：`indexCompleteness` 到底表示什么（Q7 核定，只读）

**日期**：2026-10-10　**关联**：REQ-20261009-003（Q7 / H1 / H4 / R6）
**方法**：**只读**扫描现网 —— 遍历 `~/…/vector/collections/*/` 下的 dense 索引实体（`**/dense.index.*.proxima`），并直读 `.vector-status/<sha256(scope)>.json` 快照的原始信号（绕过 TTL，**不打开引擎、不发 HTTP、不写任何 scope 数据**）。
脚本：`temp/exp-3-index-signal-vs-file.ts`　运行：`npx jiti temp/exp-3-index-signal-vs-file.ts`

---

## 一、结论（先说结果）

> **`stats.indexCompleteness` ≠ "索引实体是否存在"。**
> 现网 **23/23 个 scope 都有 dense 索引实体**（5MB ~ 114MB），但有新鲜快照的 11 个 scope **信号全部为 0**，**没有任何一个为 1**。
> ⇒ 该信号更可能是「**索引已被显式整理并激活（`optimize()` 路径）**」的标记，而**不是**"引擎有没有为这批向量建索引"。

**直接后果（需求侧）**：

1. **H1 被证伪**：不能拿 `indexCompleteness == 1` 当"索引就绪"判据；
2. **H4 被修正**：引擎**会**自行构建并落盘 dense 索引实体（不存在"从未建索引"这回事）；
3. **实验 1 的表述需收窄**：当时写"不调 `optimize()` → 索引永远不建"，准确说法应是"**不调 `optimize()` → 该信号永远不置 1**"（引擎仍自行落盘实体）；
4. **R6 的判据改为交叉口径**：索引实体（文件）+ 重开校验，`indexCompleteness` 仅作辅助信号（对应验收 A11 / Q7）。

## 二、样本（现网只读，2026-10-10）

| scope | dense 索引实体 | 信号 `dense` | 快照 |
|---|---|---|---|
| `ai-docs` | `0/dense.index.3.proxima` 102MB | **0** | compatible (20m 前) |
| `ai-docs-v3` | `0/dense.index.7.proxima` 114MB | **0** | compatible (25m 前) |
| `ai-docs-v4` | `0/dense.index.3.proxima` 114MB | **0** | compatible (31m 前) |
| `ai-dosc-v2` | 114MB | **0** | compatible (2h 前) |
| `bkmon-test` | 29MB | **0** | mismatch (54m 前) |
| `bkmon-test3` | 9MB | **0** | compatible (14h 前) |
| `default` | 5MB | **0** | compatible (23m 前) |
| `dories` | 5MB | **0** | compatible (14h 前) |
| `k8s` | 20MB | **0** | compatible (2h 前) |
| `kafka` | 9MB | **0** | compatible (14h 前) |
| `kisearch` | 36MB | **0** | mismatch (1h 前) |
| 其余 12 个 scope | 5 ~ 29MB（全部存在） | —（快照缺失/过旧） | mismatch / 无快照 |

**统计**：有实体 23；**实体存在而信号 = 0：11**；**实体存在且信号 = 1：0**；有实体但无信号：12。

## 三、与既有证据的关系

| 证据 | 关系 |
|---|---|
| 实验 1：「不调 `optimize()` → 写完 180s 零后台活动、信号恒 0、重开仍 0」 | 一致（信号确实不自行变 1） |
| 实验 1：「调 `optimize()` → 信号 0 → 1、重开仍 1」 | 一致（信号 = 显式整理/激活的标记） |
| 现场二（`ai-docs-v4`）：引擎自行落盘 119MB 索引而信号仍 0 | 本次在 23 个 scope 上复现同类形态 |

## 四、局限（未验证项）

本实验只证明"**实体存在**与**信号**不是一回事"，**没有**回答"检索路径是否真的用上了这个索引实体"。
若要判断"索引是否被检索使用（vs 暴力扫描）"，需另做一次**耗时/CPU 对照实验**（同数据集、`optimize()` 前后比对检索 p95 与 `rocksdb`/worker 线程行为）—— 记为待办，**不阻塞** R6 的判据修正。

## 五、对需求的落地动作

- Q7：**已核定**（本报告）；
- H1 → ❌ 证伪；H4 → 修正为"引擎会落盘实体、但不更新信号"；
- R6 判据 → 索引实体 + 重开校验（A11）；`indexCompleteness` 降为辅助信号；
- R4 的验收（原 A3"`optimize` 后 `dense == 1` 且重开仍为 1"）**依然成立**（那正是 `optimize` 路径的语义），但**不得**再用它反推"索引是否存在"。
