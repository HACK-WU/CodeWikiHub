# Agent插件子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（工具与 MCP 专家）
- **资产路径**：`.module-experts/后端专题/工具与 MCP 专家/sub-experts/Agent插件子专家/`
- **职责**：本子专家负责 **「便携插件包（`PortablePlugin`）怎么进库、怎么被解析、怎么变成可用的资源」**：来源获取（Git / ZIP / 官方源）、内容寻址 digest、解析与能力枚举、幂等入库（`agent_plugin_package`）、按 scope 的可见性与配置（`agent_resource_binding`）、运行时资源目录与解析（`RuntimeResourceService.catalog/resolve/authorize/read/update/prepare`）、插件 Skill 指令与命令元数据、连接器需求登记与运行凭据解析、以及 Git 分支更新与保守清理。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/agent-plugin/**（2 表）`
  - `平台侧对照：server-ai/src/plugin-resource/**、skill-package/**、xpert-template/**（交叉引用）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 「同 scope 同 digest 唯一」是应用层约定，DB 不设唯一约束：实体是 `@Index(['tenantId','organizationId','digest'])`（**无 `unique`**），迁移是 `CREATE INDEX IF NOT EXISTS "IDX_agent_plugin_package_scope" ON agent_plugin_package ("tenantId","organizationId",digest)`（**非 UNIQUE**）。幂等由事务 + `lockPackageScope` 内的 `findOne({...scope, digest}) + packageIntact` 保证，因此实现层「唯一即幂等」的表述应读作**语义层约定**，与父级 [C0 已知坑 6](file://.module-experts/后端专题/工具
  - `PortablePlugin` 的契约边界是「包内解析 + 路径遏制 + 失败隔离」：`parseAgentPlugin` 首两行注释划定边界（`Portable discovery is intentionally separate from the native Xpert module loader.`）；`templateCatalog` 标注 `Server-generated import snapshot. Never accepted from plugin.json.`；所有文件读取先过 `containedPath`（realpath + `relative` 白名单），JSON ≤4MB、`SKILL.md` ≤1MB；manifest 非法**整体抛错**，组件级非法只进 `diagnostics`（`invalid_skill`/`invalid_server`
  - `source {kind:'git'|'zip'}` 两条来源的硬校验不可放宽：Git 必须 `https:` 且无 username/password/hash，ref 不得以 `-` 开头或含 CR/LF/NUL，执行带 `protocol.file.allow=never`、`core.hooksPath=/dev/null`、`GIT_CONFIG_GLOBAL=/dev/null`、`--depth=1`，超时 120s；ZIP 限 100MB / 10000 条目，拒绝符号链接、重复项、反斜杠、绝对路径与越界项，并逐项校验解压后大小；**ZIP 来源无法自动更新**（`AgentPluginUpdateService.target` 强制 git）。
  - 装配分工固定为「声明在包里、落库在安装器」：本子域只产 `RuntimeComponent`（`componentType ∈ {skill, mcp_server}`、`pluginName = agent-plugin-<pkgId>-<digest 前 12>`、`pluginVersion = digest`、`rootDir = pkg.rootPath`）；`findPluginManagedToolset` 用 `options ->> 'runtimeSource' = 'agent-plugin'`（Agent 插件）与 `options ->> 'pluginManaged' = 'true'`（平台插件）分流 ⇒ **任何绕过安装器直写 `xpert_toolset` 的代码都会落进「无来源」灰区**。
  - 注入点只有三处，且插件 MCP 走全等校验：`subgraph.handler.ts` 用 `dynamicResources?.toolsetIds` 逐个追加（失败仅告警）；`queries/handlers/{get-variables,complete-tool-calls}.handler.ts` 同构；`collaborators.middleware.ts` 消费 `runtimeResources.experts`。MCP 工具集在 `resolve` 时用 `matchesPortableMcpSchema` 做 `isEqual` **全等**比对（`category==='MCP'` + `needSandbox===false` + `pluginManaged===false`），任一不符抛 403 `Error.AgentResourceUnavailable`
  - 无 `@VersionColumn`，并发语义全靠 PG advisory lock + jsonb 写入纪律：包 scope 锁 `agent-plugin-packages:<tenantId>:<organizationId|_tenant>`（`lockPackageScope`）、binding 锁 `agent-plugin:<bindingId>`、工作区添加锁 `(<tenant>:<org>, <workspaceId>:<pluginName>)`；`agent_resource_binding.installations` 是 jsonb，绕过 `prepare`/`registerTemplateMcp`/`createAuthorizedBinding` 直 `save(binding)` 会丢并发投影（无 DB 约束兜底）；两表均无 `@DeleteDateCo
- **测试状态**：`agent-plugin/**` 共 **30 个 `*.spec.ts`**（本子域全部为 `.spec.ts`，未发现 `.test.ts`），按主题分 8 组：（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
