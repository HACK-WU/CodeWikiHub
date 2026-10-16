---
groupPath: 决策记录/工具与MCP专家
relation: 架构设计-MCP客户端走stdio与模块只做SDK封装
exportedAt: "2026-10-16T07:28:46.847Z"
---
【决策记录｜架构设计：MCP 客户端走 stdio 两级子进程，mcp 模块只做 SDK 封装】
- 分类：架构设计
- 动机（避坑）：① **现象** 用户配置的 `command` 直接在 API 进程内 spawn 且只留内存态句柄；**后果** 任意命令执行没有准入与上限，进程泄漏成黑盒，运维既不能定位 PID 也不能回收整个进程组。② **现象** 把「通用 MCP Server 封装」与「对外发布运行时」合成一个模块，会话状态（内存 transport Map）被当成可持久状态；**后果** 权限口径与生命周期混在一起，服务端封装无法被插件 / 宿主独立复用
- 决策：① 客户端 stdio 走**两级子进程 + 策略钳制 + 持久审计 + 停机阀**（`XPERT_MCP_STDIO_RUNTIME_ENABLED` 默认关闭 fail closed；生产必须命中 `allowedCommands` 白名单；生命周期经 `setAuditSink` 写 `mcp_runtime_instance`）。② `mcp/**` 只做通用 MCP Server SDK 封装——`MCPModule.register/registerAsync` 返回 `global: true`、`MCPService.onModuleInit` 扫描 `@Tool/@Resource/@Prompt` 注册进 `McpServer`、仅 `mcp/sse` 与 `mcp/messages` 两端点、**0 实体 0 表**（会话只在 `NestSSEAdapter.activeTransports` 内存 Map）；对外发布完全独立在 `mcp-publication/**`（8 表 + 管理面 SUPER_ADMIN + `@All('mcp/p/:slug')` 运行面）
- 背景约束：`MCPModule` 虽声明 `global: true`，但**全仓检索只命中自身** ⇒ 当前无装配点（`mcp/sse`、`mcp/messages` 未挂载）`[推测]` 为插件 / 宿主二次集成预留；协议版本常量不在 `mcp` 模块，而由发布域契约 `MCP_PROTOCOL_VERSION='2026-07-28'` 持有
- 被否决方案：无（未见对替代实现的显式否决记录）。`[推测]` 双层 runner 的动因是让真实 MCP server 落在独立进程组，从而用 `process.kill(-child.pid, SIGTERM)`（3 秒后补 SIGKILL）整组回收
- 重新评估触发条件：需要支持远程 / 共享 MCP 运行时（而非本机子进程）、或放宽任一 `*_TIMEOUT_MS` 与命令白名单时——须同时复核审计字段与 kill 语义；若宿主改为 `MCPModule.register(...)` 装配，须同步确认全局 `api` 前缀、`.well-known` exclude 与类级 `@Public()` 会话鉴权口径
- 失败面：总开关关闭即抛 disabled；越白名单命令拒绝；宿主重启残留行由 `onApplicationBootstrap` 统一收尾（`host-restart-or-lost`）
- 关联代码：file://packages/server-ai/src/xpert-toolset/provider/mcp/mcp-stdio-runtime.ts、file://packages/server-ai/src/xpert-toolset/mcp-runtime-audit.service.ts、file://packages/server-ai/src/mcp/mcp.module.ts、file://packages/server-ai/src/mcp/mcp.service.ts
- 证据来源：C5-关键决策.md §D4 ＋ §D5；implementation/07-运维.md「子进程 / stdio 运行时运维」「环境变量与门禁」；implementation/05-接口.md「七、mcp」两条结论