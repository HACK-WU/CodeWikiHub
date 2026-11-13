# ki_ask 实施计划

> 需求：REQ-20261113-001　日期：2026-11-13　依据：[DESIGN.md](DESIGN.md) / [S-01](S01_问答执行器_DESIGN.md) / [S-02](S02_工具面与安全闸门_DESIGN.md)
> 交付方式：**单窗口串行**（父文档 §4 已判定）

---

## 1. 范围与产出

**本次实施**：一期无状态 `ki_ask` 全链路（执行器 + 工具面 + 安全闸门 + 文档），共 **13 处登记点 / 5 个新增源码文件 / 4 个新增测试文件**。

**产出清单**：

| 类型 | 文件 |
|---|---|
| 新增 | `src/lib/chat/ask/ask-contract.ts`、`ask-runner.ts`、`ask-log.ts`、`ask-limiter.ts` |
| 新增 | `src/lib/mcp-tools/ask.ts` |
| 新增 | `test/chat/tool-loop-budget.test.ts`、`test/chat/ask-runner.test.ts`、`test/chat/ask-limiter.test.ts`、`test/mcp-ask-tool.test.ts` |
| 修改 | `src/lib/chat/chat-contract.ts`、`src/lib/chat/retrieval/tool-loop.ts` |
| 修改 | `src/lib/mcp-server-factory.ts`、`src/lib/mcp-tools/tool-access.ts`、`src/lib/mcp-tools/util.ts`、`src/lib/mcp-http.ts`、`src/lib/operation-coordinator.ts` |
| 修改 | `src/lib/auth/capabilities.ts`、`src/lib/auth/tool-permissions.ts` |
| 修改（仅注释） | `src/lib/chat/prompt-config.ts`、`src/lib/chat/mcp-tool-registry.ts` |
| 文档 | `docs/mcp-http.md`、`docs/cli.md` |

**不在本次范围**：二期 `context_id` 续接与 10 分钟 TTL；web 前端；`monitor-memory` 向量索引异常。

---

## 2. 前置条件

- [ ] daemon 当前在 7423 运行（实施后需重启才生效）
- [ ] `~/.ki/config.yaml` 的 `llm` 段已配置且 `supportsTools !== false`（真链路验证需要）
- [ ] `npm run test:chat` 在**改动前**跑一次并记录基线（现有已知失败需先确认，否则无法判断是否自己引入）
- [ ] 工作区干净或改动已提交（便于 `git diff` 精确界定本次范围；**不代替用户提交**）

---

## 3. 批次与依赖

```mermaid
flowchart LR
    B0["B0 契约地基<br/>ask-contract"] --> B1["B1 tool-loop 扩展<br/>（回归风险最高）"]
    B1 --> B2["B2 执行器<br/>ask-runner + ask-log"]
    B2 --> B3["B3 限流<br/>ask-limiter"]
    B3 --> B4["B4 工具面与闸门<br/>ask.ts + 9 处登记"]
    B4 --> B5["B5 文档 + 真链路验证"]
```

| 批次 | 目标 | 关键风险 | 通过门槛 |
|---|---|---|---|
| **B0** | 契约类型与常量落地，不改任何运行时行为 | 无 | `npm run build` 0 |
| **B1** | `tool-loop` 两个可选入参 + `done.budgetExhausted` | **改动核心文件，可能影响 3 条对话链路** | `npm run test:chat` 与基线**完全一致**（无新增失败） |
| **B2** | `runAsk` 跑通（mock 上游） | 内存骨架字段缺失导致 tool-loop 异常 | 新增单测全绿 + 不落盘断言 |
| **B3** | 限流（窗口 + 并发） | 槽位泄漏（异常路径未释放） | 限流单测全绿（含异常路径） |
| **B4** | 工具可被 MCP 调用，闸门全部生效 | 登记点漏改（13 处） | 新测试全绿 + `test:all` 无新增失败 |
| **B5** | 文档同步 + 真实链路验证 | 客户端 60s 超时（真实风险） | 真机 `ki_ask` 一次调用 < 45s 且有来源 |

---

## 4. 工作项明细

### B0 契约地基

