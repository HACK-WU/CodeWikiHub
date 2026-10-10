# Debug Report：大批量导入"提示已完成"后，该 scope 知识目录加载不出来 + node 单核 CPU 100%

> 排查时间：2026-10-09 16:57–17:02（现象现场复现，非事后推测）
> 触发场景：Web 导入 `ai-docs-v3`（634 组 / 15546 条向量），任务 16:51:32 报 `succeeded`
> 关联需求：REQ-20260930-002《单Scope大规模数据存储与导入可用性》（建议把"目录可用性"纳入其条目）

## 🔍 排查结论

**现象**：导入页显示"已完成"后，Browse/文档列表在该 scope 一直加载不出（前端显示「全部文档 · 0 篇」+ 骨架），node 进程单核 100% CPU，数分钟后自愈；其他 scope 完全正常。

**证据链**（均为本次实跑采集）：

| # | 证据 | 来源 |
|---|------|------|
| 1 | 导入任务 16:45:30 开始、**16:51:32 `succeeded`**，`partialCommitted: 15546`、`phase: persist` | `/root/.ki-data/.ki-tasks/8ba7bc42-….json` |
| 2 | 向量批次 **1141/1141 全完成**、`activeTasks 0`、`inFlightRequests 0`；但 `retries 983` / `rateLimited 983`（provider 限流拉长导入窗口） | `GET /healthz` → `vectorization` |
| 3 | 16:51 批量写 633 个 relations 分片（导入收尾）；**16:52–17:0x 期间 `/root/.ki/vector/collections/ai-docs-v3/**` 持续变更 88 个文件**：`idmap.0/000015.log`、新建 `MANIFEST-000020`、`fts.2.rocksdb/000045.sst`、`scalar.4.ipc` → 引擎仍在做**写入后处理（RocksDB flush/compaction + 索引落盘）** | `find … -newermt "-20 minutes"`、`du` |
| 4 | CPU 全部在该进程的一个 **native 线程**：`TID 599838 state=R utime 51493→51891（4s 涨 4s ≈ 100% 单核用户态）、stime 不变`；**主线程（PID 598864）累计仅 19s CPU、0%**；`eventLoopDelayMs 20ms`（事件循环健康） | `top -H -p 598864`、`/proc/<pid>/task/<tid>/stat`、healthz |
| 5 | 进程 `write_bytes` 3 分钟零增长、`syscw` 小增 → **不是磁盘 IO 瓶颈**，是纯计算 + 元数据写 | `/proc/598864/io` 两次采样 |
| 6 | **`queue: {activeWorkers:1, maxWorkers:4, queues:{"ai-docs-v3":4 → 5}}`** —— 该 scope 队列持续积压 | `GET /healthz` 多次采样 |
| 7 | **只有该 scope 的 doc/list 挂死**：`/api/doc/list?scope=ai-docs-v3` → **25s / 10s 均超时（http=000）**；`scope=k8s` 同接口 **3ms**；`/api/vector/status?scope=ai-docs-v3` **0.86ms**；`/healthz` 1.8ms | `curl -w "%{time_total}"` |
| 8 | 7423 上有 9 个本地 ESTAB 连接挂着（前端并发请求连上不返回） | `ss -tnp | grep 598864` |
| 9 | **自愈被复现**：17:02:28 `doc/list` → **200 / 0.022s**，`queue` → `{activeWorkers:0, queues:{}}`；同时新出现的 100% 线程名为 **`rocksdb+`**（直接点名 CPU 热点是 RocksDB 后台线程） | 100s 后复测 + `top -H` |

**直接原因**：`/api/doc/list` 经 `getSharedOperationCoordinator().submit(…, [scope])` 与**同 scope 的引擎任务串行**；导入的写入后处理（RocksDB compaction / 索引落盘，分钟级、CPU 密集）期间，占用该 scope 的任务迟迟不返回 → 后续同 scope 请求全部排队 → 前端目录请求挂起（骨架 + 0 篇）。

