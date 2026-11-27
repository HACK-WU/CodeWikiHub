---
id: REQ-20261116-003
document_type: design
status: 设计中
version: 1
created: 2026-11-16
updated: 2026-11-16
---

# S-01 · 数据层：`ka-*` 结构扩展与保留期解耦

## 1. 术语

| 术语 | 定义 |
|---|---|
| **`origin`** | 短会话的来源标识，`{kind:'local'\|'token', tokenId?, tokenLabel?}` |
| **续接 TTL** | `updatedAt + ttlMs`（默认 10 分钟，滑动），**只**决定 `context_id` 能否续接 |
| **保留期** | `createdAt + retainDays`（默认 7 天），**只**决定文件何时被 GC 删除 |
| **回放排除** | 组装上游 `messages` 时丢弃 `background` 与 `sources`（两者均为展示物） |

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 短会话文件结构与消息结构 | `src/lib/chat/ask/ask-store.ts:33-51` |
| 落盘只写 `role + content + at`，背景不入盘 | `ask-runner.ts:461-471`（注释在 `:363-365`） |
| 回放只取 `role + content` | `ask-runner.ts:260-268` |
| 过期即删文件（按 `updatedAt`） | `ask-gc.ts:48-91`、`ask-store.ts:191-195` |
| TTL 常量与配置 | `ask-contract.ts:63-64`、`llm.askSessionTtlMs` |
| 来源已对外净化并截断到 15 条 | `ask-runner.ts:146-158` |
| 审计只记长度 | `ask-log.ts:30-59` |

**当前后果**：① 列表侧拿不到来源组、背景、来源引用；② 10 分钟后文件消失，任何"回看"都不可能成立。

## 3. 方案（TO-BE）

### 3.1 数据模型

```ts
// src/lib/chat/ask/ask-store.ts

/** 来源标识（新增） */
export interface AskOrigin {
  kind: 'local' | 'token';
  /** kind='token' 时必填：TokenRecord.id（稳定标识，改名不变） */
  tokenId?: string;
  /** 落盘时的 Token 名称快照：Token 被删除后列表仍能显示「已删除的 Token（codex）」 */
  tokenLabel?: string;
}

/** 逐轮消息（扩展） */
export interface AskSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  /** 仅 user：本轮提问背景。**回放时丢弃**（见 §3.3） */
  background?: string;
  /** 仅 assistant：净化后的来源引用，最多 15 条（与对外 `sources` 同源） */
  sources?: SourceRef[];
}

// ★ 来源引用**直接复用**对话层类型，不另立一套：
//   `ask-runner.ts:35` 本就已经 `import type { SourceRef } from '../chat-contract.js'`，
//   "独立声明以避免反向依赖" 的前提不成立；独立声明只会制造类型双源，字段演进时两处漂移。
import type { SourceRef } from '../chat-contract.js';

export interface AskSessionFile {
  version: 2;                 // 1 → 2（旧文件按 1 读，见 §3.4）
  id: string;
  scope: string;
  ownerKey: string;           // tokenId | 'local'（语义不变，续接归属校验仍用它）
  origin: AskOrigin;          // 新增
  createdAt: string;
  updatedAt: string;
  messages: AskSessionMessage[];
}
```

**字段写入矩阵**：

| 字段 | 何时写 | 上限 | 回放是否使用 |
|---|---|---|---|
| `origin` | 创建短会话时（`createAskSession`） | — | 否 |
| `background` | 追加 user 消息时，且本轮传了 `background` | 2000 字符（`ASK_BACKGROUND_MAX_CHARS`） | **否** |
| `sources` | 追加 assistant 消息时，且 `sources.length > 0` | 15 条（与对外一致） | **否** |

### 3.2 保留期与续接 TTL 解耦

```ts
// ask-contract.ts 新增
/** 列表态保留天数默认值；配置项 llm.askSessionRetainDays（1~365，越界 fail-loud） */
export const ASK_SESSION_RETAIN_DEFAULT_DAYS = 7;
```

```ts
// ask-store.ts 新增（纯函数，便于单测）
/** 是否已过保留期（GC 判据，按 createdAt 而非 updatedAt） */
export function isAskSessionPastRetention(
  file: Pick<AskSessionFile, 'createdAt'>,
  retainDays: number,
  now = Date.now(),
): boolean;

/** 保留至何时（供列表返回 retainUntil，前端可提示"还剩 N 天"） */
export function askSessionRetainUntil(file: Pick<AskSessionFile, 'createdAt'>, retainDays: number): string;
```