| ID | 文件 | 动作 | 验证 | 完成判据 |
|---|---|---|---|---|
| T0-1 | `src/lib/chat/ask/ask-contract.ts`（新增） | 定义 `ASK_MAX_ROUNDS_DEFAULT=6`、`ASK_MAX_ROUNDS_LIMIT=12`、`ASK_SOFT_BUDGET_MS=25000`、`ASK_HARD_BUDGET_MS=45000`、`AskInput`、`AskResult`（含 `truncatedReason`） | `npm run build` | 编译 0 错 |
| T0-2 | `src/lib/chat/chat-contract.ts` | `ChatEvent` 的 `done` 分支新增可选 `budgetExhausted?: boolean`（**只加字段，不改既有字段**） | `npm run build` + `npm run test:chat` | 无新增失败 |
| T0-3 | `src/lib/config-schema.ts` | `llm.askMaxRounds`（number、可选、默认 6、范围 1~12、越界报错） | `npm run build` + `npx jiti test/config-doctor.test.ts` | 越界配置报错、缺省不报错 |
| T0-4 | `src/lib/chat/llm-client.ts` | `LlmStatus` 新增 `askMaxRounds`（`resolveLlmStatus` 读取 `llm.askMaxRounds ?? 6`） | `npm run test:chat` | 与基线一致 |

### B1 tool-loop 扩展（最需谨慎）

| ID | 文件 | 动作 | 验证 | 完成判据 |
|---|---|---|---|---|
| T1-1 | `src/lib/chat/retrieval/tool-loop.ts` | `ToolLoopInput` 加 `maxToolRounds?: number`、`budgetMs?: number`，注释写明"缺省沿用现状" | `npm run build` | — |
| T1-2 | 同上 `:641` | `const maxRounds = input.maxToolRounds ?? runtime.maxToolRounds;` | 单测：不传时等于 `runtime` 值 | — |
| T1-3 | 同上 `:685-693` | 循环前 `const startedAt = Date.now()`；`overBudget` 判定并入 `reachedLimit`；`roundsExhausted` 仅在轮次触发时置位；新增 `budgetExhausted` | 单测：`budgetMs=0` → 首轮即强制作答 | — |
| T1-4 | 同上 `finalize`（`:930-935` 调用处 / `:1040-1071` 定义） | 透传 `budgetExhausted`，`done` 事件按条件带该字段 | 单测：`done.budgetExhausted === true` | — |
| T1-5 | `test/chat/tool-loop-budget.test.ts`（新增） | 3 条用例：① 不传新参 → 行为与基线一致 ② `maxToolRounds=1` → 第 2 轮不带 tools ③ `budgetMs=0` → `done.budgetExhausted===true` | `npx jiti test/chat/tool-loop-budget.test.ts` | 3/3 绿 |

> ⚠️ **B1 完成后的强制门**：`npm run test:chat` 结果必须与 §2 的基线**逐项一致**。任何新增失败都视为 B1 未完成，**不得进入 B2**（否则后续排障无法区分"新代码问题"与"tool-loop 回归"）。

### B2 执行器

| ID | 文件 | 动作 | 验证 | 完成判据 |
|---|---|---|---|---|
| T2-1 | `src/lib/chat/ask/ask-log.ts`（新增） | 事件名 + 字段白名单 + 脱敏（只记 `questionChars`，**不记正文**） | 单测：正文不进日志 | — |
| T2-2 | `src/lib/chat/ask/ask-runner.ts`（新增） | 实现 `runAsk`（5 步 + 事件聚合 + 硬预算 abort + 来源透传） | 见 T2-3 | — |
| T2-3 | `test/chat/ask-runner.test.ts`（新增） | ① mock 上游 3 轮 → 答案与 sources 正确 ② `maxToolRounds` 生效 ③ 硬预算到点 → 部分答案 + `truncatedReason='hard-timeout'` ④ **不落盘**（`{chatDir}` 前后文件数一致）⑤ `reasoning` 不出现在 `answer` ⑥ `supportsTools:false` → `ASK_TOOLS_UNSUPPORTED` 且零上游请求 | `npx jiti test/chat/ask-runner.test.ts` | 6/6 绿 |
| T2-4 | `npm run test:chat` | 回归 | — | 与基线一致 |

