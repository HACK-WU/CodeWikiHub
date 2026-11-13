# Demo 验证报告：`ki_ask` 无状态 RAG 问答（REQ-20261113-001）

> 验证日期：2026-11-13　执行：demo-verify　形态：B（无状态 RAG，内部多轮检索 + 合成）
> 证据口径：**运行实测（真实 daemon + 真实 LLM）** 为主；客户端超时用**客户端包内代码实证**；无会话可行性引用**现有测试代码**。

---

## 1. 风险识别（阶段 1）

| 编号 | 风险点 | 类型 | 来源 | 必要性 |
|---|---|---|---|---|
| R-01 | MCP 客户端对**一次工具调用**的超时是多少 | 集成风险 | §5 D4 | 必须 |
| R-02 | `ki_ask` 的端到端耗时是否可控、由什么主导 | 性能风险 | §5 D5 | 必须 |
| R-03 | ki 侧 RAG 答案质量是否优于「外部 AI 自己调 `ki_search`」 | 方案选择 | §5 D10 | 必须 |
| R-04 | 能否**不建会话**就跑通完整检索链路（决定实现成本） | 技术可行性 | §3.1 R1 | 必须 |
| R-05 | 内部检索轮次是否会失控（`maxToolRounds = Infinity`） | 性能风险 | §3.2 N4 | 必须 |

## 2. 验证范围（阶段 2）

| 风险点 | 验证内容 | 不验证 |
|---|---|---|
| R-01 | 客户端 SDK 默认请求超时常量 + 是否有自定义覆盖 | 不做真机超时时刻实测（需改客户端配置并重启） |
| R-02 | 真实链路端到端耗时、首帧/首 token、每轮工具耗时、轮次、token 用量 | 不做并发压测 |
| R-03 | 同题对比：ki RAG 答案 vs 外部 AI 直接用 `ki_search` | 不做多模型横向 |
| R-04 | 读代码 + 引用现成测试（纯内存 conv 直调 `runToolLoop`） | 不新写一遍同构原型 |
| R-05 | 实测轮次分布（3 / 11 / 12 / 36 轮）→ 推算耗时上限 | — |

## 3. 原型（阶段 3）

`.demo-verify/R-02_rag-latency/ask-latency.mjs`

- 走 daemon 真实链路：`POST /api/chat/conversations` → `POST .../messages`（SSE）→ `DELETE` 清理
- 每题**新建会话**（等价于 `ki_ask` 的"全新对话"首轮）
- 采集：首帧 / 首 token / 每轮 `tool_end.durationMs` / 轮次 / 答案字符数 / `sources` 条数 / `usage`
- 产物：`out/result.json`、`out/answer-N.md`

> **为什么走 HTTP 而不是直接 import**：daemon 持有向量库锁，独立进程直连 zvec 会冲突（项目既有约束：stdio 是 daemon 桥）。

---

## 4. 验证结果（阶段 4）

### R-01 客户端工具调用超时 —— ✅ 通过（已查明：**约 60 秒**）

| 取证位置 | 内容 |
|---|---|
| `@tencent-ai/codebuddy-code/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:8` | `DEFAULT_REQUEST_TIMEOUT_MSEC = 60000` |
| `/root/.codebuddy-server-cn/.../extensions/genie/integration-mcp/lighthouse/index.cjs:3` | `DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4`（IDE 侧同一个 SDK）|
| `codebuddy.js` 内 `MCP_TOOL_TIMEOUT` 出现处 | 仅用于**超时后的提示文案**，未见用于设置调用超时 → 无自定义覆盖 |

**结论**：`ki_ask` 必须在 **< 60s** 内返回，否则客户端侧先断开、调用方拿到超时错误（而 ki 侧仍在烧 token）。

### R-02 端到端耗时 —— ⚠️ **有条件通过**（6s ~ 62s，与检索轮次强相关）

真实实测（deepseek-flash，本机 daemon 7423）：

| # | scope | 问题 | 总耗时 | 首 token | 工具轮次 | 工具耗时 | 答案 | 来源 |
|---|---|---|---|---|---|---|---|---|
| 1 | monitor-memory | 这个知识库里都有哪些内容？ | **6.75s** | 0.73s | 3 | 0.16s | 613 字 | 0 |
| 2 | monitor-memory | 处理记录ID 和告警ID 怎么关联？ | **6.05s** | 0.74s | 3 | 0.36s | 233 字 | 1 |
| 3 | monitor-memory | 新增 action_id 反查告警需改哪些地方？ | **19.30s** | 0.67s | 11 | 1.12s | 1279 字 | 1 |
| 4 | kisearch-memory | MCP 工具鉴权与只读 Token 限制 | **19.07s** | 1.11s | 12 | 1.21s | 1180 字 | 26 |
| 5 | kisearch-memory | 新增一个 MCP 工具要改哪些地方？ | **62.36s** ❌ | 0.79s | **36** | 3.51s | 2503 字 | 55 |

**关键结论**：

1. **耗时 = 轮次 × 单轮生成时间**，**不是**检索慢：工具总耗时只占 6%（1.12s / 19.3s、3.51s / 62.4s），单次工具最慢 694ms。
   → **"优化检索"收益极小，"限制轮次"收益极大**（10 倍以上）。
2. **第 5 例 62.36s 已超客户端 60s 硬超时** → 现状直接上会失败。
3. 耗时**不可预测**：3 轮 6s，36 轮 62s，同一产品同一模型差 10 倍。
4. 首 token 稳定在 0.67~1.11s，说明上游与网络没问题，慢在"多轮往返"。

### R-03 答案质量 —— ✅ 通过（ki 侧 RAG 明显优于外部 AI 直接检索）

**对照实验（同一问题、同一 scope）**：

