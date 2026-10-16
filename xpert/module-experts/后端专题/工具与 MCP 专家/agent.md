# 工具与 MCP 专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/工具与 MCP 专家/`
- **职责**：本专家负责 **Agent 的能力供给面**：一条从「工具集 → 工具执行 → 能力对外发布 / 插件装配」的单向管道。 **上游（声明与配置）**：`XpertToolset`/`XpertTool` 两表承载工具集实例与单条工具，四个 provider 实现（`provider/builtin`、`OpenAPIToolset`、`ODataToolset`、`MCPToolset`）负责工具发现与 schema 生成；`xpert-toolset`/`xpert-tool` 两个模块提供 HTTP 与 CQRS 面。 **中游（执行）**：`ToolRuntimeService` 是**唯一执行出口**（`loadToolsets`/`executeTool`/`describeCapabilities` 与 MCP 能力四件套），助手、Agent 运行时、API 预览、MCP 发布与长任务全部经它。 **下游（对外与装配）**：`mcp-publication` 把工具集能力反向投影为对外 MCP Server（`/api/mcp/p/:slug` + API Key/OAuth + 调用审计 + 长任务）；`agent-plugin` 把便携包（`PortablePlugin`）投影为工具集/技能/连接器；`mcp` 模块是通用 MCP 服务端 SDK 封装。 **一句话口径**：执行只经 `ToolRuntimeService`，环境、存储策略与发布配置一律由宿主提供，**绝不来自工具参数**（源码注释逐字：`Validated Publication configuration supplied by the host, never tool arguments.`）。
- **子专家**：子专家①[工具集与工具子专家](file://.module-experts/后端专题/工具与 MCP 专家/sub-experts/工具集与工具子专家/C0-使用总览.md) · 子专家②[MCP协议与发布子专家](file://.module-experts/后端专题/工具与 MCP 专家/sub-experts/MCP协议与发布子专家/C0-使用总览.md) · 子专家③[Agent插件子专家](file://.module-experts/后端专题/工具与 MCP 专家/sub-experts/Agent插件子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/xpert-toolset（104 非 spec / 17 spec）`
  - `server-ai/src/xpert-tool（13 / 2）`
  - `server-ai/src/mcp（14 / 0，无表）`
  - `server-ai/src/mcp-publication（43 / 24）`
  - `server-ai/src/agent-plugin（50 / 30）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `ToolsetGuard` 是 5 分钟用户级缓存：`cacheKey = userToolset_${tenantId}_${user.id}_${toolsetId}`，命中即直接返回；**只缓存允许结果**（拒绝路径每次穿透），且全仓**没有任何主动清除调用点**——撤权后有最长 5 分钟窗口。
  - `select:false` + `@Exclude` 常被误判为「数据缺失」：`McpApiKey.keyHash`/`encryptedSecret` 默认查询根本不取列，读取密文必须显式 `.addSelect(...)`；序列化层再去掉一次。发现字段为空先确认是脱敏而非缺数据。
  - `McpRuntimeController` 的 `SUPER_ADMIN` 是手写断言不是守卫：三个端点各自先 `assertSuperAdmin()`（`RequestContext.hasRole`），失败文案固定；因此不存在可复用的 `@Roles` 元数据，别按 `RoleGuard` 方式排查。
  - 能力幂等键 + `descriptorHash`：`mcp_publication_capability` 唯一 `(publicationId, toolsetId, capabilityType, capabilityKey)` 与唯一 `(publicationId, publicName)`；descriptor 改了哈希即变，但**只有 breaking 变更才置 `reviewStatus='required'`**（`compareMcpCapabilityDescriptors` 分类），别把一切哈希变化当破坏性变更。
  - `mcp_task` 双唯一键 + `inputHash`：唯一 `taskId` 与唯一 `(publicationId, idempotencyKey)`；同键同指纹幂等返回原任务，同键异指纹按协议错误拒绝（`assertIdempotentReplay`）；`revision` 只是普通 int 列，**不是乐观锁**。
  - Agent 插件同 digest 重装幂等靠应用层，DB 不兜底：`(tenantId, organizationId, digest)` 上的索引**不是 UNIQUE**，去重由 `findOne + packageIntact` 在事务 + `lockPackageScope` 内完成；并发导入理论上有重复包窗口 `[推测]`。
- **测试状态**：spec 分布（73）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
