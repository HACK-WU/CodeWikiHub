---
groupPath: 关联关系/关系与索引管理
relation: 与向量客户端和MCP服务的依赖
exportedAt: "2026-08-28T07:38:41.827Z"
---
关系与索引管理（消费方）依赖：
- **检索与向量客户端专家（vector-client）**：本模块经它做 vectorBulkStore / vectorDelete / vectorSearch / ensureVectorAvailable / closeEngine。契约要点：向量删除 NOT_FOUND 视为已清理（幂等重删不误报）；searchPath 的阈值用 RRF 融合分（默认 0，不可沿用余弦 0.75）；所有命令 finally 统一 closeEngine。改 vector-client 的返回值/error code 会影响 delete-group 的 vectorRemoved 判定与 sync-relation 的 vectorReason。
- **MCP 服务专家**：本模块 8 个 MCP 工具的注册、240s 超时、scope 授权与 SCOPE_LESS_TOOLS 白名单（ki_manage_index_list）都在 MCP 层。新增无 scope 参数工具必须同步加白名单，否则 HTTP 模式 403。
- **存储与配置基础专家**：提供 store(writeJson/ensureScopeDir)、scope(resolveScope/validateScope/getSource/getScopeWikiSync/listAllScopes)、config（wikiSync 三字段读取 + config-schema 校验）。改 config-schema 的 wikiSync 字段集须同步本模块的读取点。
- 方向：本模块是消费方，改本模块通常不需要连带改上述三方；但改三方（尤其 vector-client 错误语义、config-schema 字段集）必须回头核对本模块。