| 侧 | 做法 | 结果 |
|---|---|---|
| ki 侧 RAG | 内部多轮检索 + 合成 | 2503 字结构化答案：6 类改动清单、点名"最容易漏的两处"、给出项目既有设计先例、附 55 条来源依据 |
| 外部 AI（我） | 直接 `ki_search(monitor-memory, "处理记录ID 和告警ID 怎么关联")` 等 3 种措辞 | **全部 0 命中**或只返回一条无关的「标签测试」；`mode=fulltext` 也是 0 条 |

- ki 侧同题在 monitor-memory 上却给出了带具体文档名与行号的答案（`专题记忆/告警屏蔽/快捷屏蔽接口体系 lines 1-30` 等）。
- **反幻觉表现达标**：Q3 明确写「知识库中未找到 `action_id`」并列出两条信息缺口，没有编造。

**结论**：`ki_ask` 的价值成立——外部 AI **不会**为了一句问题做十几次检索词改写，而 ki 侧会。这是"省往返"以外更本质的差异。

### R-04 无会话可跑通检索链路 —— ✅ 通过（🟢 现成测试已锁）

`test/chat/tool-budget-injection.test.ts:65-73` 构造的是**纯内存 `conv` 对象**（无落盘、无会话文件），直接 `runToolLoop(...)` 并跑通了完整工具循环：

```ts
const conv = { version:1, id:'c-budget', scope:'default', ..., messages:[{id:'m1',role:'user',content:'question',at:''}] };
for await (const event of runToolLoop({ scope:'default', conv, userText:'question', convSystemPrompt:'' })) { ... }
```

→ **实现上不需要重构 `tool-loop`**：`ki_ask` 只要造一个不落盘的 `ConversationFile` 骨架传进去即可。这大幅降低了 R1 的成本（从"新建问答引擎"降到"新链路 + 现有引擎"）。

### R-05 轮次失控 —— ❌ **不通过现状**（必须设上限）

`CHAT_BUDGET.maxToolRounds = Number.POSITIVE_INFINITY`（`chat-contract.ts:475`），实测出现 **36 轮**检索。

**经济代价**：单轮 prompt ≈ 5K~13K tokens，36 轮 ≈ 20~45 万 input tokens／次问答。按贵模型计价不可接受，且与"成本 = 一次会话"的预期严重偏离。

**好消息**：现有"达上限"语义正好是缺的解法——`tool-loop.ts:692-693,769` 达 `maxRounds` 后**拿掉 tools 再调一次 = 强制作答**（不是截断），可直接复用于 `ki_ask`。

---

## 5. 附带发现（不在本需求范围，需单独核查）

**monitor-memory 的向量侧命中异常**：`ki_search` 在该 scope 下无论用中文关键词还是 `fulltext` 模式，都只返回一条与问题无关的「标签测试」，而 KB 里实际有「专题记忆/告警屏蔽」「关联关系/告警屏蔽」等 5 个 relation。

- 影响：该库上的检索只能靠模型多轮试错（Q3 的 11 轮里多数是试错），耗时偏高。
- 判断：**可能是该 scope 的向量索引没有随 KB 同步**，也可能是中文 FTS 分词问题。**本报告不下结论**（未做索引一致性核查）。
- 建议：单独建一个排查项，不要混进 `ki_ask` 需求。

---

## 6. 整体决策（阶段 5）

**结论：⚠️ 有条件通过 —— 可进入设计，但必须把以下 3 条写成硬约束**

| # | 必须写入设计的约束 | 依据 |
|---|---|---|
| **C1** | `ki_ask` 内部 `maxToolRounds` 设为**有限值（建议 6~8）**，复用"达上限强制作答"机制 | R-05：36 轮 → 62s；工具耗时占比仅 6% |
| **C2** | 设**总时长预算**（建议软 25s / 硬 45s），到点提前收起检索并强制作答，**保证 < 60s 返回** | R-01 客户端 60s + R-02 实测 62.36s 越线 |
| **C3** | 提示词层引导"**少试探、多一次问准**"，并在超时错误里明确告知"已基于前 N 条结果作答" | R-02：轮次是耗时唯一主因 |

**不建议的两种做法**：

- ❌ 靠「加 progress 通知」绕过 60s：SDK 的 request timeout 独立于 progress，超时照样 reject。
- ❌ 只优化检索速度：工具耗时仅占 6%，优化到 0 也只省 1~3 秒。

**形态 B 判定：通过**（R-03 的价值证据成立），继续按 B 进入 `design-craft`。

---

## 7. 未验证项（留给设计阶段或后续实测）

| # | 未验证 | 原因 | 建议 |
|---|---|---|---|
| 1 | 客户端超时的**真机触发时刻**（60s 是否精确、是否有重试） | 需改 `~/.codebuddy/mcp.json` 加慢工具并重启 IDE | 实现后用一个 `ki_ask` 已知慢问题实测一次 |
| 2 | 并发调用对耗时的影响 | 本次串行执行 | 设计阶段定并发上限后再压测 |
| 3 | 10 分钟 TTL 短会话（第二期 R13~R17） | 本期只验证无状态形态 | 第二期开工前单独验证续接与 GC |
| 4 | 轮次上限取 6 / 8 哪个更优（答案完整度 vs 耗时） | 需在同一批问题上对比 | 设计阶段做一次 A/B |

---

## 8. 复现方式

```bash
# 真实链路耗时（默认 monitor-memory 三题）
node .demo-verify/R-02_rag-latency/ask-latency.mjs

# 指定库与问题
KI_SCOPE=kisearch-memory node .demo-verify/R-02_rag-latency/ask-latency.mjs "问题一" "问题二"
```

前提：daemon 在 7423 运行且 `llm` 已配置（`GET /api/chat/config` 返回 `enabled:true`）。
