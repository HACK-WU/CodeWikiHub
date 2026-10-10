# S-03 索引就绪判据与可观测（实体 + 信号，A11 落地）

## 1. 术语

- **索引实体**：`<vectorDir>/collections/<scope>/0/dense.index.*.proxima`（现网 23/23 scope 均存在，5MB~119MB）。
- **索引信号**：`stats.indexCompleteness.dense`——**已核定（Q7 / 实验 3）：≠ 实体是否存在**，更像"已被显式整理（`optimize()` 路径）激活"的标记；现网 11 个新鲜快照**全为 0**。
- **A11 交叉口径**：`ready = signal === 1 || (entity.exists && entity.bytes > 0)`——**不得**因信号为 0 把已落盘的索引判成"未建"。
- **快路径 / 任务路径**（评审 #18 定稿）：`includeSignal: false` 为**默认**（纯 fs 扫描、不开引擎）；**任务完成路径显式传 `true`**（要留证据）。

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/zvec-engine/{worker,engine}.ts` → `src/lib/vector-client.ts:1573`（`vectorCollectionDiagnostics`） | `indexCompleteness` 透传链已通 |
| `src/lib/health-check.ts`（`ki doctor`） | 已展示该信号（**纯信号，无实体交叉**） |
| `src/lib/vector-dimension-snapshot.ts`、`mcp-http-api.ts`（`/api/vector/status`） | 已暴露信号 |
| 任务 / 任务中心 | **未接**（`TaskRecord` 无索引相关字段） |
| 缺口 | ① 判据只看信号 ⇒ 把"实体已落盘、信号为 0"误判为未建（Q7 教训：会重复整理、浪费 CPU）；② 用户看不到"这个库索引到底有没有"；③ 整理是否真的产出了实体，没有证据链 |

## 3. 方案（TO-BE）

### 3.1 新增 `src/lib/index-readiness.ts`

**只读**判定模块：实体扫描走纯 fs（不开引擎），信号读取走 `vectorCollectionDiagnostics`（可失败、可超时、默认不读）。

### 3.2 判定规则（写死、可单测）

| 条件 | `ready` | `judgedBy` | 说明 |
|---|---|---|---|
| `signal === 1` | true | `signal` | 已显式整理 |
| `signal === 0` 且 `entity.exists && bytes > 0` | **true** | `entity` | 引擎自行落盘过（A11：不得判未建） |
| `signal === null`（未读/读不到）且实体有效 | true | `entity` | 快路径的常态结论 |
| 实体存在但 `bytes === 0` | false | `none` | 空壳不算就绪 |
| 实体不存在 | false | `none` | 真无索引（`degraded` 标出原因） |

> **布局依赖声明**（评审 #19）：路径中的 `<collection>/0/` 是引擎内部布局（索引段目录名）。若引擎升级改变布局，实体扫描会失效 ⇒ 判定退化为"仅信号"，需**重评本条**（列为重评触发条件）。

### 3.3 暴露面（评审 #6 决策：接出到任务 / 任务中心）

| 端 | 变更 |
|---|---|
| **任务台账 / 任务中心 / 导入页** | S-02 在整理落定后写入 `indexReadiness`（`includeSignal:true`）⇒ 展示「已优化（实体 114MB · 信号 1）」或「可用（索引未就绪）」；**这是 R6 要求的两处接线**，不再以 `indexState` 替代 |
| `GET /api/vector/status` | 增 `readiness`（默认**快路径**：`includeSignal:false`；`?signal=1` 时读信号，读信号复用 R8 的超时降级） |
| `ki doctor` | 文案改为交叉口径：`索引：已就绪（实体 114MB · 信号 0 → 按实体判定）`；未就绪时提示重试命令 |
| `ki doctor --scan-index`（P2） | 输出各 scope readiness 表（存量"待整理"清单），本期只留函数接口 |

## 4. 接口设计

```ts
// src/lib/index-readiness.ts
export interface IndexReadiness {
  scope: string;
  /** 0=未激活 1=已整理 null=未读或读不到（引擎不可用/超时） */
  signal: 0 | 1 | null;
  entity: { exists: boolean; bytes: number; mtimeMs?: number; file?: string };
  ready: boolean;
  judgedBy: 'signal' | 'entity' | 'none';
  degraded?: 'unavailable' | 'timeout';
}
export async function readIndexReadiness(
  scope: string,
  opts?: { timeoutMs?: number; includeSignal?: boolean },   // includeSignal 默认 false（快路径）
): Promise<IndexReadiness>;
```

**Demo（`GET /api/vector/status?signal=1`：任务路径同款，含信号）**

```json
{
  "ok": true, "scope": "ai-docs",
  "readiness": {
    "scope": "ai-docs", "signal": 0,
    "entity": { "exists": true, "bytes": 119386112, "mtimeMs": 1760000000000, "file": "dense.index.3.proxima" },
    "ready": true, "judgedBy": "entity"
  }
}
```

**Demo（默认快路径 `?signal` 省略：不读信号）**

```json
{
  "ok": true, "scope": "ai-docs",
  "readiness": {
    "scope": "ai-docs", "signal": null,
    "entity": { "exists": true, "bytes": 119386112 },
    "ready": true, "judgedBy": "entity"
  }
}
```

## 5. 关键决策点

| # | 决策 | 被否决方案 + 理由 | 重新评估触发条件 |
|---|---|---|---|
| D1 | 判据 = **实体 ∨ 信号**（实体优先兜底） | 只用信号（现状）：把已建索引判成未建（Q7 反例）；只用实体：无法区分"引擎自行落盘"与"已显式整理" | 引擎修正信号语义（信号=实体）后简化为单判据 |
| D2 | 实体扫描**不开引擎** | 开引擎读 stats：慢、可能与整理/导入抢锁 | 无 |
| D3 | `includeSignal` 默认 false，**任务完成路径显式 true** | 全部默认 true：每次 `/api/vector/status` 都要开引擎（成本 + 抢锁）；全部 false：任务侧拿不到信号证据，R6/A11 落空 | 引擎提供廉价信号读取通道时 |
| D4 | "重开校验"不进默认路径 | 默认重开：需关闭+重开引擎（秒级、抢锁），代价过高 | `ki doctor --verify-index` 显式请求（P2） |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 引擎不可用（锁被占） | `signal:null` + `degraded:'unavailable'`；实体结论照给 | 是 |
| 信号读取超时 | `degraded:'timeout'`（复用 `withTimeoutFallback`） | 是 |
| 集合目录不存在 | `entity.exists=false`、`ready=false` | 是 |
| 实体文件存在但为空 | `exists=true, bytes=0` ⇒ `ready=false` + 备注 | 是 |

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/index-readiness.ts` | 新增（判定 + 实体扫描） |
| `src/lib/mcp-http-api.ts` | `/api/vector/status` 增 `readiness`（+ `?signal=1`） |
| `src/lib/health-check.ts` | 文案改交叉口径 + 未就绪提示重试 |
| `src/lib/task-registry.ts` / `src/lib/mcp-http-api.ts` | 承接 `indexReadiness` 字段（写入方见 S-02） |
| `test/index-readiness.test.ts` | 新增（信号/实体四组合 + 空文件 + 不可用降级） |

## 8. 待定问题

1. 存量 scope 的"待整理"批量扫描（`ki doctor --scan-index`）本期是否要做？→ **P2**，先不做。
2. `readiness` 是否需要"重开校验"档位（`--verify-index`）？→ **P2**。
