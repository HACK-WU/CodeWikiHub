---
groupPath: 接口信息/关系与索引管理
relation: get-module-info 批量查询契约
exportedAt: "2026-09-02T07:20:51.869Z"
---
# ki_get_module_info 批量查询（2026-09-02 新增）

- 入口：`executeGetModuleInfoBatch`（src/get-module-info.ts），MCP 层 `ki_get_module_info` 新增可选 `relations: string[]`（≤10，与 `relation` 互斥二选一）；CLI `--relation` 逗号分隔多条走批量，单值行为不变
- 语义：同 Group 约束天然成立（group 单值参数）；relations 去重保留首次顺序；逐条独立 ok（results[].ok + 顶层 succeeded/failed，对齐 ki_bulk_sync_relation 风格）；超限 fail-loud 不截断
- 批量收益：resolveGroupPath（向量兜底）只做 1 次、localKb 一次读取、评分 recordUse 合并一次 writeJson
- 共享助手 `findRelationWithFuzzy`（精确 id/text → searchPath 模糊，向量不可用静默降级）；单条 executeGetModuleInfo 契约零变化
- 同步义务已履行：docs/cli.md 两处 + codekb-agent-guide 第③步批量提示；web/src/api/mcpClient.ts 消费方可选参数向后兼容无需改