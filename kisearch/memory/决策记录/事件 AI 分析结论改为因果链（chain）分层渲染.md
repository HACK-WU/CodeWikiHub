---
groupPath: 决策记录
relation: 事件 AI 分析结论改为因果链（chain）分层渲染
exportedAt: "2026-11-19T06:17:54.549Z"
---
事件 AI 分析的结论从「一段 ≤300 字纯文本」改为「一句话总结 + 2~5 个因果链节点」，2026-11-19 实施。
- 数据：AnalysisDraft 新增 chain: ConclusionNode[]（kind = symptom/cause/root/impact/fix；text ≤200 字；ref = file:line；branches 仅 root、≤3 条）；conclusion 收窄为一句话总结（≤120 字）。归一与裁剪在 src/lib/events/conclusion-chain.ts（normalizeChain / pruneChainRefs / chainToLines），runner 解析、store 读盘、ask-runner 上下文三处共用。
- 关键约束：ref 必须在二次校验之后 pruneChainRefs 剪一遍；旧文件无 chain → 读盘归一为 [] → 前端回退纯文本。行号 0 这类「形态合法但无意义」的值单独拦。
- 前端：ConclusionChain.tsx（卡片与 AiAnalyzePanel 共用，boxed 控制外壳）。**位置胶囊不依赖模型填 ref** —— 实测 5 个节点 ref 全空、模型把路径写在正文反引号里，故新增 web/src/lib/codeRef.ts 从正文认：路径（path:line 精确 → 区间内 → 同文件唯一 → 同文件行号最小）与符号（`liveThinking?` / `EventView.pinnedAt` 取末段，在已确认快照正文里按词边界找）。歧义不隐藏：浮层首行写真实 file:line，页脚写「该文件另有 N 处」。
- 点开是 portal + fixed 浮层：深色代码快照（复用 gov-codeloc__codewrap/__ln/__snip）、命中行行号高亮、Esc / 点空白 / 再点一次关闭、下方空间不足自动翻上方。
- 提示词：SYSTEM_OUTPUT_TAIL 第 6 条要求正文里的代码位置一律用反引号包住（有行号写 path:line），前端据此成链。
- 验证：真机 #48（5 节点 / 5 处已确认）实测 8 个胶囊、meta「引用 4 处」、浮层 480×138 在框内、Esc/切换/点空白均关闭、0 控制台错误；单测 code-ref 19 例 + conclusion-chain 8 例，test/events 全绿，web 1345 全绿、两端 tsc 0、build ✓。
- 边界：契约门禁 governance-contract 仍红（4 处旧漂移，已上报 #48）；符号匹配走快照正文，未命中时保持普通 code（不做就近猜）。