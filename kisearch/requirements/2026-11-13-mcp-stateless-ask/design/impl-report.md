# 实施报告：`ki_ask` 无状态 RAG 问答工具

> 需求：REQ-20261113-001　日期：2026-11-13　依据：`IMPL_PLAN.md`（B0~B5）
> 结论：**5 个批次全部完成，真链路 12/12 通过**；未提交（等用户决定）

---

## 1. 交付清单

### 新增（5 个源码 + 4 个测试）

| 文件 | 作用 |
|---|---|
| `src/lib/chat/ask/ask-contract.ts` | `AskInput` / `AskResult` / 4 个预算常量 |
| `src/lib/chat/ask/ask-runner.ts` | `runAsk()`：内存会话骨架 → 驱动 `runToolLoop` → 聚合 |
| `src/lib/chat/ask/ask-log.ts` | 审计出口（单行 JSON 到 stderr，只记长度不记正文） |
| `src/lib/chat/ask/ask-limiter.ts` | 滑动窗口（10 次/60s/`principal+scope`）+ 全局并发 2 |
| `src/lib/mcp-tools/ask.ts` | MCP 工具定义 + 9 步 handler |
| `test/chat/tool-loop-budget.test.ts` | 3 例：入参缺省 / 轮次上限 / 时间预算 |
| `test/chat/ask-runner.test.ts` | 6 例：合成 / 轮次 / 中止 / 不落盘 / reasoning / tools 不支持 |
| `test/chat/ask-limiter.test.ts` | 5 例：窗口 / 滚动 / 并发 / 泄漏 / scope 隔离 |
| `test/mcp-ask-tool.test.ts` | 8 例：三清单 / 文案 / 能力点 / 车道 / 防递归 / 装配 |

### 修改（11 处）

| 文件 | 改动 |
|---|---|
| `src/lib/chat/chat-contract.ts` | `done` 新增可选 `budgetExhausted` |
| `src/lib/chat/retrieval/tool-loop.ts` | `ToolLoopInput` 加 `maxToolRounds?` / `budgetMs?`；循环内时间预算复用强制作答；`finalize` 透传 |
| `src/lib/config-schema.ts` | `llm.askMaxRounds`（1~12，越界 fail-loud） |
| `src/lib/config.ts` | `LlmConfig.askMaxRounds` + **逐字段白名单拷贝补该字段** |
| `src/lib/chat/llm-client.ts` | `LlmStatus.askMaxRounds`（缺省 6） |
| `src/lib/mcp-tools/tool-access.ts` | `MODEL_CONSUMING_TOOL_NAMES` / `isModelConsumingTool` / `TOKEN_MODEL_FORBIDDEN` / 文案 |
| `src/lib/mcp-http.ts` | `rejectReadOnlyRequest` 按工具类型分流错误码与文案 |
| `src/lib/operation-coordinator.ts` | `READ_MCP_TOOLS` 加 `ki_ask`（读车道） |
| `src/lib/auth/capabilities.ts` | `knowledge.ask`（ALL + editor + viewer） |
| `src/lib/auth/tool-permissions.ts` | `ki_ask → knowledge.ask` |
| `src/lib/mcp-tools/util.ts` | `TOOL_TIMEOUT.ASK = 50_000` |
| `src/lib/mcp-server-factory.ts` | 非只读块注册（单列"模型消耗型"注释区） |
| `src/lib/chat/prompt-config.ts` / `mcp-tool-registry.ts` | **仅注释**：禁止登记 `ki_ask`（防递归） |
| `test/mcp-token-readonly.test.ts` | 工具数 14 → 15（连带更新） |
| `docs/mcp-http.md` / `docs/cli.md` | 工具清单与只读可见性同步 |

---

## 2. 验证证据

