---
groupPath: 接口信息/关系与索引管理
relation: CLI命令族
exportedAt: "2026-08-28T07:38:41.827Z"
---
关系与索引管理对外 CLI（全部输出 JSON，失败退出码 1）：
- `ki sync-relation --scope --group --relation --module-info [--tags] [--no-vector]`：单条四层回写
- `ki sync-relation --input <file>`：批量（items 数组或 {items:[...]}，每项 {group,relation,module_info,tags?}）；--input --no-vector 走 syncBatch 仅 KB+wiki
- `ki query-group --scope [--groups] [--mode hot|warm|cold|emerging|full] [--hot-count N] [--depth 1-10]`：返回 {ok, scope, output:string}（output 是渲染好的纯文本）
- `ki manage-index --scope --action create|delete|list-scopes --name --parent [--force]`：--force 是非空节点级联删除的唯一开关
- `ki get-module-info --scope --group --relation`：读原文（有评分副作用）
- `ki delete-relation --scope --group [--relation] [--input]`：省略 --relation → 目录级删除；--input → 批量删除
- `ki wiki-backfill <scope> [--force]`：历史补齐（缺省幂等，--force 覆盖写）
输出字段：SyncRelationResult 含 vectorStored/vectorReason/wikiSynced/wikiFile/wikiReason/contentTags/evicted；BulkSyncRelationResult 含 total/succeeded/failed/skipped/results/vectorStored/hints；DeleteGroupResult 含 relationCount/wikiMoved/nodeRemoved/vectorRemoved；WikiBackfillResult 含 targetDir/stats{total,written,skipped,empty,existed}。