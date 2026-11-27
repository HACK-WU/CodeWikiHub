# 实施记录（2026-11-19）

> ki 记忆写入两次失败（fetch failed），本记录暂落本地台账，待 ki 恢复后补登 `kisearch-memory / 专题记忆 / 追问工具化-实施记录`。

## 改动清单

| 文件 | 改动 |
|---|---|
| `src/lib/chat/ask/ask-contract.ts` | 新增 `ASK_TOOL_MAX_ROUNDS = 5` |
| `src/lib/chat/ask/ask-limiter.ts` | 工厂化 `createAskLimiter()`；默认导出 API 不变（ki_ask 零改动）；新增追问独立实例 |
| `src/lib/governance-errors.ts` | 新增 `ANALYSIS_FOLLOWUP_RATE_LIMITED`(1619) / `ANALYSIS_FOLLOWUP_BUSY`(1620) + HTTP 429 |
| `src/lib/events/types.ts` | `AnalysisAskTurn` 加 `toolCalls?` + `context.attachedDocsUsed?` |
| `src/lib/governance-contract.ts` | 后端 DTO 镜像同上 |
| `src/lib/events/analysis-runner.ts` | 导出 `buildKbReadToolEntries` / `ANALYSIS_TOOL_RESPONSE_CHARS` / `DSML_FORCE_ANSWER_SYSTEM` |
| `src/lib/events/analysis-ask-runner.ts` | 单次 streamChat → 5 轮工具循环；上下文加 `<attached_docs>`；system 改「起点+核实」；取消 45s 硬预算；每轮复查 runId；追问独立限流 6/60s·并发2；toolCalls 落盘 + tool/thinking 进度事件 |
| `src/lib/governance-http.ts` | SSE 路由转发 `onEvent` |
| `web/src/api/governanceApi.ts` | `askEventAnalysisStream` 加 `onEvent` 回调 + `AskProgressEvent` 类型 |
| `web/src/api/governanceContract.ts` | 前端 DTO 加 `toolCalls?` / `attachedDocsUsed?` |
| `web/src/components/governance/event-detail/AskBlock.tsx` | 卡头文案改值；pending 显示 tool/thinking 进度；turn 显示查证行；seq 防护沿用 |
| `test/events/analysis-ask-tools.test.ts` | 新增 5 例（工具一轮/轮次上限/文档清单/未授权工具/独立限流） |

## 验证结果

- 后端 tsc：仅 7 处既有错误（import-budget / mcp-http-api / mcp-http / open-api-multipart），我的文件 0 错
- 前端 tsc：0 错；`web build`：✓（988ms）
- 新增 `analysis-ask-tools`：5/5；`analysis-ask`：7/7；`ask-limiter`：5/5；`analysis-runner`：6/6
- `governance-contract`：24/25（1 处失败为既有的 thinkingChars/liveThinking DTO 漂移，与本次无关；本次 AnalysisAskTurn DTO 一致）
- 全量 `run-tests --serial`：3 个无关域既有失败（mcp-daemon 存活探测 / mcp-http healthz 鉴权 / delete-relation 向量清理）
- lint：0 错

## 实施期发现并修正的坑

1. fake stream 的 `tool_calls` 形状须与真 `streamChat` 一致（`{type:'tool_calls',calls:[{id,name,arguments}]}`）。
2. `prompt-config` 从磁盘读，注入的 `cfg.analysis` 无效 —— 测试须写真实 `prompt-config.json` 才注册 `fs_*`。
3. 达轮次上限的强制作答轮**必须移除 tools** 模型才吐正文（DSML 收口），否则继续吐 tool_calls 导致超时。
4. `readPromptConfig` 在最小注入 cfg（无 dataDir）下会抛路径错 —— 改为 try/catch 回退默认配置（与文件缺失同口径）。

## 补充修复（2026-11-19 第二轮，真机截图反馈）

用户反馈两点：① 过程不流式（卡在"正在查证据：fs_read"单行）；② 答案 markdown 未渲染（`**` 字面量）。
按用户确认的口径修复：

- **过程改步骤流**：后端新增 `AskStep{id,kind,label,text,at}` + `{type:'step'}` SSE 事件；`text` 传**累积全文**（前端按 id upsert，不自己拼），覆盖 thinking / tool / answer 三类步骤；保留原 tool/thinking 原子事件作旧后端兜底。前端 `AskBlock` 维护 `steps[]` + `turnSteps` 快照，渲染 `.gov-ask__steps` 累积列表，每步增长自动贴底滚动。
- **答案 markdown**：答案气泡复用项目既有的 `MarkdownPreview`（marked + 安全白名单），新增 `.gov-ask__bubble--md` 样式；步骤流与 markdown 样式均追加在 `governance.css`（无布局重构）。
- 测试：① 例增强为断言 step 事件的累积全文；5/5 绿；后端 tsc 7 既有错（我的文件 0）、前端 tsc 0、build ✓。
- 证据档位：agent-browser 0.25.4 可用（Linux，B 档），但本次未起真机会话 —— 待用户重启 daemon + web dev 后按截图复验"步骤逐条增长 + 答案富文本"。

## 补充修复（2026-11-19 第三轮，真机截图：过渡语被当答案）

用户反馈："不是AI的回答，为什么又要套一次卡片？" —— 截图显示中间轮过渡语"我先读一下该 handler…"既出现在步骤流的「作答」步，又出现在答案气泡（套 markdown 卡片）。
根因：runner 把**每一轮**的 content 都 `answer += ... + onDelta + emitStep('answer')`，包括调工具前的过渡语。
修复：与分析主链路 `finalText` 同口径 —— content 先缓冲到 `roundContent`；只有确认**本轮无 tool_calls（最终作答轮）或异常收口**才 flush 到 answer/delta/作答步骤；中间轮过渡语只作 `r{N}-note` 的「说明」步骤进步骤流，不进答案气泡。
验证：新增回归测试 ②b（中间轮过渡语不进答案），6/6 绿；后端 tsc 仍 7 既有错、前端未变。

## 补充修复（2026-11-19 第四轮，真机截图：答案仍套气泡）

用户反馈"回复不需要再套一层气泡" —— 第三轮只加了 markdown 渲染，`gov-ask__bubble` 气泡壳仍在。
修复：答案区（历史 turn + pending）去掉 `.gov-ask__bubble gov-ask__bubble--md` 包裹，改用 `.gov-ask__answer` **平铺**（无背景/边框/圆角），与 AI 对话页助手回答同款；保留 MarkdownPreview 富文本渲染与 p/list/code/table 排版样式。用户问题仍是右侧气泡。前端 tsc 0 / build ✓（960ms）。

## 补充修复（2026-11-19 第五轮，真机截图：思考过程仍在气泡里）

用户反馈"思考过程怎么还是在气泡里面" —— 第四轮只去了答案气泡，`.gov-ask__steps` 自带 `background/border/border-radius` 仍是一层框。
修复：`.gov-ask__steps` 去掉浅底、边框、圆角，改 `padding: 2px 0` 平铺（步骤条目仍保留类型胶囊标签用于区分思考/查证）。前端 tsc 0 / build ✓（1.05s）。

## 未提交