**根本原因**：**「导入完成」的判定口径 ≠ 用户可见的「可浏览」**——任务台账在"向量批次全部提交"时即置 `succeeded`（16:51:32），而引擎的写入后处理仍在进行；同时"纯元数据读"的 `doc-list` 被设计为与引擎类操作共用同 scope 串行队列（原意是避免读到导入中间态），于是被连带阻塞。触发条件是**数据量大**（15546 条向量）叠加 **provider 限流**（983 次重试）。

**引入点**：架构层面（队列互斥粒度 + 完成信号口径），非近期改动引入；与 2026-09-30 的同类观察（当时结论"待验证候选"）一致，本次已确认。

## 🕸 根因树

```text
{现象：导入提示完成后，该 scope 目录加载不出（0 篇+骨架）；node 单核 CPU 100%；数分钟后自愈；其他 scope 正常}
  ▼
{直接原因：ai-docs-v3 队列积压（healthz.queue.queues["ai-docs-v3"]=4→5），doc/list 与引擎任务同 scope 串行 → 请求排队}
  ├─ 触发条件 1：引擎写入后处理未结束（vector/collections/ai-docs-v3 持续变更 88 文件；RocksDB 线程 100% CPU）← 证据 3/4/9
  └─ 触发条件 2：doc-list 被并入同 scope 串行队列（mcp-http-api.ts /doc/list → coordinator.submit([scope])）← 证据 6/7
  ▼
{根本原因 ← 根因：「导入完成」判定 = 向量批次提交完成，而引擎收尾仍在后台；元数据读与引擎操作共用同一 scope 互斥维度}（完成口径 + 队列粒度）
  ▼
{引入点：架构设计（非近期改动）；2026-09-30 已观察未定性}
```

## 📌 影响面

- 受影响：**刚完成大批量导入的那个 scope** 的 Browse/文档列表（以及该 scope 内一切走同队列的操作，含 `ki search`）。
- 不受影响：其他 scope（队列按 scope 独立）、`/healthz`、`vector/status` 等不经该队列的接口。
- 窗口：与导入量正相关，本次约 **10 分钟**（16:51 完成 → 17:02 恢复）。
- 用户体验：页面显示"导入完成"却"看不见文档"，且空态文案是「全部文档 · 0 篇」——**误导**（数据其实都在）。

## 🎯 修复方向（按性价比，待决策）

1. **让元数据只读接口不再与引擎任务同队列**（收益最大）：把互斥维度从"scope 集合"细化为"写锁 / 引擎锁"——`doc-list` 只需与"元数据提交窗口"互斥（导入的元数据落盘是最后一步，分片写可保证原子），无需等待引擎 compaction。预期：目录恢复从分钟级降到毫秒级。
2. **把引擎收尾纳入任务状态**：任务不早于"该 scope 队列空闲/引擎 worker 空闲"再置 `succeeded`（或新增 `finalizing` 阶段），前端显示"索引整理中"，消除"完成却看不到"的认知矛盾。
3. **前端容错**：`docList` 请求加超时与重试提示（"服务端正在完成索引，请稍候"），而不是落到空态「0 篇」；后端可在该窗口返回 `503 + Retry-After` 让前端显式重试。
4. **降低收尾成本**：批量 upsert 的索引落盘/compaction 策略与 provider 限流退避（983 次重试占了导入 6 分钟的大部分）。

> 按 debug 流程：根因属系统性（跨模块：coordinator + 引擎 + 前端空态），且存在多个候选方案 → **建议修复前先过 `bug-impact-analysis`** 评估方案与影响面。

---

## ✅ 验证结果：`engine.optimize()` 能否作为「索引就绪」信号（2026-10-09，实跑 2 次，结论一致）

