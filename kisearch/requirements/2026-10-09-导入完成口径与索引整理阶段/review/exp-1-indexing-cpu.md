# 实验 1：`optimize()` 的真实代价与「不调它」的后果（隔离环境实测）

> 关联需求：**REQ-20261009-003**（父需求 REQ-20260930-002，落地其 R3 / S0-4 / S0-6）
> 起因：`debug-report.md` 记录「导入报 `succeeded` 后单核 100% CPU 约 11 分钟」，用户追问 zvec 的索引优化 API 能否缓解
> 一句话结论：**它不能让 CPU 工作量变少，但能决定「摊在几个核、摊多久」；同时它是唯一能建 dense 索引的路径——而我们从来没调用过它**
> 状态：实验 1 完成（2026-10-09）；实验 2（复现那 11 分钟）待做

---

## 1. 方法

| 项 | 内容 |
|---|---|
| 脚本 | `temp/exp-indexing-cpu.ts`（`npx jiti` 运行） |
| 隔离 | 全部读写只在 `temp/exp-cpu-*` 内；**不触碰 `~/.ki/vector` 与真实 scope**（现网部分为 `ZVecOpen(path,{readOnly:true})`） |
| 环境 | 20 核 / 43GB / Node v22.22.2 / `@zvec/zvec` **0.6.0** |
| 数据 | 1024 维归一化合成向量 + ~800B 中文正文（jieba FTS）+ 3 个倒排标量字段（tag/scope/group）；schema 复用 `src/zvec-engine/schema/builder.ts`（与生产同构） |
| 写入 | 每批 200 篇 `upsertSync`（与 `VECTORIZE_BATCH_SIZE` 同构）；默认 N=8000、两轮覆盖 = 16000 次 upsert |
| 计量 | `process.cpuUsage()`（getrusage，涵盖所有线程，**权威口径**）+ `/proc/self/task/*/stat` 逐线程求和（交叉验证 + 识别「哪个线程在忙」） |
| 臂 | A 不调 optimize（含 180s 静置观察）／B 两轮写入不调 optimize／C `optimizeSync()`（= 当前封装）／D `await optimize({concurrency:1})`／G `await optimize({concurrency:4})` |

---

## 2. 结果

### 2.1 建索引的代价（N=8000，两轮覆盖；两次独立运行）

| 臂 | 调用 | 墙钟 | CPU 秒（getrusage） | 平均核数 | 结束后 `indexCompleteness.dense` |
|---|---|---|---|---|---|
| C | `optimizeSync()` | 3.9s / 4.6s | **16.8 / 21.5** | ~4.3 | 1 |
| D | `optimize({concurrency:1})` | 13.3s / 14.6s | **13.0 / 14.4** | ~1.0 | 1 |
| G | `optimize({concurrency:4})` | 5.4s / 6.4s | **12.2 / 15.5** | ~2.4 | 1 |

**读法**：并发度**不改变总工作量**（12~21 CPU 秒同量级），只改变「摊在几个核、摊多久」。
`optimizeSync()` 恰是「多核瞬间打满」形态，且会阻塞调用它的 worker 线程（与既有验证一致：`engine.info()` 延迟 ≈ optimize 用时）。

### 2.2 不调它的后果（臂 A / B）

| 观察项 | 结果 |
|---|---|
| 写入后 `indexCompleteness.dense` | **恒为 0**（向量全部停留在 flat 缓冲） |
| 写入后静置 180s（720 次采样） | **0 次 CPU 尖峰**；completeness 始终 0（tail 段 5.88 CPU 秒全部来自探针查询本身） |
| 重开后 | completeness **仍为 0** —— 不是「没刷盘」，是**索引真的没建** |
| 写入阶段本身 | 16000 次 upsert 仅 ≈3.4~3.8 CPU 秒、6.8s（150 批）→ 快且无尾巴 |

⇒ 原先「写完会自愈、引擎会自己整理」的假设**被证伪**：引擎不会自发建索引（至少在 180s 观察窗内没有任何后台活动）。

### 2.3 现网只读探测（未修改任何数据）

21 个 scope **全部** `indexCompleteness.dense = 0`，含最大的几个：

| scope | docCount | indexCompleteness |
|---|---|---|
| `ai-docs-v3` | 28491 | `{"dense":0}` |
| `ai-docs` | 24980 | `{"dense":0}` |
| `k8s` | 3973 | `{"dense":0}` |
| `docker` / `kisearch` / `kafka` / `bkmon-*` / … | 4 ~ 3287 | 全部 `{"dense":0}` |