| 层级 | 命令 | 结果 |
|---|---|---|
| 类型 | `npm run build` | **0 错**（B0/B1/B2/B3/B4 各跑一次） |
| 对话回归 | `npm run test:chat` | **33 文件 / 3 失败**，与改动前基线**完全一致**（`prompt-config-routes` / `contract-parity` / `e2e-sr02-sources` 三个既有失败） |
| 新增单测 | 4 个文件 | **3 + 6 + 5 + 8 = 22 例全绿** |
| 相关既有测试 | `mcp-token-readonly`（28）/ `capability-coverage`（4）/ `coordinator-read-lane`（13） | 全绿 |
| 真链路 · 正常路径 | `.demo-verify/verify-ki-ask.mjs` | **9/9**：`tools/list` 15 个且含 ki_ask；一次问答 `elapsedMs=11428`、`rounds=10`（工具调用次数）、31 条来源、`truncatedReason=round-limit`；逗号多库与不存在的库分别被拒 |
| 真链路 · 只读 Token | `.demo-verify/verify-ki-ask-readonly.mjs` | **3/3**：只读会话 `tools/list` 仍 6 个（无 ki_ask）；构造调用 → `403 TOKEN_MODEL_FORBIDDEN`；对照 `ki_search` 正常 |

> 只读验证必须带 `X-Forwarded-For` —— 本机回环直连免鉴权（local-admin 优先于 Bearer），这是项目既有语义，不是本次引入。
> 临时只读 Token（`y23HvSvG`）验证后已删除。

---

## 3. 与设计的偏差（2 处，均已回写文档）

| # | 偏差 | 原因 | 处理 |
|---|---|---|---|
| 1 | `config.ts` 原设计写"无变更（schema 驱动）" | 实际 `llm` 段是**逐字段白名单拷贝**，漏加字段会出现"类型上有、运行时 undefined"——B2 测试 ② 因此卡住（配置写了 `askMaxRounds: 2` 却不生效） | 已补代码 + 回写 S-01 §9 并注明"实施时实际踩到" |
| 2 | `rounds` 在真链路上出现 `10`（>6） | `rounds` 语义是**工具调用次数**，6 轮内模型可发多个 `tool_calls`；轮次上限生效的证据是 `truncatedReason='round-limit'`，不是 `rounds<=6` | 设计已如此定义；验证脚本断言已改为看 `truncatedReason` |

---

## 4. 已知问题（1 项，非本次引入，需产品决策）

**上游偶发把工具调用写成文本**：3 次真链路调用中有 1 次，答案里混入 `<｜｜DSML｜｜ invoke ...>` 形式的原始标记（deepseek-flash 的内部格式），其余 2 次答案正常。

- **对照证据**：同一问题走既有 `/api/chat/*` 链路（同模型、同库）答案**不含**该标记 → 不是模型稳定行为。
- **怀疑触发点**：`maxToolRounds=6` 达上限后的「强制作答」（`tools=undefined`）分支——模型仍想调工具时可能改为文本输出。**未证实**（样本 1/3）。
- **影响**：出现时答案可用性下降（文本被污染），但不影响 `ok/sources/truncated` 契约。
- **可选修法**（建议下一迭代评估，不在本次范围）：
  1. 强制作答时追加一条 system 提示："不要再调用工具，请基于已有结果直接回答"；
  2. 或对 `content` 做窄过滤（去掉 `<\|\|DSML\|\|` 片段）——治标，且可能误伤正常文本；
  3. 或把 `askMaxRounds` 降到 4，减少触发强制作答的概率（代价：答案完整度下降）。

---

## 5. 未做 / 后续

| 项 | 说明 |
|---|---|
| 二期 `context_id` 续接 + 10 分钟 TTL | 需求已定方案（R13~R17），本次按分期不做 |
| web 前端 | 本次无前端改动；`/api/auth/me` 多返回 `knowledge.ask`，前端按字符串展示无需改 |
| 知识库内的两份工具清单 | `接口信息/关系与索引管理/MCP工具清单` 等需另行用 `ki_sync_relation` 更新（属知识库内容，不是代码） |
| git 提交 | **未提交**，等用户决定 |
| `.demo-verify/` | 保留（含两个验证脚本与产物），需要清理时再删 |

---

## 6. 上线体验走查（2026-11-13，IDE 内实际调用 5 次）

### 6.1 发现并已修的两个缺陷