> 夹具复用：参照 `test/chat/tool-budget-injection.test.ts` 的 **jiti alias 替换 `../mcp-tool-registry.js`** 手法（避免真实检索依赖向量库锁）。

### B3 限流

| ID | 文件 | 动作 | 验证 | 完成判据 |
|---|---|---|---|---|
| T3-1 | `src/lib/chat/ask/ask-limiter.ts`（新增） | 滑动窗口（60s / 10 次，按 `principalKey+scope`）+ 全局并发 2 + `resetAskLimiterForTest` | 见 T3-2 | — |
| T3-2 | `test/chat/ask-limiter.test.ts`（新增） | ① 第 11 次 `ASK_RATE_LIMITED` 且带 `retryAfterSec` ② 窗口滚动后恢复 ③ 并发 2 满 → `ASK_BUSY` ④ **异常路径必释放槽位**（抛错后仍可继续调用） ⑤ 不同 scope 互不影响 | 同上 | 5/5 绿 |

### B4 工具面与闸门（13 处登记）

| ID | 文件 | 动作 | 漏改后果 |
|---|---|---|---|
| T4-1 | `src/lib/mcp-tools/ask.ts`（新增） | 工具定义 + 9 步 handler（含 **隐私 ack 闸门**）；调 `runAsk` 时**固定传 `READ_ONLY_CAPABILITIES = new Set(['knowledge.read'])`**（内层恒只读，与用户配置无关）；失败态**展平** `error` 为 `{ok,code,message,retryable}` | 功能不存在 / 内层可写 |
| T4-2 | `src/lib/mcp-server-factory.ts` | `!readOnly` 块内注册（单列「模型消耗型」注释区），`principalKey = auth?.id ?? 'local'` | 工具不出现 |
| T4-3 | `src/lib/mcp-tools/tool-access.ts` | 新增 `MODEL_CONSUMING_TOOL_NAMES=['ki_ask']` / `isModelConsumingTool` / `TOKEN_MODEL_FORBIDDEN` / `modelConsumingRejectMessage()`（四要素文案）；`SEARCH_TOOL_NAMES` **不登记**（加注释） | 只读 Token 可烧额度 |
| T4-4 | `src/lib/mcp-http.ts::rejectReadOnlyRequest` | 按 `isModelConsumingTool` 分流错误码与文案 | 文案说成"写入工具" |
| T4-5 | `src/lib/operation-coordinator.ts::READ_MCP_TOOLS` | 加入 `ki_ask` | 20s 问答阻塞导入 |
| T4-6 | `src/lib/auth/capabilities.ts` | `knowledge.ask` → `Capability` 联合、`ALL_CAPABILITIES`、`ROLE_CAPABILITIES`（admin/editor/viewer） | `/api/auth/me` 缺权限 |
| T4-7 | `src/lib/auth/tool-permissions.ts` | `ki_ask: 'knowledge.ask'` | chat 通道将来纳入时被拒 |
| T4-8 | `src/lib/mcp-tools/util.ts` | `TOOL_TIMEOUT.ASK = 50_000` | 用 READ 30s 误杀 |
| T4-9 | `src/lib/chat/prompt-config.ts` / `mcp-tool-registry.ts` | **不登记** + 注释写明「登记会让内层 LLM 自调，递归风险」 | 无限递归 |
| T4-10 | `test/mcp-ask-tool.test.ts`（新增） | ① 只读 Token 构造调用 → `TOKEN_MODEL_FORBIDDEN` ② `tools/list` 只读会话无 `ki_ask`、读写会话有 ③ `READ_MCP_TOOLS` 含、`CHAT_MCP_TOOLS` 不含（**防递归守卫**） ④ `MCP_TOOL_GROUPS` 不含、`SEARCH_TOOL_NAMES` 不含 ⑤ 能力点映射正确 ⑥ scope 为视图 → `ASK_SCOPE_VIEW_UNSUPPORTED` ⑦ 未 ack → `ASK_DISCLOSURE_REQUIRED` ⑧ **失败返回已展平**（不出现嵌套 `error`） | 闸门失效 |