⇒ **生产环境从未建立过 dense 索引**，语义检索一直跑在 flat 缓冲的暴力扫描上。
本次规模下尚可（15000 篇时查询 p95 ≈ 9ms），但按「10 万文档 / 100 万 chunk」目标不可持续。

### 2.4 与生产那 11 分钟的关系（关键反证）

| 项 | 数值 |
|---|---|
| 生产现场（15546 向量，`rocksdb+` 单核） | ~11 分钟 ≈ **660 单核秒** |
| 实测：15000 向量的索引构建 | ≈ **20 单核秒** |
| 差距 | **20~30 倍** |

⇒ **那 11 分钟的主体不是「建索引」**，而是另一批后台工作（最可能是 FTS / 标量 / idmap 等 RocksDB 存储的 flush/compaction）。
我们的合成数据（800B 中文 + 标量 + 覆盖写）**未能复现**该尾巴（写入后 2.3s 静默、180s 无尖峰）→ 交给实验 2。

---

## 3. 结论（可直接用于决策）

1. `optimize()` 是**唯一**能让 dense 索引就绪的路径。不调 → 索引永远不建；引擎不自发整理。
2. 它对「CPU 100%」的作用是**形态控制**，不是总量削减：
   - 要「不占多核 / 可预期」→ `concurrency: 1`（单核跑满，≈13s / 8000 文档）
   - 要「尽快结束」→ 提高 concurrency（占用更多核）
3. 当前封装 `optimizeSync()`（`worker.ts:146-147`）应替换为 `await optimize({concurrency: N})`：既避免阻塞自身 worker，又能限核。
4. `collection.stats.indexCompleteness`（0→1；重开后仍可读）是现成的「索引就绪」信号，可直接用于阶段展示与两级终态判定。
5. **生产那 11 分钟不能靠「调 optimize」消掉**（属另一批工作）；但「索引从来没建」这件事的严重性高于那 11 分钟。

---

## 4. 对 REQ-20261009-003 假设的修正

| 原假设 | 修正后 |
|---|---|
| H1「`optimize()` 返回即索引就绪」 | 保留，但**判据改为 `stats.indexCompleteness == 1`**（本实验两口径均达成，重开后仍为 1） |
| H4「引擎自动整理无信号」 | 更正为两点：① 引擎**不会**自动建索引（180s 内零后台活动）；② 信号本来就存在（`indexCompleteness`），是我们没接出来 |
| 新增条（建议 R6） | **dense 索引就绪**应成为独立需求项：现网全库 completeness = 0，检索一直是暴力扫描 |
| Q2（导入收尾是否调 optimize） | 已有实测依据：可调，但必须 ① 异步版（不阻塞 worker）② `concurrency` 限核 |
| Q4（并发上限） | 实测：`concurrency:1` ≈ 1 核；`4` ≈ 2.4 核；auto ≈ 4.3 核 |

---

## 5. 方法论教训（避免复犯）

- `/proc/self/task/*/stat` 逐线程求和会**低估** CPU：若工作线程在两次采样之间退出，其用量不会进入差值。本次 D/G 臂被低估约 **10 倍**（1.3 vs 13.0 CPU 秒），一度导出错误结论。
- 结论：**CPU 总量一律以 `process.cpuUsage()` 为准**；`/proc` 只用于定位「哪个线程在忙」（例如生产现场的 `rocksdb+`）。

---

## 6. 复现命令

```bash
# 三臂对照（auto / 1 / 4）
npx jiti temp/exp-indexing-cpu.ts --n=8000 --passes=1 --cap=90 --arms=C,D,G
# 静置观察（不调 optimize，180 秒）
npx jiti temp/exp-indexing-cpu.ts --n=15000 --passes=1 --cap=180 --observe=180 --arms=A

# 现网只读探测（不改数据）：
#   node -e "const zv=require('@zvec/zvec'); const c=zv.ZVecOpen(path,{readOnly:true}); console.log(c.stats)"
```

---

## 7. 原始采样（证据）

| 文件 | 内容 |
|---|---|
| `review/exp-1-raw-A-observe.json` | 臂 A：15000 篇写入 + 180s 静置（720 次采样，含 0 尖峰证据） |
| `review/exp-1-raw-CDG.json` | 臂 C / D / G：8000 篇两轮覆盖，三臂对照（含 getrusage 与 /proc 双口径） |

采样现场目录 `temp/exp-cpu-1791538547214`（194MB，臂 B 的落盘结构）为临时产物，可随时清理。