| # | 缺陷 | 严重度 | 现象 | 根因 | 修法 | 复验 |
|---|---|---|---|---|---|---|
| 1 | **强制作答被上游"工具调用文本"污染** | 🔴 阻断（答案 100% 不可用） | 6 轮用尽的复杂问题，`answer` 全是 `<｜｜DSML｜｜ invoke ...>` 标记，零真实内容 | `maxToolRounds` 达上限后 `tools: undefined`，deepseek-flash 仍想调工具 → 把调用写成普通文本 | `tool-loop` 强制作答分支追加一条 system 收口提示（不再提供工具 / 立即作答 / 禁止输出自定义标记） | 同题复测：由"全标记"变为完整诚实答案；另测 2 个复杂问题均正常（3/3） |
| 2 | **sources 噪声**（空投影 + 条数过多） | 🟡 | 一次问答返回 **40 条** sources（≈6KB），其中 6 条 `doc` 为空、`snippet` 为空 | `toSourceRefs` 对 chunk fallback 产生文档级空投影；多轮累积无上限 | `ask-runner` 净化：丢弃 `doc` 与 `snippet` 都空的条目，并截断到 15 条（只影响 `ki_ask`，不改 tool-loop / 页面契约） | 40 → 14/15 条，空投影清空 |

### 6.2 体验评价（修复后 3/3 可用）

| 维度 | 结果 |
|---|---|
| 耗时 | 8.2s（2 轮）/ 13.8s（10 次工具调用）/ 15.9s（10 次）—— 全部远低于客户端 60s 上限 |
| 答案质量 | 高：结构化分节、内联标注来源、主动列缺口（"知识库无统一表述，以下为拼出的顺序"） |
| 反幻觉 | 达标：找不到就说找不到，并解释"相邻内容为何不能当答案"，不编造 |
| `truncated` 体验 | 复杂问题 3/3 都是 `round-limit`，但**答案仍完整**——`truncated` 更像"提示被收口"而非缺陷 |
| 产品缺口（非代码） | `kisearch-memory` 里**没有**「MCP 只读 Token」的专门记忆（只有 archive 旧记录），所以问不出答案；属知识库内容缺口 |

### 6.4 auto-review + challenger（同日第二轮审查）

| # | 来源 | 发现 | 等级 | 处理 |
|---|---|---|---|---|
| 1 | auto-review 自审 | `question` **无长度上限**：可被塞入 2 万字符直接进上游（成本 + 延迟），设计里只写了"非空" | 🔴 | 已修：`ASK_QUESTION_MAX_CHARS = 4000`，超限 fail-loud 并指路 `ki_search`（真链路 ⑤ 已验证） |
| 2 | challenger · 契约守恒 | **`ChatEvent` 前端副本未同步** `budgetExhausted`（`web/src/api/chatContract.ts` 的 done 分支缺字段）。`contract-parity.test.ts` 只覆盖 8 个 interface、不含 `ChatEvent`，所以测试没红——静默漂移 | 🟡 | 已修：前端副本补该可选字段 + 注释（web `tsc --noEmit` 0） |
| 3 | challenger · 数据守恒（数量/异常归宿） | **sources 静默截断**：40 → 15 条，调用方无从知道"被截断了"，会把"证据就这些"误读成"依据充分"；被过滤的空投影也无任何记录 | 🟡 | 已修：`AskResult.sourcesTotal`（净化前条数）+ 对外返回（真链路：`total=21 返回=15`） |
| 4 | challenger · 贯通 | `llm.askMaxRounds` **无任何 API 可观测**（`/api/chat/config` 不返回），排查"改了没生效"只能读 config.yaml | 🟢 | **未修**：加字段要同时动 `ChatConfigOk` 两侧副本 + 契约测试，与收益不匹配；运维级配置可接受（记录在此） |
| 5 | challenger · 搭车变更 | `AskLogFields.truncatedReason`（设计外字段）、sources 截断 15（设计外规则） | 🟢 | 保留：前者提升审计可读性，后者即第 3 条（已补可观测字段） |

**全局回扣**：目标达成（3/3 可用）、位置安全（`tool-loop` 三处改动均"不传即不变"）、判据部分失效（`contract-parity` 本就是红的，**不能**用它证明"契约没漂"，故第 2 条靠人工核对发现）。

### 6.3 后续可考虑（未做）

- 6 轮对"知识库综合类问题"偏紧（实测 3/3 收口）；若答案是完整的不必调，若想更少收口可评估默认改 8 轮并复测 p95。
- `sources` 中"仅文档名、无片段"（`lineStart=0`、`snippet=''`）约占 40%，可评估排到列表末尾（当前保留，因为仍能定位到文档）。
