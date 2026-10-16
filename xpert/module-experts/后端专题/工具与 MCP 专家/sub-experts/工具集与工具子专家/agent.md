# 工具集与工具子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（工具与 MCP 专家）
- **资产路径**：`.module-experts/后端专题/工具与 MCP 专家/sub-experts/工具集与工具子专家/`
- **职责**：本子专家负责 **「工具集是什么、有哪些工具、怎么被装配与执行」**：`XpertToolset` 实例的全生命周期（`create`/`save`/`updateToolset`/`getAllByWorkspace`/`createBuiltinToolset`/`afterLoad`/`hydrateBuiltinToolSchemas`/`findPublicAvatar`）、工具实例面（`XpertToolService.getTool`/`testTool`/`getParamsFaker` ＋ `XpertToolSubscriber` 的名称强制）、**非 MCP 的 provider 体系**（`BUILTIN_TOOLSET_REPOSITORY` 静态注册表 + `OpenAPIToolset`/`ODataToolset` 与 `ApiBasedToolSchemaParser`）、**统一工具执行面** `ToolRuntimeService`、MCP App 的 HTTP 面（`McpAppsController`/`McpAppsService`）、MCP stdio 运行时的审计与停机阀（`McpRuntimeAuditService`/`McpRuntimeInstanceEntity`/`McpRuntimeController`），以及读路径准入与脱敏（`ToolsetGuard`/`WorkspaceAuthoringGuard`/`ToolsetPublicDTO`）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-toolset 工具集主体（module/entity/service/controller/subscriber · mcp-apps.* · mcp-runtime.* · guards/ · provider/{builtin,openapi,odata}）`
  - `server-ai/src/xpert-tool/**`
  - `server-ai/src/tool-runtime/**（执行面）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `ToolsetGuard` 是 5 分钟用户级缓存且无失效通道：`cacheKey = userToolset_${tenantId}_${user.id}_${toolsetId}`，命中即返回；**只缓存允许结果**（拒绝路径每次穿透），全仓未见主动清除调用点 ⇒ 被移出工作区/被转交的工具集在窗口内仍可读凭据。
  - `credentials` 是「三层脱敏 + 明文落库」：实体列 `@Exclude({toPlainOnly:true})`、`ToolsetPublicDTO.credentials` 再次 `@Exclude`、唯一读出口 `GET :id/credentials` 叠 `ToolsetGuard`；但 `createBuiltinToolset` 内加密两行仍是注释 ⇒ 该边界保护**回显**而非**存储**。
  - 工具集↔工具的级联集合是显式列举的：`XpertToolset.tools` 的 `cascade` 为 `insert/update/remove/soft-remove/recover` 五项，配合 `XpertTool.toolset` 的 `onDelete:'CASCADE'`；但 `xpert_tool` **无 `deletedAt`**（继承 `TenantOrganizationBaseEntity`），软删语义只落在工具集侧。
  - `tag_xpert_toolset` M2M 是写入口而非只读投影：`@ManyToMany(() => Tag, { cascade: true, eager: true })` + `@JoinTable({ name: 'tag_xpert_toolset' })`，保存工具集会级联写标签；`create` 与 `save` **两个入口**都先 `assertValidTagAssociations(..., TagCategoryEnum.TOOLSET)`。
  - `mcp_runtime_instance` 是「只增不改语义」的审计表：5 个复合索引；`policySnapshot` 只写白名单五字段；`commandLabel` 逐参数过 `sanitizeCommandArg`（`token|secret|password|passwd|key=` → `[redacted]`、相对路径取 basename）、`commandHash = sha256(command+args)`；`runnerPid`/`childPid`/`stderrTail`（16KB 截断）都是**审计列**，进程本体在 ② 的 runner 里；保留期常量只作用于**查询窗口**，无清理作业。
  - 停机阀的 `SUPER_ADMIN` 是手写断言不是守卫：三个端点各自先 `assertSuperAdmin()`（`RequestContext.hasRole`），失败文案固定 `Only SUPER_ADMIN users can manage MCP stdio runtimes`；因此**不存在**可复用的 `@Roles` 元数据，别按 `RoleGuard` 方式排查。
- **测试状态**：1. spec 清单与本子域口径（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
