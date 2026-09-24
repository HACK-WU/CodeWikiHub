---
groupPath: 项目踩坑点
relation: ki_sync_relation 是整篇覆盖而非追加
exportedAt: "2026-09-24T09:28:30.013Z"
---
【踩坑｜ki_sync_relation 覆盖语义】2026-09-24 实测（代价：一条既有记忆被自己覆盖后手工恢复）。
- 事实：MCP `ki_sync_relation` 的 `module_info` = 该 Relation 的**完整正文**；对已存在的 Relation 是**整篇覆盖**，没有任何追加/拼接语义（`src/lib/mcp-tools/sync-relation.ts` 直接透传 moduleInfo，`src/sync-relation.ts` 无 append 分支；全仓 grep “追加” 仅命中存储层 chunk 追加与 wiki import）。
- 触发场景：想给一条已有记忆补几句话，只把新片段当 module_info 传进去 → 原内容整体消失（且同步写回 wiki 源文件，`wikiSynced:true`，不可从主仓 git 找回——memory 的 wiki 文件多为未跟踪的新生成物）。
- 正确做法：先 `ki_get_module_info(scope, group, relation)` 取回当前正文 → 拼接新片段 → 整篇写入；或改用 `ki_edit_relation` 做行级局部编辑（注意它是草稿+finish 异步流程）。
- 文档修正：`rules/ai-codekb-memory.md` 原第 237 行写“新片段追加到已有 Relation 末尾”属**错误指引**，已改为“module_info 是完整正文，整篇覆盖，追加需先取回再整篇写”。
- 自查方法：写入后 `node -e` 读 `kb/{scope}/{group}/index.json` 对比行数与首尾行，或 `ki_search` 复核关键词是否仍在。