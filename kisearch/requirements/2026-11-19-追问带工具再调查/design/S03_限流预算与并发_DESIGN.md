# S-03 限流、预算与并发（采纳决策 A + B）

## 术语

- **硬预算**：整次追问的最长墙钟时间；到点 abort 并用已累积内容收口。
- **限流实例**：`ask-limiter.ts` 的 `(windows, inFlight, config)` 三元组（模块级单例）。

## 现状（AS-IS）

- `ask-contract.ts`：`ASK_SOFT_BUDGET_MS=25s`（检索阶段强制作答）、`ASK_HARD_BUDGET_MS=45s`（整次兜底）、`ASK_QUESTION_MAX_CHARS=4000`。
- `analysis-ask-runner.ts` 用 `acquireAskSlot(principalKey='local', scope)` → 与 `ki_ask` **共享** `(local, scope)` 频率窗 + 全局并发 2。
- 单次 `streamChat`，45s 足够；带工具循环后 45s 必然不够（分析实测 46s 才 8 轮）。

## 方案（TO-BE）

### 改动 1：取消追问硬预算（采纳 A）

- 追问 runner 当前只引用 `ASK_HARD_BUDGET_MS`（line 190）；`ASK_SOFT_BUDGET_MS` 属 `ki_ask` 检索阶段，**保留不动**（删除它属越界）。本次只移除追问 runner 对 HARD 的引用（与分析"取消总时长限制"对齐）。
- 兜底只留三层：① 用户取消（未来 SSE abort）；② 单轮请求超时 `cfg.llm.requestTimeoutMs ?? ANALYSIS_REQUEST_TIMEOUT_MS=300s`；③ 首字节超时 `cfg.llm.firstByteTimeoutMs ?? 30s`。
- `ANALYSIS_ASK_TIMEOUT` 错误码保留（仅"一字未产出且上游异常"时使用），不再由硬时钟触发。

### 改动 2：追问独立限流实例（采纳 B）

- `ask-limiter.ts` 改造：把模块级 `windows` / `inFlight` / `config` 收进可实例化的 `createAskLimiter()` 工厂，导出默认实例供 `ki_ask` 用，追问另建 `askFollowupLimiter`。
- 追问配额常量（硬编码，先不进配置）：`FOLLOWUP_RATE_MAX=6`（/60s·scope）、`FOLLOWUP_CONCURRENT_MAX=2`（与分析并发对齐）。
- 追问超限码新增 `ANALYSIS_FOLLOWUP_RATE_LIMITED` / `ANALYSIS_FOLLOWUP_BUSY`（governance-errors 单表 + status 断言，沿用 error-code 规范）。
- **窗口计数不回滚**、**finally 必释放**两条不变量沿用现有实现。

### 改动 3：轮次与 token 预算（S-01 配套）

- `ASK_TOOL_MAX_ROUNDS = 5`（ask-contract 新增常量）。
- 工具响应上限复用 `ANALYSIS_TOOL_RESPONSE_CHARS = 10000`（从 analysis-runner 导出或在本模块定义同值常量，避免循环依赖）。

### 数据模型（限流工厂化）

```ts
export interface AskLimiter {
  acquire(principalKey: string, scope: string): AskLimitDecision;
  release(): void;
  inFlight(): number;
  resetForTest(override?: Partial<LimiterConfig>): void;
}
export function createAskLimiter(cfg?: Partial<LimiterConfig>): AskLimiter;

// 默认实例（ki_ask 用，行为不变）
export const askLimiter = createAskLimiter();
export const acquireAskSlot = (p: string, s: string) => askLimiter.acquire(p, s);
// ...releaseAskSlot / askInFlight / resetAskLimiterForTest 同委托（API 签名不变）

// 追问独立实例（本模块内）
const followupLimiter = createAskLimiter({ rateMax: 6, concurrentMax: 2 });
```

| 常量 | 值 | 归属 |
|---|---|---|
| `ASK_RATE_MAX` | 10 | ki_ask 默认实例 |
| `FOLLOWUP_RATE_MAX` | 6 | 追问实例（新） |
| `FOLLOWUP_CONCURRENT_MAX` | 2 | 追问实例（新） |
| `ASK_TOOL_MAX_ROUNDS` | 5 | ask-contract（新） |

## 异常路径

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 追问频率超限 | 6 次/60s 后立即拒绝 + retryAfterSec | 是（ANALYSIS_FOLLOWUP_RATE_LIMITED） |
| 追问并发满 | 拒绝（不排队，避免叠加到长预算） | 是（ANALYSIS_FOLLOWUP_BUSY） |
| 单轮请求超时 300s | 按 fatalError 收尾（与分析同口径） | 是 |
| 达 5 轮仍调工具 | 移除 tools 强制作答 | 否（用户只见最终答案） |

## 关键决策点

| 决策 | 采纳 | 被否方案 | 否决理由 |
|---|---|---|---|
| 追问预算 | 取消硬预算，靠请求/首字节超时 | 保留 45s 或调大到 120s | 带工具循环时长不可预测；用户已拍板取消分析总时长 |
| 限流 | 独立实例（6/60s） | 继续与 ki_ask 共享 | 带工具单次重得多，共享会互相挤占 |
| 轮次上限 | 5 | 8（与分析看齐） | 追问是"针对疑点"的轻调查，5 轮足够且有 token 护栏 |

## 影响范围

`src/lib/chat/ask/ask-limiter.ts`（工厂化重构，ki_ask 行为保持默认实例不变）、`src/lib/chat/ask/ask-contract.ts`（轮次常量）、`src/lib/events/analysis-ask-runner.ts`（预算/限流接线）、`src/lib/governance-errors.ts` + 错误码表（2 个新码）。
