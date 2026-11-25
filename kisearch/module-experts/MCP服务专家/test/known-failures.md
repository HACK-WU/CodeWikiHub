# 已知单元测试失败：MCP 服务专家

> **历史快照提示（2026-11-25 合并补全）**：本篇主体保留 2026-08 基线时的描述；文中出现的旧命令、旧文件数与旧工具清单均为**当时状态**，现已变更。当前口径以文末的「合并补全」增量章节与 `INDEX.md` 为准。


## MCP 服务专家（当前无已知失败）

当前无已记录的已知失败单元测试。若在使用中发现测试问题，请按以下格式追加。

### {测试文件路径}:{测试函数名}

- **执行方式**：{运行该测试的完整命令}
- **失败时间**：{date}
- **失败原因**：{断言错误摘要}
- **修复尝试**：{尝试了什么，为什么未修复}
- **影响**：{对使用/验证的影响}
- **来源**：code-review 阶段 8 / expert-lookup 增量更新

---

> **合并补全（2026-11-25，基线 0f1426b）**
> - **规模**：`src/lib/mcp-tools/` 26 个 .ts（旧记 12），`/mcp` 注册 23 个工具（旧记 13）；`tool-access.ts` 的 READ_ONLY_TOOL_NAMES 为 11 个，写侧 12 个。
> - **新增模块**：`mcp-server-factory.ts`（buildKiMcpServer）、`mcp-runtime.ts`（setWebRuntime / getWebRuntime）、`daemon-{rpc,dispatch,bridge,client,protocol}.ts`（startDaemonRpcServer / dispatchOperation / startStdioDaemonBridge / ensureDaemon / getDaemonSocketPath）、`lock-holder.ts`（findLockHolder）、`scope-write-lock.ts`（withScopeWriteLock）、`operation-coordinator.ts`（OperationCoordinator / kindForMcpToolNames）。
> - **路由扩展**：`/healthz`（免鉴权诊断）、`/mcp`（StreamableHTTP + Bearer/Cookie/localAdmin + 只读/模型消耗闸门）、`/api/*`（chat / governance / views / atlas / datasource / tasks 子路由组）、`/open/v1/*`（受 uploadApi / downloadApi 开关控制）、`web/dist` 静态托管。
> - **已下线**：`ki_query_group` → `ki_group_list`；`ki_manage_index_create/list/delete` 三个工具随 `manage-index` 命令一并移除；`ki_get_image` 移出 `/mcp`；`ki_event_docs` / `ki_event_refs` / `ki_event_set_stage` 合并为 `ki_event_edit`。`bin/ki.mjs` 对 manage-index / query-group 是零兼容报错分支并给 `ki group` / `ki scope list` 替代命令。
> - **测试**：`test/mcp-*.test.ts` 15 个 + `test/chat/mcp-tool-registry.test.ts` + `*daemon*` 5 个；`npm run test:all` / `npm run test:serial`，daemon e2e 用 `npm run test:e2e:daemon-routes`（依赖网络）。
> - **注意**：`mcp-server-factory.ts` 里「读 6 / 写 13」的注释已过期，判据以 `mcp-tools/tool-access.ts` 为准。

