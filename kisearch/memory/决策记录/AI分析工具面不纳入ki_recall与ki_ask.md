---
groupPath: 决策记录
relation: AI分析工具面不纳入ki_recall与ki_ask
exportedAt: "2026-11-19T07:07:39.155Z"
---
AI 分析与追问的内层工具面不登记 `ki_recall` / `ki_ask`：二者是编排层工具（内部自带工具循环），一旦放进内层，`maxToolRounds` 只在最外层计数就挡不住递归自调；分析只用源码只读 `fs_*` 四件套 + 知识库只读四件套（`ki_get_module_info` / `ki_search` / `ki_group_list` / `ki_tag_list`）。
- 拍板: 2026-11-19 用户复核确认（沿用 REQ-20261113-001 · S-02 对 `ki_ask` 的决策，并把 `ki_recall` 一并纳入排除）
- **程序级预取是允许的旁路**（2026-11-19 追加，用户提出）：模型看不到它 ≠ 分析用不到它。分析启动时由 `analysis-runner` 直接调 `executeRecall`（与 MCP `ki_recall` 同一实现），把「建议先读 + 整体结论」注入首轮上下文；模型无法反复触发，因此仍不构成递归面。配置 `analysis.recall.enabled/limit`（默认开 / 5 篇），失败只记一条 `recall` 步骤不阻塞分析。真机验证：预取返回 2 篇时，模型第一轮就 `ki_get_module_info` 读了其中一篇（group/relation 完全一致）。
- 界面落点: `ANALYSIS_TOOL_GROUPS.kb-read` 保持 4 项，设置页「AI 分析 → 知识库只读」不改勾选清单；预取用独立的「分析前预取」开关（不是工具行）。
- 被否的备选: 加工具后做递归深度限制（需新设计，收益不抵成本）
- 相关代码: `src/lib/chat/prompt-config.ts::MCP_TOOL_GROUPS` / `ANALYSIS_TOOL_GROUPS`；`src/lib/chat/mcp-tool-registry.ts` 的守卫断言；`src/lib/events/analysis-runner.ts::runRecallPrefetch`