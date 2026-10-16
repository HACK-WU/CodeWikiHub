---
groupPath: 项目架构
relation: 读任务登记表与read契约（队列分层）
exportedAt: "2026-10-13T03:33:16.231Z"
---
# 读任务登记表与 read 契约（OperationCoordinator 队列分层）

**位置**：`src/lib/operation-coordinator.ts`（TaskKind / READ_OPERATIONS / READ_MCP_TOOLS / kindForOperation / kindForMcpToolNames）

## 三种任务类型
- `write`（缺省）：普通写/其它引擎操作，与同 scope 的一切任务互斥。
- `engine-only`：长引擎任务（`import` / `vector-optimize`），元数据写全部包在 `runMetadataCommit` 窗口内 ⇒ **不阻塞 read**，但仍阻塞 write。
- `read`：**只读任务**。2026-10-13 两次修订：① 不写元数据（评分回写等必须自包 `runMetadataCommit` 窗口）；② 不写引擎，**允许只读访问 zvec**（原文"read 不得打开 zvec"的保守约束按实测放宽）；③ 与「元数据提交窗口」互斥、与 engine-only 长任务及短写任务并行。
  - 引擎并发读依据（实测）：10.6s 导入（346 chunk 写）期间引擎直读 68–220ms（空闲基线 276ms）；18.5s 导入期间经 read 通道的检索 705–904ms，与直连（669–759ms）基本一致。

## 登记表（单一真相，改这里即可，勿在各入口各写一份）
- `READ_OPERATIONS`：`get-module-info`、`get-module-info-batch`、`query-group`、**`search`**（CLI/daemon，经 daemon-rpc 按 operation 名推导）；`doc-list-api`、`doc-get-api`、`doc-edit-read`、`asset-read-api`（HTTP，mcp-http-api 显式传 'read' + 登记双保险）
- `READ_MCP_TOOLS`：`ki_get_module_info`、`ki_query_group`、**`ki_search`**（MCP HTTP 通道 `kindForMcpToolNames` 与 chat 通道 `chat-mcp-<tool>` 共用）
- 刻意**不登记**：`tag-list` / `ki_tag_list`（全库扫描重读）、`doc-list`（CLI `ki doc list` 是向量层扫描）—— 结果在导入/重建期间是中间态且非交互刚需，保持 write 串行。

## 推导入口（都不传 kind，靠 operation 名推导）
- `daemon-rpc.ts`（CLI 经 daemon）：`kindForOperation(req.operation)`
- `mcp-http.ts`（POST /mcp）：`kindForMcpToolNames(calledTools)` —— **一次请求含多个 tools/call 时，全部是读工具才判 read，混入任一写工具整批回退 write**
- `chat/mcp-tool-registry.ts`：operation 形如 `chat-mcp-<tool>`，由同一函数识别
- `mcp-http-api.ts`：`/doc/list`、`/doc/get`、`/doc/edit`(GET)、`/asset` 显式传 'read'

## 检索放开（2026-10-13 用户拍板）
- 放开前：`ki_search` / `search` 按 write ⇒ 导入期间检索排到队尾（实测 hybrid 4991ms、fulltext 4921ms，等到导入结束）。
- 放开后：导入进行中 hybrid 904ms / fulltext 705ms（18.5s 导入，导入仍在跑时返回）。
- 代价（用户已确认）：结果可能是**中间态** —— 新导入文档向量已分批写入但元数据未提交时，原文召回降级（既有降级机制兜底，不报错）；hybrid 可能出现 `degraded` 标记（O1 既有行为）。

## 关键约束
- 新增读类 operation **必须**在登记表登记，否则缺省落 `write` ⇒ 又会被导入长任务挡住（两次事故同源：HTTP 入口漏标、MCP 通道整体缺省）。
- 只有真正"元数据写全在提交窗口内"的长任务才能用 engine-only。
- 回归锚点：`test/coordinator-read-lane.test.ts`（⑩ 登记表、⑪ MCP 工具批 kind、⑫ daemon 读命令行为 + 窗口互斥不回归、⑬ 检索立即执行 vs tag-list 排队）。