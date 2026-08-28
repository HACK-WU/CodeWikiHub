---
groupPath: 接口信息/检索与向量客户端
relation: MCP工具清单与超时
exportedAt: "2026-08-28T08:32:14.069Z"
---
检索与向量客户端暴露 4 个 MCP 工具（定义在 src/lib/mcp-tools/）：
- ki_search（scope? 默认 default / query / limit? 默认 10 / threshold? 0-1 / tags? / include_original? 默认 false）→ withTimeout TOOL_TIMEOUT.WRITE = 60s
- ki_store（scope? / text / tags? 默认 ki-search）→ WRITE 60s
- ki_bulk_store（scope? / input：JSON 文件路径）→ BULK 300s
- ki_tag_list（scope?）→ READ 30s
超时预设（src/lib/mcp-tools/util.ts::TOOL_TIMEOUT）：READ 30s / WRITE 60s / BULK 300s；关系索引管理的 sync-relation 用 240s 是独立常量。
授权：HTTP 模式下 arguments.scope 缺省按 default 校验；无 scope 参数工具须加 SCOPE_LESS_TOOLS 白名单。
配置字段（config-schema.ts 强校验）：embedding.baseURL（httpUrl）/ embedding.model / embedding.dimension（positiveInt，必须与集合一致否则 DimensionMismatchError）/ embedding.apiKey（明文或 ${VAR}，缺失 fail-loud）/ vectorDir / scopeMode（default|strict）。