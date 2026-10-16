# MCP协议与发布子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（工具与 MCP 专家）
- **资产路径**：`.module-experts/后端专题/工具与 MCP 专家/sub-experts/MCP协议与发布子专家/`
- **职责**：本子专家负责 MCP 的**三段互不重叠的实现**：① **协议侧**（`mcp/**`）——把 NestJS provider 通过 `@Tool`/`@Resource`/`@Prompt` 装饰器暴露成 MCP Server 的通用壳，`MCPModule.register()` + `MCPService.scanAndRegisterProviders()` + `NestSSEAdapter` 的 `mcp/sse` + `mcp/messages` 双端点，**目录内 0 个 `@Entity`**；② **发布侧**（`mcp-publication/**`）——把工具集能力反向发布为对外 streamable-http MCP Server（`/api/mcp/p/:slug`），含草稿 → 能力快照 → 审核 → 激活 → API Key/OAuth → 调用审计 → 长任务闭环，独占 8 张表；③ **客户端侧**（`provider/mcp/**`）——把远端 MCP Server 接成助手可用工具集（建连分流、工具过滤与包装、stdio 子进程托管、MCP App 桥接、长任务状态回传）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/mcp/**（SDK 封装，0 表）`
  - `server-ai/src/mcp-publication/**（8 表）`
  - `server-ai/src/xpert-toolset/provider/mcp/**（客户端）`
  - `邻域：server-ai/src/mcp-consumer/**、mcp-app-runtime/**（交叉引用）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `mcp` 模块不持久化且全仓无装配点：目录内 0 个 `@Entity`，会话只在 `NestSSEAdapter.activeTransports` 内存 Map；检索 `MCPModule` 只命中 `mcp.module.ts` 自身 ⇒ `mcp/sse`、`mcp/messages` 在当前组装方式下**不会挂载**，会话问题只能看进程内存。
  - 能力绑定的两个唯一键 + `descriptorHash` 语义：唯一 `UQ(publicationId, toolsetId, capabilityType, capabilityKey)`，另有唯一 `(publicationId, publicName)`；`descriptorHash` 是 `char(64)` sha256，配非空 `descriptorSnapshot`。**hash 变化不等于破坏性变更**——只有 `compareMcpCapabilityDescriptors` 判为 breaking 才置 `reviewStatus='required'`，兼容变更就地更新绑定。
  - 台账与发布能力表必须成对演进：`mcp_capability_catalog` 用「事务 delete + save」整体替换（≤1000 条），随后回调 `replaceCapabilitiesWithCatalog`；读取期 `resolveRuntimeCapabilities` 逐条对账，三条触发 `required` 的理由分别是「源工具集不可用」「源能力不可用」「hash 不等且 breaking」。
  - 密钥材料全 `select:false`，审计摘要不写值：`McpApiKey.keyHash`/`encryptedSecret` 与 `McpOAuthPolicy.introspectionClientSecretEncrypted` 默认查询不取列，必须显式 `.addSelect(...)`；`McpInvocationAudit.argumentSummary` 也 `select:false`，内容只有 `{keys: ≤100, bytes}` 或 `{type}`——**从不写参数值**，`errorCode` 只取 `error.code`/`error.name`。
  - `mcp_task` 的幂等与过期语义：唯一 `taskId` 与唯一 `(publicationId, idempotencyKey)`；`idempotencyKey = sha256(publicationId 0 subjectType 0 subjectId 0 requestId 0 typeof rpcRequestId 0 String(rpcRequestId) 0 publicName)`、`inputHash = hashJson(arguments)`；同键同指纹返回原任务、异指纹按 `-32602` 拒；`get()` 对过期非终态**就地判 `failed` + `MCP_TASK_EXPIRED`**；`revision` 是普通 int，**不是乐观锁**。
  - 发布域 FK 语义必须逐表记忆：八表中**仅 `mcp_invocation_audit.publication` 用 `RESTRICT`**（持有审计即不可硬删发布单）；能力/授权/Key/OAuth/任务为 `CASCADE`；`mcp_capability_catalog.toolsetId` 与 `mcp_publication_capability.toolsetId` **刻意不建 FK**，注释逐字「intentionally not a FK so broken bindings stay diagnosable」⇒ 被删工具集的残绑定只能靠读取期对账暴露。
- **测试状态**：只读梳理（commit `80f5676fd`）。本子域相关 spec：`mcp-publication/**` **24 个** + `xpert-toolset/provider/mcp/**` **9 个**；`mcp/**` **0 个**。另有 `mcp-consumer` / `mcp-app-runtime` 的邻域 spec（本批次只列不深挖）。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
