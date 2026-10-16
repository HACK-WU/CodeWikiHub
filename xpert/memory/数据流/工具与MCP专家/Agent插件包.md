---
groupPath: 数据流/工具与MCP专家
relation: Agent插件包
exportedAt: "2026-10-16T07:28:46.847Z"
---
【数据流｜Agent插件包】
- 实体类型：表（2 张：`agent_plugin_package` 包清单 + `agent_resource_binding` 可执行绑定）＋ 跨域投影落点（`xpert_toolset`/`xpert_tool`、`skill_package.runtimeResourceOnly`、`plugin_resource_installation`）
- 结构 `agent_plugin_package`（迁移 `20260921` 建表）：`rootPath`(非空)、**`digest`(非空)**、`descriptor`(jsonb 非空，类型 `PortablePlugin`)、`source`(jsonb：`{kind:'git'|'zip', url?, ref?, commit?, subdirectory?}`)；**`@Index(['tenantId','organizationId','digest'])` 非唯一**（迁移同名索引亦非 UNIQUE）；迁移另加 `tenantId NOT NULL REFERENCES tenant(id) ON DELETE CASCADE`
- 结构 `agent_resource_binding`：`title`/`description`/`version`(非空)、`workspaceIds`(jsonb)、`definition`(jsonb 非空，`kind ∈ agent_plugin|middleware|external_xpert`)、`installations`(jsonb 默认 `{}`，形如 `{[workspaceId]:{skills,toolsets,connectors?}}`)、`expertVersions`(jsonb 默认 `{}`)、`enabled`、**`cleanupEligible`(默认 false，迁移 `20261015` 新增)**、**`supersededById`(uuid)**；`@Index(['tenantId','organizationId','enabled'])`
- 生产方：`AgentPluginService.importGit/importZip/importStagedDirectory`（事务 + `lockPackageScope` 内 `findOne({...scope,digest})` 去重，命中且 `packageIntact` 复用原 `rootPath` 只更新 `descriptor`）、`createAuthorizedBinding`（`version = sha256(JSON.stringify({...input, expertVersions, digest}))`）、维护面 `packages/:id/update`
- 生产方（跨域投影）：`PluginResourceInstallerService`（`ensureNativeToolset` 走 `createBuiltinToolset`、`ensureMcpToolset` 直写、`replaceToolsetCapabilities` 刷新 `mcp_capability_catalog`、`skillPackageService.syncPluginSkillBundle` 写 `skill_package.runtimeResourceOnly`）
- 主要消费方：`AgentPluginInstallationsService.installedCatalog/saveTemplateCatalog/reference/prepare/retainTemplateReference`、`RuntimeResourceService.catalog/resolve/authorize/read/update`、Agent 执行链 `subgraph.handler` 的 `options.runtimeResources`（真正注入点 `dynamicResources?.toolsetIds`）、更新与清理服务
- 用途：把便携包投影为工作区 / 专家可用的 skills / toolsets / connectors；**行身份 = (scope, digest)**，digest 即版本而非主键
- 边界：同 digest 幂等靠应用层（DB 不兜底）——并发导入理论上可产生重复包 `[推测]`；修复 / 重导入不得重写包身份、创建时间或绑定（注释逐字 `Never rewrite package identity, creation time or bindings during repair/reimport.`）；`cleanupEligible` 注释逐字「Only automatic catalog defaults may be collected; selecting a template reserves the reference.」
- 关键文件：file://packages/server-ai/src/agent-plugin/{agent-plugin.service.ts,agent-plugin-parser.ts,agent-plugin.entity.ts}、file://packages/server-ai/src/plugin-resource/plugin-resource-installer.service.ts
- 详细流向：见 .module-experts/后端专题/工具与 MCP 专家/implementation/{03-数据流转.md,04-模型.md} 与 sub-experts/Agent插件子专家/{C0,C1}.md；决策见 C5-关键决策.md §D9