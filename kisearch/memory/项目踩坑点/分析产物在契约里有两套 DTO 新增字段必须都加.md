---
groupPath: 项目踩坑点
relation: 分析产物在契约里有两套 DTO 新增字段必须都加
exportedAt: "2026-11-24T03:37:43.949Z"
---
事件分析产物在契约层是**两套 DTO**，新增字段只加一套会出现「页面有、MCP 没有」（写进去了也读不出来）：

- **完整通道**：`EventAnalysisDto.draft` → `AnalysisDraftDto`（事件页 AI 分析卡走这个）
- **精简通道**：`EventDetailDto.analysis.draft` → `AnalysisDraftSummaryDto`（MCP `ki_event_get` 与详情走这个），由 `src/lib/events/event-detail.ts` 的**逐字段白名单**构造 —— 不显式透出就读不到
- **第三处易漏**：`askTurn.proposal` 内联对象（追问补丁建议），它不是独立 interface 名，grep 接口名搜不到
- 排查口径：新增分析字段时先 `grep -n "chain: ConclusionNodeDto" src/lib/governance-contract.ts`，**有几处就改几处**（本仓当前 3 处），前端副本同位置同数量
- 教训来源：REQ-20261124-001 前置层（2026-11-24）auto-review 抓到 `AnalysisDraftSummaryDto` 与 `proposal` 两处漏加，其中前者正是设计文档原判断（"会自动带出"）的错误