| 判据 | 依据时间 | 用途 | 改动 |
|---|---|---|---|
| `isAskSessionExpired` | `updatedAt + ttlMs` | `context_id` 续接（`ask-runner.ts:196-205` 现状） | **不变** |
| `isAskSessionPastRetention` | `createdAt + retainDays` | GC 删除（`ask-gc.ts`） | **新增并切换** |

> **为什么不沿用滑动 `updatedAt` 判保留期**：高频续接的会话永远不会过期，磁盘无上界；保留期是"归档窗口"，应以创建时刻为锚，语义更稳。

### 3.3 回放排除（本子需求最关键的约束）

现状回放只取 `role + content`：

```260:268:src/lib/chat/ask/ask-runner.ts
    // 回放只取 role + content（S-03 §3.2 决策）：reasoning / sources 是展示物，
    // 回放会放大上下文且违反 N12
    messages: history.map((m, index) => ({ ... }))
```

**加字段后必须守住这条**。三处强制措施：

1. `buildMemoryConv` 保持显式字段投影（不写 `...m` 展开）——**禁止**重构为对象展开；
2. 新增单测 `test/ask-replay-excludes-background.test.ts`：构造 `messages=[{user, background:'X'}, {assistant, sources:[...]}]`，断言回放后的上游 `messages` 中**不含** `X`、整体字节数等于去掉这两个字段的版本；
3. `appendAskTurn` 的字段白名单保持显式（只接受 `role/content/at/background/sources`，其余丢弃）。

### 3.4 旧文件兼容（`version: 1`）

存量 `ka-*.json` 没有 `origin`。读取时**推导**，不写回：

```ts
/** 读时归一：缺 origin 时按 ownerKey 推导（不落盘，避免读操作产生写入） */
function normalizeOrigin(raw: Partial<AskSessionFile>): AskOrigin {
  if (raw.origin?.kind === 'local' || raw.origin?.kind === 'token') return raw.origin;
  if (raw.ownerKey === 'local' || !raw.ownerKey) return { kind: 'local' };
  return { kind: 'token', tokenId: raw.ownerKey };  // tokenLabel 由 S-02 实时查
}
```

| 情况 | 处理 |
|---|---|
| `version:1` + `ownerKey:'local'` | 归入「本地连接」组 |
| `version:1` + `ownerKey:'<tokenId>'` | 归入对应 Token 组；Token 已删除则标题显示「已删除的 Token」 |
| `version:2` | 直接用 `origin` |
| 文件损坏 / `id` 非法 | 沿用现状：GC 与读取均按「不可用」删除（`ask-store.ts:106-124`） |

### 3.4.1 `origin` 的构造点（单点构造，避免两处推导）

`origin` 只能在一个地方构造：**`src/lib/mcp-tools/ask.ts` 的 handler**。理由：只有它同时握有 `principalKey`（`token.id` / `'local'`）与 Token 记录访问能力。

```ts
// src/lib/chat/ask/ask-contract.ts —— AskInput 增一个可选字段
/** 来源标识（由工具面构造并下传；缺省按 principalKey 推导为 local） */
origin?: AskOrigin;

// src/lib/mcp-tools/ask.ts —— 构造并传入
const origin: AskOrigin = principalKey === 'local'
  ? { kind: 'local' }
  : (() => {
      const rec = listTokens().find((t) => t.id === principalKey);
      return { kind: 'token', tokenId: principalKey, tokenLabel: rec ? tokenLabel(rec) : undefined };
    })();
```

| 约束 | 说明 |
|---|---|
| `ask-runner` 不查 Token 记录 | 它只接收 `AskOrigin`，保持纯执行器定位；也避免 ask 层依赖 `mcp-token` |
| `tokenLabel` 是**快照**，允许缺失 | 写入时刻拿不到就留空，由 S-02 列表接口实时 join 补齐 |
| `listTokens()` 读取失败 | 降级为 `{kind:'token', tokenId}`（无快照），不阻断问答 |

### 3.5 代码改动清单

```
src/lib/chat/ask/ask-store.ts       [修改] AskOrigin/AskSourceRef/字段扩展 + 保留期纯函数 + normalizeOrigin + appendAskTurn 白名单
src/lib/chat/ask/ask-contract.ts    [修改] ASK_SESSION_RETAIN_DEFAULT_DAYS
src/lib/chat/ask/ask-runner.ts      [修改] createAskSession 传 origin；appendAskTurn 带 background/sources；回放继续显式投影
src/lib/chat/ask/ask-gc.ts          [修改] 判据换成 isAskSessionPastRetention + 日志区分「过期续接」与「保留期清理」
src/lib/config-schema.ts            [修改] 新增 llm.askSessionRetainDays（1~365，默认 7，越界 fail-loud）
src/lib/mcp-tools/ask.ts            [修改] createAskSession 调用处传入 origin（principalKey 已有）
test/ask-replay-excludes-background.test.ts   [新增] 回放排除（2 例）
test/ask-store-v2.test.ts                     [新增] 结构读写 / 旧文件归一 / 保留期判定（6 例）
```

