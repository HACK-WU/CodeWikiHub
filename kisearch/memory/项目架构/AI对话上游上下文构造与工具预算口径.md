---
groupPath: 项目架构
relation: AI对话上游上下文构造与工具预算口径
exportedAt: "2026-10-15T09:24:43.400Z"
---
【项目架构｜AI 对话上游上下文构造与工具预算口径】2026-10-15 **实施完成**（REQ-20261015-001，代码已落地并全量回归 314/314）。

上游 messages 构造（src/lib/chat/retrieval/tool-loop.ts）
- 顺序：恒定块（skill 目录→基础提示词→硬性规则）→ 已加载 skill 正文（会话级每轮重放）→ 压缩摘要（独立 system 块）→ 历史 messages（只取 role+content）→ 本轮 user（content = userText + 引用块 + 证据块）。
- 不变量：**末条恒为本轮 user**（degradedPath 的 splice 依赖）；引用与证据一律并入 content，不新增消息条目。
- 新增（S-02）：safeReplayItems(input) 收集历史证据 → withEvidenceBlock(withRefsBlock(userText, refs), items)；构造失败 try/catch 降级为无证据，**不阻断生成**。

证据回放（src/lib/chat/retrieval/replay.ts，新增）
- collectReplayItems(conv, budget, currentRefs)：按 user 切轮 → 只取最近 budget.turns 轮且**排除本轮** → 工具证据只收 phase==='end' 且 kind!=='skill' 且有 response.text → **两级去重**（历史引用按 (group,doc,text) 保留最早；与本轮 refs 比对剔除）→ 裁剪从新到旧、轮内自后向前、**按码点计数**（与 serializeToolResponse 同口径）、超限截断当前条并停止。
- 渲染：「更早第 N 次提问」+ 类别标注（轮次是**现存消息内相对序号**，压缩后从 1 重计）；块头三条判据（含"不是用户本轮的新输入"提示注入缓解）。
- 预算：CHAT_BUDGET.replayTurns=5 / replayMaxChars=**10000**（demo 实测校准：20000 时 TTFB +40%）。压缩联动：只遍历 conv.messages ⇒ 已移出轮次天然不回放。

工具预算（S-01）
- CHAT_BUDGET 新增：maxHitsPerCallHardMax=50（ki_search.limit 硬上界）、toolResponseCharsMin=1000 / toolResponseCharsMax=100000。maxHitsPerCall=5 / maxToolResponseChars=10000 语义升级为**内置默认**。
- PromptConfig 新增两个可选覆盖值 toolResponseChars / searchHitsPerCall（两级：prompt-config.json 覆盖 → 内置默认；**不写 config.yaml**）；normalizePromptConfig 越界即 issue → 整份回退默认。
- ki_search.limit：schema maximum=50、**去掉 default**；spec {min:1,max:50}；未传时由 applyBudgetDefault 在 tool-loop 的 entry.parse() **之后**注入 runtime.budget.hitsPerCall。
- 序列化：serializeToolResponse(value, limit=内置 10000)，返回值新增 limit 字段（旧记录缺失 → 前端回退文案）。limits 下发 6 字段。
- ★ 关键坑（challenger 意见 1，已端到端锁定）：执行路径走 getChatTool(call.name)（注册表**原始 entry**），runtime.toolEntries 只喂 schema ⇒ 预算注入必须在**执行必经点**；包装 enabledChatToolEntries 的返回值**永不执行**（配置会静默失效）。回归锁：test/chat/tool-budget-injection.test.ts。

提示词证据复用（S-03）
- renderRefsBlock 新增「若这些引用已足以回答，直接作答，不要为确认而重复检索相同内容」；基础提示词 2 处 + skill 正文 2 处补同源判据；提示词不再写死「1–5 / 10000」。
- 生效范围：renderRefsBlock 是代码（下一次提问生效）；基础提示词/skill 正文受"已保存配置优先"限制（需点「恢复默认」）。HARD_RULES_BLOCK（反幻觉 4 条）**未动**。

实测证据（2026-10-15，真实上游）
- 对照：旧口径 + 有证据 → 模型发起 ki_search（累计 2/3 次）；产品新文案 + 同证据 → **2/2 不调工具**、直接基于证据作答。脚本 temp/verify-s03-prompt-reuse.ts。
- 上游接受 21294 字符 user 消息（HTTP 200）；20K 字符证据 ≈ 9.6K token（≈2 字符/token）、TTFB +40%。
- demo 脚本与数据：需求目录 demo/{probe.mjs,result.json,verify-report.md}（密钥取自 ~/.ki/config.yaml，未硬编码）。

测试踩坑（**可复发，改动 mcp-tool-registry 导出时必须看**）
- jiti alias 夹具（test/chat/fixtures/generation-search.ts / response-search.ts）**整模块**替换 '../mcp-tool-registry.js' ⇒ 真实模块**新增/变更导出**必须同步夹具，否则该夹具下调用即抛错（本次缺 applyBudgetDefault 让 tool-cancellation-integrity 稳定失败）。
- 契约断言随上限同步：mcp-tool-registry.test.ts / contract-sr01.test.ts（limit 钳制 5 → 50）。
- 端到端注入验证：test/chat/tool-budget-injection.test.ts（真实 runToolLoop + mock 上游 + 夹具记录 lastSearchArgs）。

需求目录：CodeWikiHub/kisearch/requirements/2026-10-15-AI对话证据回放与工具预算可配/（design ×4 + review ×4 + demo ×3）