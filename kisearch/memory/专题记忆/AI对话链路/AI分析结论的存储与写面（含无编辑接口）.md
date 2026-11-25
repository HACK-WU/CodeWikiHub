---
groupPath: 专题记忆/AI对话链路
relation: AI分析结论的存储与写面（含无编辑接口）
exportedAt: "2026-11-23T03:23:11.160Z"
---
AI 分析结论（conclusion + chain）与已确认位置（confirmed[]）仍是不可编辑的产物（无 PATCH/PUT 改 conclusion/chain），但 2026-11-23 起新增了「整份重置」写面：清空而非编辑。
- 写面全集（2026-11-23 更新）：POST /analyze、POST /analysis/cancel、POST /analysis/ask、POST /analysis/confirm（只写 confirmed[]）、DELETE /analysis/draft（只清 draft、**保留** confirmed）、DELETE /analysis/confirmed/:locId（删单条）、**DELETE /analysis（整份重置：draft + confirmed 在同一把分析锁内一次清空，并连清 .analysis.resume.json、.ask.json、进程内 finishedRuns 徽标）**
- 落盘：.events/{eventId}.analysis.json；写入者 writeDraftStart / updateDraftIfMatch / resetAnalysis，锁键 `\0analysis:<hash>`（与 KB scope 写锁分离）
- 被取代的旧判断：此前「无整份重置写面，只能丢草稿 + 逐条移除」——已被上面的 DELETE /analysis 取代
- 消费点 4 处：前端 EventAnalysisCard → ConclusionChain（只读）、追问 buildContext、MCP ki_event_list.conclusionPreview（120 字）/ ki_event_get、GET /governance/events/:id
- 重置的三个坑：① 运行中必须 409（draft 为空会让后台 updateDraftIfMatch no-op，一轮 LLM 白跑）；② draft=null 时 resume 的 runId 守卫失效（`startEventAnalysis` 要求 draft?.runId 为真），必须一并清断点；③ 附属清理必须用同步强删（clearResume / removeAskFile），用带锁的 clearAskTurns 会在锁忙时抛错 → 主数据已清却向用户报失败
- 归一真源：conclusion-chain.ts（normalizeChain / pruneChainRefs / chainToLines），三处入口共用，不可另写一套