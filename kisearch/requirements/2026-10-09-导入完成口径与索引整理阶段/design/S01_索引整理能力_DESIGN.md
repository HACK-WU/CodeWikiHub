# S-01 索引整理能力（引擎 `optimize` 扩展 + 单飞编排 + 降级/重试）

## 1. 术语

- **整理（optimize）**：调用引擎原生 `optimize`，让 dense 索引等内部结构就绪；完成后 `indexCompleteness.dense` 由 0 → 1。
- **整理单飞**：**进程内**同时只允许一个 scope 的整理在跑（见 §3.3 与 D2 的口径说明）。
- **超时 = 中断（本期口径）**：超过 `timeoutMs` 即判定整理**未完成**，调用方停止等待并记录 `degraded:'timeout'`；进程退出会终止正在跑的 worker（原生无 abort API），因此**不声称"底层继续跑完"**（评审 #2 修复）。可观测靠 `readiness`（信号未激活）+ 任务 `indexState`，可恢复靠重试入口。
- **降级**：整理失败/超时**不判任务失败**，返回结构化 `degraded` 原因（S-02 据此展示）。

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/zvec-engine/engine.ts:335-337` | `async optimize(): Promise<void>` → `proxy.send('optimize', {})`——**无参，无法限核** |
| `src/zvec-engine/worker-protocol.ts:92` | `{ kind:'optimize'; payload: Record<string, never> }` |
| `src/zvec-engine/worker.ts:146-148` | `ensureCollection().optimizeSync(); return null;`——**同步调用**（阻塞 worker；实验 1：多核暴涨、`info()` 延迟 212ms） |
| 原生能力（未用上） | `ZVecCollection.optimize(options?: ZVecOptimizeOptions): Promise<void>`；`ZVecOptimizeOptions{ concurrency?: number }`（0=自动）——`node_modules/@zvec/zvec/src/index.d.ts:965-971 / 1383 / 1391` |
| 调用方 | **全仓无调用方**（`optimize(` 仅定义处）⇒ 现网 23/23 scope 有索引实体但信号恒 0 |
| 队列 kind 推导 | `src/lib/operation-coordinator.ts:35-37`：`operation === 'import' ? 'engine-only' : 'write'`——**新 operation 会缺省落到 `write`（与 read 互斥）** |

## 3. 方案（TO-BE）

### 3.0 非功能性默认假设（评审 #7 补齐）

- 部署形态：**单机、单 daemon、单用户**；`maxWorkers = 4`（既有），无并发导入常态。
- 规模假设：单 scope 万级文档（15594 chunks 量级）；整理耗时按现场 ~10 分钟量级设计超时。
- 资源假设：整理限 `concurrency: 1`（≈1 核，实验 1）；允许占用期间同 scope 检索排队。
- 不做跨进程串行（D2）；不做断点续跑（进程退出即中断，靠重试）。

### 3.1 引擎三处扩展（保持 worker actor 串行，改用原生**异步**）

```ts
// src/zvec-engine/engine.ts
async optimize(options?: { concurrency?: number }): Promise<void> {
  await this.proxy.send('optimize', options?.concurrency !== undefined ? { concurrency: options.concurrency } : {});
}

// src/zvec-engine/worker-protocol.ts
| { id: string; kind: 'optimize'; payload: { concurrency?: number } }

// src/zvec-engine/worker.ts
case 'optimize': {
  const p = req.payload as { concurrency?: number };
  await ensureCollection().optimize(p.concurrency !== undefined ? { concurrency: p.concurrency } : undefined);
  return null;
}
```

> **必须** `npm run build:zvec-engine` 重建 dist（worker 只加载编译产物；只改 src = 假更新）。

### 3.2 向量客户端新增原语（`src/lib/vector-client.ts`）

职责：`withEngine` 内调用引擎 + 超时判定 + 结构化结果；**不做**全局串行（属编排层）。**不提供 `abortSignal`**（评审 #8：原生无法中断，提供该参数会误导调用方）。

### 3.3 新增编排模块 `src/lib/index-maintenance.ts`

- 进程级**单飞队列**（进程内 ≤1）+ 同 scope **去重合并**
- 执行时**显式**经 coordinator 入队，**两处都要改**（评审 #1）：
  1. 调用处显式传 `kind: 'engine-only'`（不依赖缺省推导）；
  2. **在 `kindForOperation` 登记 `'vector-optimize' → 'engine-only'`**（`operation-coordinator.ts:35-37`）——否则 daemon / HTTP 两个入口各写一份判断，会重演"入口漏标"事故（同 `daemon-rpc.ts:489-493` 的教训）。
- **跨进程口径（评审 #4）**：单飞仅保证**进程内** ≤1。同 scope 的跨进程并发已被既有 collection flock 排除（引擎独占锁），跨进程只可能发生在**不同 scope** ⇒ 纯 CPU 竞争、非正确性问题；整理日志带 `pid + scope` 供事后判定。
- 维护可读状态（running / queued / last）

### 3.4 可重试入口（失败/超时后用户能补救）

- CLI：新增 `src/index-optimize.ts` + `bin/ki.mjs` 命令表一行 → `ki index-optimize --scope <s> [--concurrency N]`
  - **入口护栏**（评审 #12）：`validateScope` + 解析 daemon 路由（`shouldUseDaemonClient()`，与其它命令一致）；输出 JSON，失败退出码 1。
- HTTP：`POST /api/vector/optimize` → `mcp-http-api.ts::handleVectorOptimize`
  - **必须同步加入 `handleApiRequest` 的 query scope 越权校验列表**（评审 #11，项目已知坑：新增带 scope 参数的接口不登记就不受越权拦截）。

### 3.5 配置（`src/lib/config-schema.ts`）

```yaml
vector:
  optimize:
    enabled: true        # 导入收尾是否自动整理
    concurrency: 1       # 0 = 引擎自动；>0 传给原生（实验 1：1 ≈ 1.0 核，4 ≈ 2.4 核）
    timeoutMs: 600000    # 整理等待上限；超时 = 中断（见术语），当前为经验值，待实测校准
```

### 3.6 性能 & 安全（评审 #7 补齐）

| 维度 | 事实 / 口径 |
|---|---|
| CPU | 整理是单核重活（现场 ~10 分钟）；`concurrency:1` 锁定 ≈1 核；多 scope 并发受 `maxWorkers:4` 与单飞闸门约束 |
| 延迟影响 | 整理期间**同 scope** 的引擎操作（检索、写入）在 worker 消息队列排队；**其他 scope 不受影响**（现场二实测同进程其它 scope 2ms） |
| 元数据读 | 不碰引擎 ⇒ 不受整理影响（R3/S-04） |
| 权限 | 新 CLI 命令走 `validateScope`；新 HTTP 端点必须登记越权校验（§3.4） |
| 误用防护 | 不支持"取消整理"（无 abort）；不支持并发重复整理（单飞去重）；`enabled:false` 时完全不触发 |

## 4. 接口设计

```ts
// src/lib/vector-client.ts
export interface OptimizeIndexOptions { concurrency?: number; timeoutMs?: number }
export type OptimizeIndexOutcome =
  | { ok: true; wallMs: number }
  | { ok: false; degraded: 'timeout' | 'unavailable' | 'error'; reason: string; waitedMs: number };
export async function optimizeVectorIndex(scope: string, options?: OptimizeIndexOptions): Promise<OptimizeIndexOutcome>;

// src/lib/index-maintenance.ts
export interface IndexMaintenanceState {
  running: string | null;
  queued: string[];
  last?: { scope: string; at: number; ok: boolean; wallMs: number; degraded?: 'timeout' | 'unavailable' | 'error'; reason?: string; pid?: number };
}
export function scheduleIndexMaintenance(scope: string, opts?: { reason?: 'import' | 'manual' }): { accepted: boolean; merged: boolean };
export function getIndexMaintenanceState(): IndexMaintenanceState;
/** CLI 等待 / 测试用：等待当前与排队中的整理全部落定 */
export async function whenIndexMaintenanceIdle(timeoutMs?: number): Promise<void>;
```

**Demo 返回示例（CLI `ki index-optimize -s ai-docs`）**

```json
{
  "ok": true, "action": "index-optimize", "scope": "ai-docs",
  "wallMs": 41230, "concurrency": 1,
  "readiness": { "ready": true, "judgedBy": "signal", "signal": 1, "entity": { "exists": true, "bytes": 119386112 } }
}
```

**Demo 返回示例（超时 = 中断）**

```json
{
  "ok": true, "action": "index-optimize", "scope": "ai-docs", "degraded": "timeout",
  "waitedMs": 600000,
  "hint": "索引整理未在 600s 内完成，已停止等待（整理被中断）；可稍后重试 ki index-optimize -s ai-docs"
}
```

## 5. 关键决策点

| # | 决策 | 被否决方案 + 理由 | 重新评估触发条件 |
|---|---|---|---|
| D1 | **复用 `engine-only` kind**（调用处显式传 + 在 `kindForOperation` 登记） | 新增 `maintenance` kind：语义与 engine-only 重叠（与写互斥、被读旁路），却要动队列枚举 + 全部测试面 | 若整理需要与写**并行**执行 |
| D2 | 单飞闸门放 `index-maintenance.ts`（**进程内** ≤1），跨进程并发登记为已知限制 | ① 放 coordinator：它是 per-scope 队列，无"全局 ≤1"概念；用 `GLOBAL_SCOPE` 会阻塞所有 scope 的写。② 补跨进程锁：`withScopeWriteLock` 是 fail-fast，CLI 撞上 daemon 的 10 分钟整理会直接失败（新增用户可见失败）；而收益仅为 1 核 → 2 核 | **可观测判据**：日志出现"两个进程同时整理"（`getIndexMaintenanceState().last.pid` 与另一进程日志并存），或单机核数吃紧 → 补锁（复用 `scope-write-lock.ts` 已验证的惰性 stale 回收） |
| D3 | **超时 = 中断**：超时后停止等待并记录 `degraded:'timeout'`；不声称"底层继续跑完"；可观测靠 `readiness`（信号未激活）+ 任务 `indexState='failed:timeout'`；恢复靠重试入口 | (a) CLI 无限等：大库会挂死终端且无法取消；(c) 新增"整理中断标记"文件：多一个状态文件要维护，而"信号未激活"已能观测到未完成（若将来需要区分"从未整理"与"整理被中断"，再引入 marker，见待定 3） | 引擎提供 abort / 进度回调；或用户要求"中断后自动续跑" |
| D4 | 经引擎封装扩展，而非在 CLI 层直调原生 | CLI 直调原生：绕过 worker / 锁体系，多进程必崩 | 无 |
| D5 | `concurrency` 默认 **1** | 默认 0（引擎自动）：实验 1 实测总 CPU 不降、峰值多核（8000 向量 ≈ 4.3 核） | 用户独享机器且接受 CPU 峰值 |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 引擎不可用（锁被占/损坏） | `degraded:'unavailable'`（fastFail，不打开引擎），任务保持「可用」 | 是（hint） |
| 整理超过 `timeoutMs` | `degraded:'timeout'` = **中断**；`indexState='failed:timeout'`；`readiness` 显示信号未激活 | 是（hint） |
| 进程退出（CLI 结束 / 被 Ctrl+C / 被 kill） | 正在跑的整理**被中断**（worker 退出），不写任何"完成"标记；下次导入或 `ki index-optimize` 重新触发 | 是（`readiness` + hint） |
| 原生抛错（含维度不匹配） | `degraded:'error'` + 原始 message/code 透出 | 是 |
| 同 scope 重复入队 | 合并（`merged:true`），不重复执行 | 否 |
| `enabled=false` | 不入队，`indexState='skipped'` | 是（展示为"未整理"） |

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/zvec-engine/{engine,worker,worker-protocol}.ts` | `optimize` 增参 + 改异步（**须重建 dist**） |
| `src/lib/vector-client.ts` | 新增 `optimizeVectorIndex` |
| `src/lib/index-maintenance.ts` | 新增（单飞队列 + 状态 + pid 日志） |
| `src/lib/operation-coordinator.ts` | `kindForOperation` 登记 `'vector-optimize' → 'engine-only'` |
| `src/index-optimize.ts` + `bin/ki.mjs` | 新增 CLI 命令（`validateScope` + daemon 路由） |
| `src/lib/config-schema.ts` | 新增 `vector.optimize.{enabled,concurrency,timeoutMs}` |
| `src/lib/mcp-http-api.ts` | 新增 `POST /api/vector/optimize` + **登记越权校验列表** |
| `src/lib/health-check.ts` | `ki doctor` 增加"索引整理未完成"的可观测口径（读 `readiness`，见 S-03） |
| `docs/{cli,mcp-http,config}.md` | 同步文档 |

## 8. 待定问题

1. `timeoutMs` 默认 600s 为**经验值**（现场尾巴 ~10 分钟量级）→ 实现后按真实耗时校准，配置项保留。
2. 是否需要"无导入时批量整理存量 scope"（`ki doctor --optimize-all`）？→ **P2**，本设计只留 `readIndexReadiness`（S-03）供其调用。
3. 是否需要引入"整理中断标记"以区分"从未整理"与"整理被中断"？→ **P2**；当前靠 `readiness`（信号未激活）+ `indexState` 即可观测。
