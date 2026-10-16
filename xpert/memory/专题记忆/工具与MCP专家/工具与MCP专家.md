---
groupPath: 专题记忆/工具与MCP专家
relation: 工具与MCP专家
exportedAt: "2026-10-16T07:28:46.846Z"
---
【专题记忆｜工具与MCP专家】
- 资产路径：.module-experts/后端专题/工具与 MCP 专家/（用 expert-lookup 加载；含 3 个子专家）
- 一句话职责：回答「Agent 的能力从哪来、怎么执行、怎么对外发布 / 装配」——上游工具集与工具声明 → 中游 `ToolRuntimeService` 唯一执行出口 → 下游 MCP 发布与 Agent 插件装配的单向管道
- 基线：`2026-10-16 · commit 80f5676fd`（批次 5 第 10 专家；**未复跑 jest**，见 test/known-failures.md）
- 模块范围①：`packages/server-ai/src/xpert-toolset` — 104 非 spec · 17 spec · 2 表（`xpert_toolset`、`mcp_runtime_instance`）+ M2M `tag_xpert_toolset`（无实体类，不计入）
- 模块范围②：`xpert-tool` — 13 · 2 · 1 表（`xpert_tool`）；`mcp` — 14 · 0 · **0 表**（通用 MCP Server SDK 封装，`MCPModule` 全仓无装配点）
- 模块范围③：`mcp-publication` — 43 · 24 · 8 表；`agent-plugin` — 50 · 30 · 2 表；**合计 224 非 spec / 73 spec / 13 张自有表**
- HTTP 前缀：`/api/xpert-toolset`、`/api/xpert-tool`、`/api/mcp/sse` + `/api/mcp/messages`、`/api/mcp-publications`、`/api/mcp/p/:slug`、`/api/agent-plugins`、`/api/assistants/:id/resources*`
- 子专家①：工具集与工具子专家（工具集 / 工具本体、四 provider、schema 发现、凭据出口、统一执行面）
- 子专家②：MCP协议与发布子专家（mcp SDK 封装、stdio 运行时与审计、发布单 / 能力台账 / Key·OAuth / 调用审计 / 长任务）
- 子专家③：Agent插件子专家（PortablePlugin 导入 / 绑定 / 维护、运行时资源解析、安装器投影）
- 核心能力（工具侧）：`XpertToolsetService.createBuiltinToolset/getAllByWorkspace/afterLoad`、`XpertToolService.testTool/getParamsFaker`、`ToolInvokeHandler.execute`、`ToolRuntimeService.loadToolsets/executeTool/describeCapabilities` + MCP 能力四件套
- 核心能力（发布侧）：`McpPublicationService.create/update/enable/replaceCapabilities/assertCanEnable`、`McpCapabilityCatalogService.discoverAndReplaceMcpToolset`、`McpApiKeyService.create/rotate/authenticate`、`McpTaskService.create/get/update/cancel`、`McpPublicationRuntimeService.handle`
- 核心能力（插件侧）：`AgentPluginService.importGit/importZip/importStagedDirectory/createBinding`、`AgentPluginInstallationsService.retainTemplateReference`、`RuntimeResourceService.catalog/resolve/authorize/read/update`
- 高频坑①：`ToolsetGuard` 是 **5 分钟用户级缓存**且只缓存允许结果，全仓**没有任何主动清除调用点**——撤权后有最长 5 分钟窗口
- 高频坑②：`select:false` + `@Exclude` 常被误判为「数据缺失」——`McpApiKey.keyHash`/`encryptedSecret` 与 `mcp_task` payload 类列默认查询根本不取列，读密文必须显式 `.addSelect(...)`
- 高频坑③：能力哈希 ≠ 破坏性变更——descriptor 改了哈希即变，但只有 `compareMcpCapabilityDescriptors` 判为 breaking 才置 `reviewStatus='required'`；`mcp_task.revision` 只是普通 int 列，**不是乐观锁**
- 关键代码位置（工具侧）：`xpert-toolset/xpert-toolset.service.ts`、`xpert-toolset/provider/{builtin,openapi,odata,mcp}/**`、`tool-runtime/tool-runtime.service.ts`、`xpert-tool/commands/handlers/tool-invoke.handler.ts`
- 关键代码位置（发布侧）：`mcp-publication/{mcp-publication.service.ts,mcp-publication-runtime.service.ts,mcp-capability-catalog.service.ts,mcp-api-key.service.ts,mcp-task.service.ts}`、`xpert-toolset/mcp-runtime-audit.service.ts`
- 关键代码位置（插件侧）：`agent-plugin/{agent-plugin.service.ts,agent-plugin-parser.ts,runtime-resource.service.ts}`、`plugin-resource/plugin-resource-installer.service.ts`
- 数据落地（13 张自有表）：`xpert_toolset`·`xpert_tool`·`mcp_runtime_instance` / `mcp_publication`·`_capability`·`mcp_capability_catalog`·`mcp_publication_access`·`mcp_api_key`·`mcp_oauth_policy`·`mcp_invocation_audit`·`mcp_task` / `agent_plugin_package`·`agent_resource_binding`（+ M2M `tag_xpert_toolset`）
- 数据落地口径：只有 `agent-plugin` 有 3 份 SQL，其余 4 模块**无 migrations**（DDL 唯一事实来源是实体注解）；`@VersionColumn` 全 0 命中，**仅 `xpert_toolset` 可软删**
- 检索触发词：工具集, toolset, xpert-toolset, xpert-tool, 工具试跑, provider, builtin, openapi, odata, mcp, MCP客户端, stdio, mcp_runtime_instance, 凭据, credentials, ToolsetGuard, ToolRuntimeService, capability-descriptor, descriptorHash, 发布单, mcp_publication, slug, api key, mcp_api_key, xpert_mcp_, OAuth, mcp_task, idempotencyKey, inputHash, 调用审计, mcp_invocation_audit, Agent插件, agent_plugin_package, digest, PortablePlugin, runtime-resource, 安装器
- 详细资产：见 .module-experts/后端专题/工具与 MCP 专家/ — 契约层 C0~C5 + implementation/01~07 + sub-experts/3 子（工具集与工具、MCP协议与发布、Agent插件）