**方法**：隔离环境（`test/test-config.ts` 临时 config：vectorDir 指向临时目录、真实 embedding provider）+ 6 个 md × 42 个 chunk 向量。
脚本 `temp/verify-optimize-semantics.ts`，完整输出 `temp/verify-optimize-report.txt`（未触碰真实 scope 与 `~/.ki/vector`）。

| 结论 | 证据 |
|---|---|
| ✅ **A1 成立：`optimize()` = 整理 + 落盘 + 版本切换**，返回即"索引就绪" | optimize 后：新增 `0/dense.index.5.proxima (3.6MB)`；FTS/scalar 刷出多个 `.sst`；**`0/scalar.0.ipc: 0B → 18434B`**（列存此前为空）；`manifest.0 → manifest.3`；**删除旧版本 `dense.index.3.proxima`**；`idmap.0/000008.sst` |
| ✅ **返回后数据持久**：close + reopen 可读 | `reopenMs 339ms`、`docCount 80`、语义 query 仍命中 10 条 |
| ⚠️ **optimize 独占 worker**：期间同 scope 引擎调用被阻塞 | optimize 用时 **233ms**，同期 `engine.info()` 延迟 **212ms**（≈ 全程等待）→ 该调用在 `worker.ts:147` 是 `optimizeSync()` 同步执行 |
| ✅ 导入返回时**已经可搜**（小数据） | 导入返回瞬间 probe 命中 10 条；optimize 前后命中集合与数量一致（`hybridKeyword/hybridSemantic` 均 10）→ "未 optimize 就搜不到"**不成立** |
| ⚠️ 未 optimize 时列存为空 | 导入返回时 `0/scalar.0.ipc = 0 字节`，optimize 后才写入 18KB → **检索结果的内容/字段在未整理时是否完整尚未验证**（本次未检查返回 content） |
| ⚠️ 静置 3s 无后台变化（小数据） | `afterIdle3s.indexDiff = {added:[],removed:[],changed:[]}` → 小数据下不触发后台自动整理；而现网 `ai-docs-v3` 的 `.5.proxima`/MANIFEST 变化发生在**我们没有调用 optimize** 的情况下 → **引擎会自动整理**（阈值/后台触发），其信号不可观测 |

**局限**：单次仅 42 个向量，无法外推大数据耗时（现网唯一数据点：15546 向量 ≈ 10 分钟后台整理）；未测 optimize 期间端到端 `ki search`（含 embedding 与 coordinator 队列）的延迟。

**对方案的影响（修正 §7）**：
1. 严格等待模式（B）**技术可行且信号可靠**（optimize 返回 = 已落盘、可重开），但**代价是独占该 scope 的引擎**——大数据下等于把"检索排队/目录排队"延长到整理结束；因此**必须与"解耦元数据只读接口"捆绑**（否则用户等待更久且仍看不到）。
2. 更推荐的组合：**导入收尾异步触发 `optimize()`（不推迟"可用"）+ 任务新增 `indexing` 阶段 + `doc-list` 与引擎收尾解耦**；终态分两级（① 可用 ② 已优化），并在整理期提示"该库检索可能变慢"。
3. 若不做主动 optimize，就只能等引擎自动整理，**当前没有任何可观测信号**（healthz 只有队列计数）→ 若走该路线需引擎侧补状态（成本更高）。

## 🧪 下次现场自证（30 秒）

```bash
# 1) 队列是否积压（关键）
curl -s http://127.0.0.1:7423/healthz | grep -o '"queue":{[^}]*}[^}]*}'
# 2) 该 scope 目录接口是否排队（对照其他 scope）
curl -s -o /dev/null -w "doc/list %{http_code} %{time_total}s\n" "http://127.0.0.1:7423/api/doc/list?scope=<刚导入的scope>"
# 3) CPU 热点在哪个线程（rocksdb+/node；主线程忙不忙）
top -b -n1 -H -p <daemon_pid> | head -12
```
