---
groupPath: 项目踩坑点
relation: 导入期间读被队列阻塞（MCP通道缺省write）
exportedAt: "2026-10-16T03:18:13.976Z"
---
# 导入期间读被队列阻塞（MCP通道缺省write）

**现象**（用户截图反馈 2026-10-13）：导入进入向量化阶段时，知识库浏览页点开文档长时间转圈，左栏列表正常。用户原话："说是在进入队列中，正在等待"。

## 根因链
浏览页正文 `fetcher={kiGetModuleInfo}`（`web/src/pages/BrowsePage.tsx:945`）→ `POST /mcp` tools/call → `src/lib/mcp-http.ts` 的 `submit({operation:'mcp-request'}, …)` **不传 kind** → `kindForOperation('mcp-request')` 缺省 `'write'`（`src/lib/operation-coordinator.ts`）→ 与同 scope 导入（`engine-only`）的 `running` 计数互斥 → 排到队尾直到导入结束。

导入（`mcp-http-api.ts` runImportJob / `daemon-rpc.ts`）整个流程（含向量化长尾）都在 coordinator handler 内占着该 scope。

## 实证（隔离实例，不碰现网）
- 真实导入 60 篇 / 346 chunk 进行中：`/api/doc/list` 3ms（read 通道），MCP 读正文 **8745ms**（等导入结束才返回）
- 确定性探针（4s 长任务）：doc/list 2ms；MCP 3703ms，与长任务结束时刻 Δ=3ms；coordinator `queuedMs=3551ms`
- **检索同样中招**（2026-10-13 追加实测）：导入中 MCP `ki_search` hybrid **4991ms**、fulltext **4921ms**（均等到导入结束）；直连（绕过队列）只需 735–820ms
- 复现脚本：`temp/repro-mcp-queue-during-import.ts`、`temp/verify-mcp-queue-kind.ts`、`temp/verify-search-during-import.ts`

## 修复（2026-10-13）
1. **新增 `/api/doc/get`**（HTTP，`read` 通道）：浏览页正文改走它；`executeGetModuleInfoLocal(params, {noVectorFallback:true})` 精确读（不走向量兜底 ⇒ 不打开 zvec），评分回写仍入 `withMetadataCommitSync` 窗口。
2. **`/api/asset` 改 read**：附件复制原子化（tmp + rename，`import.ts::collectAndCopyAssets`）消除半写窗口。
3. **read 契约放宽**（P2）：`TaskKind='read'` 从"不打开 zvec"放宽为"只读任务（不写元数据/引擎，允许只读访问 zvec）"。依据实测：10.6s 导入（346 chunk 向量写）期间引擎直读 68–220ms，与空闲基线 276ms 同量级 ⇒ zvec worker 串行服务读写、读插空执行。
4. 读任务集中登记（单一真相）：`READ_OPERATIONS`（get-module-info / get-module-info-batch / query-group / **search** / doc-*-api / doc-edit-read / asset-read-api）+ `READ_MCP_TOOLS`（ki_get_module_info、ki_query_group、**ki_search**）；`kindForOperation` 同时识别 chat 的 `chat-mcp-<tool>` 前缀。
5. **检索放开**（用户拍板）：语义与全文检索不再排队 —— 18.5s 长导入进行中 MCP hybrid **904ms** / fulltext **705ms**（与直连 669–759ms 一致，导入仍在跑时返回）。

## 关键约束（勿踩）
- `tag-list` / `ki_tag_list`（全库扫描）与 `doc-list`（CLI `ki doc list` 向量层列举）**刻意保持 write**：结果在导入期间是中间态且非交互刚需。
- MCP 一批请求混入任一非白名单工具 ⇒ 整批回退 `write`（`kindForMcpToolNames`）；例如 AI 同时调 `ki_search` + `ki_sync_relation` 会整批排队。
- 新增读类 operation **必须**在 `READ_OPERATIONS` / `READ_MCP_TOOLS` 登记，否则缺省落 `write`（这正是本次缺陷成因）。
- 检索放开的代价（用户已确认接受）：结果可能为**中间态** —— 新导入文档向量已分批写但元数据未提交时原文召回降级；hybrid 可能出现 `degraded` 标记（O1 既有机制）。
- 残留：`/api/tags` 仍是 write ⇒ 导入期间排队（后台查询，不阻塞阅读，未修）。其路由 `submit({operation:'tags-api'}, …, [scope])` **不传 kind**，`tags-api` 未在 `READ_OPERATIONS` 登记 ⇒ 缺省 write。

## 订正（2026-10-16，用户授权）
原记载把 `/api/vector/status`(GET) 与 `/api/tags` 并列写作"仍是 write ⇒ 导入期间排队"，**该半句不成立**：
- 代码：该路由**没有 coordinator submit**，直接读快照文件（`src/lib/mcp-http-api.ts:490-494` → `readVectorDimensionSnapshot`，只读 `.vector-status/*.json`、不打开 zvec）。
- 实测（`temp/verify-vector-status-lane.ts` **4/4**，隔离实例）：write 车道被 4s 任务占用期间（`snapshot().activeWorkers=1`；同车道第二个写任务 `queuedMs=**3697ms**` 证明车道确实在拦），该端点 **1ms** 返回（占用结束后 2ms；955ms 那个数是首调用冷启）。
- 成因推测：当日是与 `/api/tags` 并列时的推断，未单独实测。

## 验证
- 隔离端到端 `temp/repro-mcp-queue-during-import.ts` **8/8**：导入中 doc/get 1–2ms、asset 5–8ms、MCP 读正文 3–5ms（修复前 8745ms）；doc/get 与 MCP 读回同一份正文
- 检索端到端 `temp/verify-search-during-import.ts`：18.5s 导入中 hybrid 904ms / fulltext 705ms（修复前 4991/4921ms）
- `test/coordinator-read-lane.test.ts` **13/13**（⑩ 登记表、⑪ MCP 工具批 kind、⑫ daemon 读命令行为 + 窗口互斥不回归、⑬ 检索立即执行 vs tag-list 排队）
- 车道核实（2026-10-16）：`temp/verify-vector-status-lane.ts` **4/4**
- 回归：mcp-http 30/30、mcp-http-api 41/41、get-module-info 12/12、search-original 6/6、import-assets 26/26、integration 10/10、web 136/136；tsc 仅 2 条基线错误；web build 通过
- ⚠️ 生效需**重启 daemon**（用户跑的是 `node jiti src/mcp-server.ts --http --web -d`，进程内模块不会热更）