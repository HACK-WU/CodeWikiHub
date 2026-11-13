# ki 的 MCP 工具鉴权是怎么做的？只读 Token 有哪些限制？

**结论**：文档中有记录的是「MCP HTTP 通道多 Token + scope 级 RBAC」；关于「只读 Token 及其限制」，本次检索未找到可核验片段。

## MCP 工具鉴权（已记录内容）

来源：`__root__/archive.md`，第 831–835 行（「[需求] ki mcp --http 多 Token + scope 授权 RBAC（2026-08-14）」）

- 多 Token 存储在 `~/.ki/mcp-tokens.json`（0600，原子写）；**token → scope 集合**授权，`all` 为保留字；`--token`/`KI_MCP_TOKEN` 为**全权临时 token**。
- scope 校验**下沉到 HTTP 层**：`handleMcpPost` 拦截 `arguments.scope`，缺省按 `default` 处理。
- 多轮安全加固（同段）：batch 全项越权校验（`findScopeViolation`）；枚举工具（`ki_scope_list`/`ki_manage_index_list`）由工具层 `authScopes` 过滤输出；`listTokensStrict` 损坏保护（鉴权宽松 fail-closed，写操作 strict）；**403 响应脱敏**（scope 名只写服务端 stderr）。
- 已知边界（同段）：token「读-改-写」并发丢更新未加锁（低频可接受）。

补充两条相关约束：
- 无 scope 参数的工具曾被子句校验误伤 403，修法是 `SCOPE_LESS_TOOLS` 白名单豁免，「**新增无 scope 参数的工具必须同步加白名单**」（`archive.md` 第 884 行）。
- HTTP 只读接口（如 `/api/asset`、`/tags`、`/doc/list`）必须加入 `handleApiRequest` 的 query scope 越权校验列表，否则不受越权拦截，越权返回脱敏 403（`接口信息/知识索引导入/附件服务` 第 12 行）。

## 只读 Token 的限制

本次多次检索（含「鉴权」「只读 token」「authScopes」「readonly 只读权限」）均未命中「只读 Token」这一角色/类型，也未命中其限制清单。已检出的鉴权模型是按 **scope 范围**授予权限（含 `all` 全权、`--token` 全权临时 token），文档里**未见按读/写分级的 token 类别**。

如果你要的是某个具体的只读 token 行为（例如是否禁写、能否调 `ki_sync_relation`），需要补充限定信息（配置键名或命令名），我再按精确字面补查。