**现有测试的迁移（B1 实施时已全部完成）**：

| 现有用例 | 受影响原因 | 处理 |
|---|---|---|
| `test/chat/ask-gc.test.ts` ①「过期删除」 | GC 判据从 `updatedAt + TTL` 换成 `createdAt + retainDays` | 用例改为构造 6 天 / 8 天前，并**新增 ①b**：`createdAt` 30 天前但 `updatedAt` 刚刚 → 仍删（证明保留期不滑动） |
| 同文件 ②（只碰 `ka-*`） | fixture 时间不满足新判据 | 改为 8 天前 |
| 同文件 ③（损坏文件删除） | `writeSession` 参数序变更 | 保留 raw 为第 3 参、`updatedAt` 移到第 4 参 |
| `test/mcp-ask-tool.test.ts` | 只测工具清单与装配，不碰存储结构 | **零影响**（8/8 仍绿） |

**新增测试**：

| 文件 | 覆盖 |
|---|---|
| `test/ask-store-v2.test.ts`（9 例） | 写 `version:2` + `origin`；Token 名称快照；`appendAskTurn` 白名单（越界字段不落盘）；旧文件读时归一（token / local）；保留期按 `createdAt`；`retainUntil` |
| `test/ask-replay-excludes-background.test.ts`（3 例） | 回放只保留 `role/content/at`；背景与来源原文不出现在回放结果；与"去掉展示物"的版本逐字节一致 |

**为可测性新增的导出**：`ask-runner.ts` 的 `replayMessagesForModel(history)` —— 把「模型回放投影」抽成纯函数，测试可直接断言；`buildMemoryConv` 改为调用它。⚠️ 该函数内**禁止**改成 `...m` 展开。

**新增文件目录结构**：本子需求不新增目录，仅两个新增测试文件落在既有 `test/` 下。

## 4. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `background` 超 2000 字符 | 工具面 fail-loud（现状不变，`ASK_BACKGROUND_INVALID`） | 是 |
| `sources` 超过 15 条 | 落盘截到 15 条，`sourcesTotal` 仍记总数（与对外一致） | 否 |
| 追加消息时文件已被 GC 删除 | 返回 `null`，本次答案照给（现状 `ask-runner.ts:469-470`） | 否（续接时才报 `ASK_CONTEXT_EXPIRED`） |
| 旧文件 `ownerKey` 缺失 | 归 `local` 组（`normalizeOrigin` 兜底） | 否 |
| 配置文件 `askSessionRetainDays` 越界 | `config-schema` 加载即报错，daemon 拒绝启动 | 是（fail-loud） |
| GC 单文件删除失败 | 计数不中断整轮（现状） | 否 |

## 5. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 保留期锚点 | `createdAt` | `updatedAt`（滑动） | 滑动续接使记录永不过期 | 需要"按最后活跃保留"时 |
| 旧文件是否回填 | **读时归一，不写回** | 启动时批量迁移 | 读操作不应产生写入（并发 + 权限 + 失败面）；归一逻辑只有一行 | 归一逻辑超过 3 个分支 |
| `sources` 落盘口径 | **净化后的对外版本**（≤15 条） | 原始内部结构 | 内部结构含未净化字段，写盘等于把内部路径持久化到磁盘 | 需要离线复现检索质量时另存原始 |
| `origin` 是否复用 `ownerKey` | 独立字段 | 让 `ownerKey` 同时承载"归属"与"来源" | `ownerKey` 服务于续接校验（`tokenId` / `'local'`），语义是"谁能续"，不是"来源组名称"；混用会让两者演进互相绑架 | `ownerKey` 与 `origin` 恒等且无扩展需求时 |

## 6. 待定问题

| # | 问题 | 影响 | 临时处理 |
|---|---|---|---|
| T-1 | `retainDays` 是否要按 scope 单独配置 | 多租户/多库场景 | 全局单值；需要时再加层级覆盖 |
| T-2 | 存量 `ka-*` 在首次上线时会被新 GC 立即清掉（`createdAt` 已超 7 天） | 用户可能正想回看某条旧记录 | 接受（本来 10 分钟前就该消失）；GC 启动即清理并记日志 |
