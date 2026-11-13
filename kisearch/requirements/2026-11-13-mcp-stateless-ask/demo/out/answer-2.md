# 在 ki 里新增一个 MCP 工具需要改动哪些地方？

新增一个 MCP 工具，至少涉及以下 6 类改动；其中 **HTTP scope 白名单** 和 **队列分道** 是最容易漏掉、漏了会直接出故障的两处。

## 1. 工具本体与装配
- 在 `src/lib/mcp-tools/<tool>.ts` 增加工具定义：工具名、描述、`inputSchema`。现有范例：`src/lib/mcp-tools/edit-relation.ts`、`src/lib/mcp-tools/get-module-info.ts`。
- 业务实现放在对应的 `src/<domain>.ts`，暴露 `executeXxx()`。写操作按现有模式写成「**daemon client 优先，否则 `executeXxxLocal`**」，避免绕过 daemon 的单写者/队列；`ki_edit_relation` 就是 `executeEditRelation` 走这个模式。
- 服务端构建入口是 `src/mcp-server.ts::buildKiMcpServer`，新工具要接入该构建链路。

## 2. HTTP scope 授权（必改，易漏）
- 无 `scope` 参数的工具，必须加入 **`SCOPE_LESS_TOOLS` 白名单**。否则 HTTP 模式下 `arguments.scope` 缺省按 `default` 校验，会被 scope 闸门误伤 403。
- 枚举类工具（如 `ki_scope_list`、`ki_manage_index_list`）还要在工具层按 `authScopes` 过滤输出。

## 3. 队列分道（必改，否则导入期间会被挡住）
- 只读工具：在 `src/lib/operation-coordinator.ts` 的 **`READ_MCP_TOOLS`** 登记工具名；chat 通道的 `chat-mcp-<tool>` 由同一函数识别，不用另写一份。
- 写工具：不登记，缺省落 `write`。注意一批请求里混入任一非白名单工具，整批回退 `write`。
- 若新增的是读类 operation，还要在 **`READ_OPERATIONS`** 登记；否则缺省 `write`，又会被导入长任务挡住。

## 4. 超时
- 在 `src/lib/mcp-tools/util.ts::TOOL_TIMEOUT` 选预设：`READ 30s / WRITE 60s / BULK 300s`。
- 涉及多次 embedding 重试的长写工具用独立常量，例如 `ki_sync_relation` / `ki_bulk_sync_relation` 设 240s。

## 5. 对话侧（要让 AI 能调用时）
- `src/lib/chat/mcp-tool-registry.ts`：同步工具定义/短描述、`defaultDescribe`、工具预算与返回体截断口径；改工具描述时，`mcp-tools/*.ts` 与这里两处都要同步（`ki_manage_index_create` 修复时就是同步这两处 + `docs/cli.md`）。
- 若该工具要在对话配置面板出现开关，还要同步前端工具分组清单（`MCP_TOOL_GROUPS`；`GET /api/chat/prompt-config` 会下发 `toolGroups`）。
- 若该工具被某个内置 skill 依赖：更新 `SKILL_REQUIRED_TOOLS`（后端 `prompt-config.ts` + 前端 `PromptConfigLayer.tsx` 手工同源，守卫 `web/test/skill-tool-dependency.test.mjs`）。

## 6. 文档、测试与发布
- 文档：`docs/cli.md`（若同时加 CLI 命令/参数）；`codekb-agent-guide` 的 MCP 工具步骤（如有）。知识库里两份工具清单也应同步：`接口信息/关系与索引管理/MCP工具清单`、`接口信息/检索与向量客户端/MCP工具清单与超时`。
- 测试：
  - `test/chat/mcp-tool-registry.test.ts`（工具描述、预算、limit 钳制）；
  - `test/coordinator-read-lane.test.ts`（读工具登记、批量 kind）；
  - `test/mcp-http*` / `test/integration.test.ts` 等回归。
- **jiti alias 夹具**：`test/chat/fixtures/generation-search.ts` / `response-search.ts` 把 `../mcp-tool-registry.js` 整模块替换；真实模块新增导出时夹具不同步，会让 `tool-cancellation-integrity` 稳定失败。
- 发布：后端改动需**重启 daemon** 才生效；前端刷新即生效。

## 设计先例
如果只是扩展现有能力，项目先例是「**扩展现有工具而非新增工具**」：`ki_get_module_info` 批量查询就是用户拍板的方案 A，用 `relations: string[]` 扩展，而不是新增工具。新增工具会把上面的清单、授权、文档、测试同步成本全部再走一遍。

依据：`接口信息/关系与索引管理/MCP工具清单`、`接口信息/检索与向量客户端/MCP工具清单与超时`、`项目架构/读任务登记表与read契约（队列分层）`、`项目踩坑点/导入期间读被队列阻塞（MCP通道缺省write）`、`接口信息/关系与索引管理/Relation局部编辑（ki_edit_relation）`、`决策记录`/`archive` 中 `SCOPE_LESS_TOOLS` 与 `ki_get_module_info` 批量方案条目。
