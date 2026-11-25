---
groupPath: 决策记录/知识治理
relation: ki_event_get 的裁剪纪律与文档三元组约定
exportedAt: "2026-11-18T06:57:52.243Z"
---
新增 MCP 只读工具 ki_event_get：**ki_event_list 负责找，ki_event_get 负责读**。list 只给 conclusionPreview（120 字截断），无 refs、无阶段日志、无未确认点，AI 接手事件时判断不了「还缺什么」。
不返回的三样（用户拍板）：analysis.steps 整块、candidates 正文、draft.liveThinking。理由：与 unconfirmed/confirmed 信息重叠；单条 tools.response 就可能几 KB；**多一个 steps_limit 旋钮就多一种把上下文炸掉的用法**。只留 candidateTotal；当候选数 ≠ 已确认数时给 candidateNote（否则 12=12 会被读成「还有 12 个待处理」）。
文档引用必须带三元组 scope + 完整 group + name（跨库用 sourceScope 解析后的实际库），否则调用方只有文档名、ki_get_module_info 取不到正文；代码位置必须配 analysis.targetDir（file 是相对路径）。refs 的 visibility 是**被引文档自身**的档位（它可能绑在另一个未收口事件上而收窄），hint 已写死这句。
默认裁剪：members/refs/logs/locations 各 20，snippet 200 字；limit=0 = 不返回该块但仍给 total + note。refs_limit=0 时**跳过 listRefs**（否则白付逐条解析可见性的成本），直接 readRefs 取条数。日志取末尾 N 条（文件按写入正序）。
复用 readAnalysisDocRaw + normalizeAnalysisDocForRead(raw, false)，**不 import analysis-runner**（避免把 LLM 依赖拉进读工具）；僵尸 running 由 bootId + 超时归一。
**登记点是 5 处**（原有说法「三处」不完整）：READ_ONLY_TOOL_NAMES、READ_MCP_TOOLS、mcp-server-factory 读工具块、auth/tool-permissions.ts 的 TOOL_CAPABILITIES、前端 web/src/lib/resourcesPage.ts 的工具清单（后者有 web/test/resources-page.test.mjs 断言「工具名与 docs/mcp-tools.md 逐条一致」与「24 个工具 读 11/写 10/组织 3」，改工具数必须同步）。事件族整体不进 CHAT_MCP_TOOLS，所以 get 也不进。
本期不动 HTTP GET /governance/events/:id（用户拍板），避免前端回归；两套组装逻辑（HTTP 无 refs）的漂移风险记为遗留。
验证：mcp-event-get 6/6、mcp-event-tools 11/11、mcp-token-readonly 28/28、governance-routes 14/14、capability-coverage 4/4、web resources-page 134/134；tsc 7 条既有错误与本改动零交集。真机 #36/#37 已验证。