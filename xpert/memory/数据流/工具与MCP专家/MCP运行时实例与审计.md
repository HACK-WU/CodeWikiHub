---
groupPath: 数据流/工具与MCP专家
relation: MCP运行时实例与审计
exportedAt: "2026-10-16T07:28:46.846Z"
---
【数据流｜MCP运行时实例与审计】
- 实体类型：表（`mcp_runtime_instance`，stdio 运行时生命周期审计；只增改、从不 delete）
- 结构：`serverName`(必填)、`status ∈ starting|running|closing|closed|failed`、`origin ∈ agent-toolset|mcp-app-host`、`startedAt`/`readyAt`/`idleExpiresAt`/`maxLifetimeExpiresAt`/`closedAt`/`closeReason`、`startupDurationMs`/`durationMs`
- 结构（指纹与脱敏）：`runnerPid`（宿主 spawn 的 pid）、`childPid`（runner stderr 的 `CHILD_PID_MARKER` 解析）、`stderrTail`(16KB 截断)、`commandLabel`（args 命中 `/(token|secret|password|passwd|key)=/i` 替换 `[redacted]`、绝对路径只留 basename、超 120 字符截断）、`commandHash = sha256({command,args})`、`policySnapshot`(jsonb：provider/startupTimeoutMs/idleTimeoutMs/maxLifetimeMs/allowedCommands)
- 索引与裸列：**无唯一业务键**，5 个复合索引；裸列 `workspaceId`/`toolsetId`/`xpertId`/`executionId`/`appInstanceId`
- 生产方：`McpRuntimeAuditService.recordStarting`（首插并按 `findResourceInstallation` 回填 `resourceInstallationId`）/`recordRunning`/`recordClosed`（按 id update）/`recordAppInstance`（条件 UPDATE `appInstanceId IS NULL`）
- 生产方（进程侧）：`mcpStdioRuntimeManager.prepareServer` 两级 spawn——宿主 spawn runner（`mcp-stdio-runner.js`，spec 经 `XPERT_MCP_STDIO_RUNNER_SPEC` 传 base64 JSON），runner 再 spawn 真实 server（`detached:true`、`shell:false`）
- 主要消费方：GET `/operations/mcp-runtimes`（库内历史 + 内存活体合并列表）、POST `/:runtimeId/stop`（`admin-stop`）、POST `/kill`（`admin-kill`）；业务侧不读
- 用途与门禁：可审计地定位 PID 与整组回收（`transport.close()` 失败才 SIGTERM runner + `killProcessGroup(childPid)`；runner 侧 `process.kill(-child.pid, SIGTERM)`，3 秒后补 SIGKILL）；`XPERT_MCP_STDIO_RUNTIME_ENABLED` 默认关闭（fail closed）、生产必须命中 `allowedCommands` 白名单、单租户并发默认 10
- 收尾语义：`onApplicationBootstrap` 把残留 `starting|running|closing` 批量置 `closed` + `closeReason='host-restart-or-lost'`（**预期行为，不是故障**）
- 边界：无清理作业；默认查询窗口 180 天（`DEFAULT_RUNTIME_AUDIT_RETENTION_DAYS`），过期行只是不被列出；`initScripts` 默认 `!environment.production`
- 详细流向：见 .module-experts/后端专题/工具与 MCP 专家/implementation/{03-数据流转.md,04-模型.md,07-运维.md}