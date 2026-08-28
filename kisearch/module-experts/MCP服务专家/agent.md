# MCP 服务专家

**一句话职责**：kisearch 对外 MCP 服务——基于 `@modelcontextprotocol/sdk` 提供 stdio / HTTP 共享单例（含 `--daemon` 守护进程）传输模式，暴露 13 个 MCP 工具，含多实例锁管理、多 Token + scope 授权（RBAC）、启动预检与 `/healthz` 健康探活。

**负责的模块**：`src/mcp-server.ts` + `src/lib/mcp-tools/*`（12 文件）+ `src/lib/{mcp-http,mcp-http-api,mcp-stdio-lock,mcp-stop,mcp-token,net-addr,version-guard}.ts`

> `src/lib/health-check.ts` 的**实现归「存储与配置基础专家」**，本专家只做消费方（`ki mcp` 启动预检 + `/healthz` 暴露）。

**何时找这个专家**：
- 需要理解 `ki mcp` 的 stdio / HTTP / daemon 三种模式差异与接入配置
- 需要排查 MCP 工具（ki_search / ki_store / ki_bulk_sync_relation 等）的入参契约与超时行为
- 需要处理多 IDE / 多实例争抢向量库锁的问题（HTTP 共享单例 + 空闲释放锁错开）
- 需要配置多 Token 与 scope 授权（`generate` / `list` / `update` / `delete`），或排查 401 / 403 / `MCP_TOKEN_CORRUPT`
- 需要排查 MCP 启动预检、进程锁清理与探测语义（`ki mcp stop` / `restart` / `--status`）
- 新增不带 `scope` 参数的工具时，须同步登记 `SCOPE_LESS_TOOLS` 白名单

**契约层就绪**：`C0 + C1 + C2 + C4` 就绪

**包含的资产**：
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C2-使用流程.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`03-数据流转.md`、`05-接口.md`、`06-测试.md`、`07-运维.md`

**测试状态**：测试目录 `test/`（`mcp-http.test.ts`、`mcp-http-api.test.ts`、`mcp-daemon.test.ts`、`mcp-stdio-lock.test.ts`、`mcp-stop.test.ts`、`mcp-token.test.ts`），✅ 可跑（`npx jiti test/<name>.test.ts`）；⚠️ e2e 依赖网络、`mcp-stop` 依赖 `/proc`、daemon 依赖进程 spawn；⚠️ 本机跑测试建议 `env -u NODE_OPTIONS -u BASH_ENV`。详见 `implementation/06-测试.md` 与 `test/known-failures.md`。

**出处行**：生成日期 2026-08-06；合并补全 2026-08-28，git commit：`9841255`（资产基线）

**基线后主要变更**（本次合并补全覆盖）：多 Token + scope 授权 RBAC 取代单托管 Token（含 HTTP 层越权拦截与 `SCOPE_LESS_TOOLS` 白名单）；stdio 锁改为每实例独立文件且不再互斥；新增 `ki_bulk_sync_relation`、`--daemon` 守护进程与 `restart`、`--web/--no-web` 静态托管、`/api/*` 接口与 `net-addr.ts`；健康检查新增「配置字段」项并划归存储专家。
