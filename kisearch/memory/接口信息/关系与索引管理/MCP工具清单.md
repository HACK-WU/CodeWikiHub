---
groupPath: 接口信息/关系与索引管理
relation: MCP工具清单
exportedAt: "2026-08-28T07:38:41.827Z"
---
关系与索引管理暴露 8 个 MCP 工具（定义在 src/lib/mcp-tools/）：
- ki_sync_relation（scope? group relation module_info vector? tags?）
- ki_bulk_sync_relation（scope? items[] vector?）—— 一次 embed + 一次 upsert
- ki_query_group（scope groups? hot_count? depth? mode? auto_fallback?）
- ki_manage_index_create（scope name parent?）
- ki_manage_index_delete（scope name parent?）—— **仅空节点**，非空拒绝并引导 CLI
- ki_manage_index_list（无参）—— 属 SCOPE_LESS_TOOLS 白名单，HTTP 模式下不被 scope 闸门误伤 403，输出按会话授权过滤
- ki_get_module_info（scope group relation）
- ki_delete_relation（scope? group relation）—— **无目录级、无批量**
超时：ki_sync_relation / ki_bulk_sync_relation 设 240s（覆盖 4 次 embedding 重试）。
授权：HTTP 模式下 arguments.scope 缺省按 default 校验；新增无 scope 参数的工具必须同步加 SCOPE_LESS_TOOLS 白名单。
级联删除不通过 MCP 暴露（NEG-15）。
注意：ki_bulk_store 是**向量层专用**批量写入（只吃 {text, tags}，不写 relations-cache/local KB/group 树），写记忆请用 ki_bulk_sync_relation 或 ki_sync_relation。