### B5 文档与真链路

| ID | 文件 | 动作 | 验证 |
|---|---|---|---|
| T5-1 | `docs/mcp-http.md` | 工具清单 14 → 15；新增 `ki_ask` 小节（入参/返回/错误码/耗时约束） | 人工复核 |
| T5-2 | `docs/cli.md` | 如有工具列表则同步 | 同上 |
| T5-3 | 真链路 | 重启 daemon → 用读写 Token 调一次 `ki_ask`（真实问题），断言：有 `answer`、有 `sources`、`elapsedMs < 45000`、`rounds ≤ 6` | 手工 + 记录耗时 |
| T5-4 | 负向真链路 | 只读 Token 调 → 403；视图名 → `ASK_SCOPE_VIEW_UNSUPPORTED`；连调 11 次 → `ASK_RATE_LIMITED` | 三项均符合 |
| T5-5 | 知识库工具清单 | `接口信息/关系与索引管理/MCP工具清单`、`接口信息/检索与向量客户端/MCP工具清单与超时`（若存在）同步 | 用 `ki_sync_relation` 更新 |

---

## 5. 验证矩阵

| 层级 | 命令 | 期望 |
|---|---|---|
| 类型 | `npm run build` | 退出码 0 |
| 回归（对话） | `npm run test:chat` | 与 §2 基线**逐项一致** |
| 新增单测 | `npx jiti test/chat/ask-runner.test.ts`、`ask-limiter.test.ts`、`tool-loop-budget.test.ts`、`test/mcp-ask-tool.test.ts` | 全绿 |
| 全量 | `npm run test:all` | 无新增失败 |
| 真链路 | 重启 daemon + T5-3/T5-4 | 全部符合 |

> **前端无需构建**：本次不改 `web/`。

---

## 6. 回滚策略

| 批次 | 回滚方式 | 影响 |
|---|---|---|
| B0 / B2 / B3 | 删除新增文件即可 | 无（未接线） |
| **B1（关键）** | 回退 `tool-loop.ts` 三处改动 + `chat-contract.ts` 的 `done` 字段 | 返回现状；无数据迁移、无配置变更 |
| B4 | 回退注册与名单 | 工具消失；`knowledge.ask` 能力点残留无副作用 |
| B5 | 文档回滚 | 无 |

**无持久化数据、无 schema 迁移、无配置格式变更** → 回滚成本低。

---

## 7. 风险与应对

| # | 风险 | 触发信号 | 应对 |
|---|---|---|---|
| 1 | `tool-loop` 改动引入回归 | `test:chat` 出现新增失败 | 立刻停在 B1，不得跨批次继续；优先用 `git diff` 限定改动面 |
| 2 | 内存骨架字段缺失 | 单测报 `conv.xxx is undefined` 类错误 | 按 `chat-contract.ts:283-305` 逐字段补齐，不猜 |
| 3 | 真链路耗时仍破 45s | T5-3 超时 | 下调软预算或轮次（需回到 S-01 §3.2 重新决策，不静默改常量） |
| 4 | 限流误伤正常追问 | 用户 10 次/分钟不够 | 调整 `ASK_RATE_MAX`，并在此文档记录变更原因 |
| 5 | 客户端侧 60s 仍被触发 | `elapsedMs` 正常但客户端报超时 | 复核 `withTimeout` 与序列化开销；必要时把 `TOOL_TIMEOUT.ASK` 降到 45s |

---

## 8. 完成定义（DoD）

- [ ] `npm run build` 0；`npm run test:chat` 与基线一致；4 个新测试文件全绿
- [ ] `npm run test:all` 无新增失败
- [ ] 13 处登记点**逐项**对照 S-02 §9 勾选（缺一不可）
- [ ] 真链路：正常问答 / 只读拒绝 / 视图拒绝 / 限流 四项实测通过
- [ ] `{chatDir}` 无新增文件（不落盘）；web 会话列表无新增条目
- [ ] 文档（`docs/mcp-http.md`、`docs/cli.md`）与知识库工具清单同步
- [ ] **不自行 git commit**（提交由用户决定）
