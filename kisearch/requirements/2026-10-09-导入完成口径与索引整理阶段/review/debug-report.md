# 排查报告：导入完成后的引擎收尾期，该 scope 页面请求全部挂起

**日期**：2026-10-10　**关联需求**：REQ-20261009-003（导入完成口径两级化与索引整理阶段）
**现象**：`ai-docs-v4` 导入显示完成后（任务台账 `succeeded`），该 scope 的 `/api/doc/list`、`/api/doc/edit` **全部超时**（30s / 5s），前端正文永久骨架屏；左侧目录因前端缓存仍可显示。
**范围**：仅 `ai-docs-v4`（对照 `k8s` / `default` 同接口 **2ms**）；持续约 10 分钟后**自愈**。

---

## 一、证据链（全部运行时实测）

| # | 证据 | 来源 |
|---|------|------|
| 1 | `queue {ai-docs-v4: 4~6}`、`activeWorkers=1` 持续 10 分钟不前进 | `GET /healthz` |
| 2 | `doc/list`、`doc/edit` 超时；同时刻 `k8s`/`default` 同接口 **2ms** | curl 复现 + 对照 |
| 3 | 一个 worker 线程（TID 1731062，comm=`node`）**持续单核 100%** 10 分钟+ | `/proc/<pid>/task/*/stat` 两次采样差值（201 jiffies / 2s） |
| 4 | 主线程停在 `do_epoll_wait`（空闲）→ 没有 JS 在执行 | `/proc/<pid>/task/<tid>/stack` |
| 5 | 当时该库近 3 分钟 **0 文件变更** → worker 在纯计算 | `find -newermt` |
| 6 | daemon 持有 v4 的 `LOCK` + 35 个句柄；`opened 5 / closed 3` | `/proc/<pid>/fd`、`/proc/locks`、healthz |
| 7 | scope 写锁目录**没有 v4 的锁**（只有一个 22.6 小时前的陈旧 import 锁，属另一 scope/进程） | `~/.ki-data/.ki-scope-locks/`（含 `pid/token/operation/startedAt`） |
| 8 | 收尾结束瞬间**队列自愈**：`queue {}`、`doc/list` 200 / 2ms | curl + healthz |
| 9 | 产品代码中 **`optimize()` 无任何调用方** → 本次整理不是我们发起的 | `grep -rn "\.optimize(\|optimizeSync(" src/` |
| 10 | ⚠️ 收尾产物已落盘（`dense.index.3.proxima` 119MB）但 `indexCompleteness.dense` 仍为 **0** | `/api/vector/status/refresh` |

---

## 二、根因

```text
{现象：ai-docs-v4 全部请求挂起（doc/list、doc/edit 超时）}
  ▼
{直接原因：该 scope 唯一队列槽被一个永不返回的任务占住 → 后续请求全部排队}
  （证据 1 + 2：queue 积压 / activeWorkers=1；对照 scope 2ms）
  ▼
{根本原因 ← 引擎收尾期 worker 满核不响应，把"一个会与引擎交互的请求"永久挂起}
  （证据 3~6：单核 100% 纯计算 10 分钟；主线程空闲；引擎被打开并反复开关）
  ├─ 触发条件 1：该库 15546 篇 → 收尾（索引构建/落盘）为分钟级（本次 ~10 分钟）
  └─ 触发条件 2：该请求不是 engine-only → S-01 的 read 只能旁路 engine-only，跨不过它
  ▼
{为什么"读文档"会被 zvec 影响：读路径本身不碰 zvec —— 
 /doc/list、/doc/edit 的 handler 只读分片与 local KB（loadDocument/resolveSource 静态确认；
 ensureVectorAvailable 的 17 处调用方不含它们）；真正被卡的是"会打开引擎的请求"}
```

---

## 三、"收尾阶段究竟在干什么"（本次新证据）

- **产物**（收尾瞬间写入）：`0/dense.index.3.proxima`（**119MB**）、`0/fts.2.rocksdb/*.sst`（含 52MB 的 `000028.sst`）、`0/scalar.0.ipc`、`0/scalar.index.1.rocksdb/000016.sst`
- **形态**：单核 100% 纯用户态计算（`/proc/<pid>/io` 的 read/write bytes 采样无变化），持续约 10 分钟
- **触发者**：**不是我们的代码** —— 全仓 `optimize()` 无调用方；引擎按自身调度，在写入停止后集中做整理 / 索引构建 / 落盘
- **为什么导入期 CPU 反而低**：写入走内存缓冲 + append/日志（CPU 低，只打增量），重活（flush / compaction / 索引构建）由引擎后台线程在写入压力消退后集中做（LSM 常规行为）

---

## 四、改进建议（用户指定记录 1、2）

### 建议 1：给"会打开引擎的请求"加超时与降级

- **现状**：`POST /api/vector/status/refresh`、`GET /api/tags`、检索类请求在引擎忙时会**无限等**；它们本质是可失败的辅助读取，挂住只会占槽。
- **建议**：为这类请求设**秒级超时**（如 3~5s），超时按"未知/降级"返回（保留上次快照 + 标注 stale），并输出一条可观测日志（哪个请求超时、等了多久）。
- **落点**：`mcp-http-api.ts` 的 `vector-status-refresh` 分支、`refreshVectorDimensionSnapshot`、`withEngine` / `ensureVectorAvailable` 的等待点。

### 建议 2：队列槽不应被"非写任务"无限期占死

- **现状**：任一非 `engine-only` 任务挂住 → 同 scope **全部**请求（含不碰 zvec 的元数据读）排队；本次现象即为此。
- **建议方向**（择一或组合）：
  - **a.** 给任务加**占槽上限**：超过阈值强制释放并返回降级结果；
  - **b.** 新增更细的 kind（如 `engine-read`）："只读引擎"的任务与元数据读互不阻塞，但仍与写互斥；
  - **c.** 让 `read` 能旁路"已知忙"的引擎任务（需引擎侧提供"忙"信号，与建议 1 配套）。
- **红线**：不能简单让 read 旁路一切任务 —— 会重新引入"读到半新半旧数据"（S-01 选项 b 是用户已拍板的边界）。

### 建议 3（归属 R2/R4，非本次新增）

导入完成后引擎收尾**没有信号**：任务 `succeeded` 而引擎仍在满核 ~10 分钟 → 需要 `indexing` 阶段与「可用 / 已优化」两级终态，让用户知道"整理中可浏览、可能慢"。

---

## 五、待确认 / 遗留

1. **占槽的具体请求未从外部确定**：需浏览器 DevTools 看 pending 的那条 URL，或服务端补请求级日志（建议 1 的实施顺带解决）。
2. ⚠️ **新发现（影响 R6 判据）**：`indexCompleteness.dense` 与实体不一致 —— 119MB 索引文件已落盘，信号仍为 0（引擎关闭后重开仍 0）。R4/R6 的验收不能只看该信号，需与索引文件 / 重开校验交叉验证。
3. **陈旧锁**：`~/.ki-data/.ki-scope-locks/d7dae1a6….lock` 是 22.6 小时前的 import 锁（`pid 3229793` 已不存在）→ 核实 `withScopeWriteLock` 的 stale 回收是否需要更积极清理。
