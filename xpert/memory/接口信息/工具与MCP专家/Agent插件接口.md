---
groupPath: 接口信息/工具与MCP专家
relation: Agent插件接口
exportedAt: "2026-10-16T07:28:46.846Z"
---
【接口信息｜Agent插件接口】
- 子功能：插件目录与可见性、git/zip 导入与 digest 幂等、绑定（`agent_plugin|middleware|external_xpert`）、更新与清理、运行时资源目录 / 解析 / 校验 / 授权与会话选择
- 所属模块：工具与 MCP 专家（子专家：Agent插件）
- 接口列表（前缀 `/api/agent-plugins`、`/api/assistants/:id/resources*`、`/api/conversations/:id/runtime-resources`）：
  - 目录与导入（12 条，**无控制器守卫**；服务层 `requireResourceAdmin()` + `resourceScope()` 强制 organization）：POST/GET `/api/agent-plugins/defaults`、GET `/catalog`、`/workspace-options`、`/workspaces/:id`、POST `/workspaces/:id/plugins`、GET `/options`、GET ``、POST `/git`、`/zip`、`/bindings`、PUT `/bindings/:id`
  - 维护（4 条）：GET `/updates`、POST `/packages/:id/update`、GET/POST `/packages/:id/cleanup`
  - 运行时资源（6 条，机器对机器）：`@Public()` + `ApiKeyOrClientSecretAuthGuard` + `@AllowClientSecretBindings(ENTERPRISE_XPERT)` —— POST `/assistants/:id/resources/commands`、GET `/assistants/:id/resources`、POST `.../validate`、`.../authorize`、GET/PUT `/conversations/:id/runtime-resources`
- 关键约束（导入）：git 只接受 HTTPS 无内嵌凭据；zip 限 100MB / 1 文件；统一 `parseAgentPlugin`（Ajv 2020 + zod 双校验，真实路径必须落在包根内）＋ `portablePackageDigest`；事务 + `lockPackageScope` 内 `findOne` + `packageIntact` 去重，返回 `importStatus ∈ {imported, existing, repaired}`
- 关键约束（幂等与绑定）：`(tenantId, organizationId, digest)` 索引**非唯一**，DB 不兜底；`version = sha256(JSON.stringify({ ...input, expertVersions, digest }))`；保留模板引用经 `pg_advisory_xact_lock(hashtext(...))` 串行化；`RuntimeResourceService.resolve` 产出 `{selection, skillIds, toolsetIds}`，真正注入点是 Agent 执行链 `dynamicResources?.toolsetIds`
- 主要错误码：统一 `BadRequestException(Error.AgentPluginImportFailed)` · 无 organization 上下文 `Error.AgentResourceOrganizationRequired` · 403 `Error.AgentResourceUnavailable` · 400 `Error.AgentResourceConfigurationRequired`
- 逐端点明细：见 .module-experts/后端专题/工具与 MCP 专家/implementation/05-接口.md 与 sub-experts/Agent插件子专家/implementation/{01,02,03,06}.md