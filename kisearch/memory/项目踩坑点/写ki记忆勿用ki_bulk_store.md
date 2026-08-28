---
groupPath: 项目踩坑点
relation: 写ki记忆勿用ki_bulk_store
exportedAt: "2026-08-28T07:42:44.100Z"
---
踩坑：往 ki 写**记忆片段**时不能用 `ki_bulk_store`，必须用 `ki_sync_relation`（单条）或 `ki sync-relation --input <file>`（批量）。

原因：`ki_bulk_store`（src/bulk-store.ts::executeBulkStore）是**向量层专用**批量写入，入参只认 `{text, tags}` 数组，直接调 vectorBulkStore——**不写 relations-cache / local KB / group-index 树**。用它写记忆的后果：
1. 内容只有 text 字段（标题），module_info 正文被丢弃；
2. relations-cache 与 group 树不更新，`ki_query_group` 查不到、树里看不到；
3. 产出的向量没有 cache 归属，成为**孤儿向量**，后续 `delete-relation` 的 deleteBySearch 严格匹配（要求 relation 名作标题前缀）也清理不掉。

正确做法：
- 单条：`ki_sync_relation`（MCP）传 group / relation / module_info / tags
- 批量：CLI `node bin/ki.mjs sync-relation --scope <s> --input <file>`，文件为 JSON 数组，每项 {group, relation, module_info, tags}。MCP 的 `ki_bulk_sync_relation` 只收**内联 items 数组**，不接受 input 文件路径。

误用后的清理：写脚本调 `vectorDelete({scope, ids})`（src/lib/vector-client.ts）按 bulk_store 返回的 memoryId 逐个删，最后 closeEngine()。嵌入式锁被 ki daemon 占用时会自动 probeWithRetry（2s×3）。