---
groupPath: 项目踩坑点
relation: 隔离探针勿import mcp-server.ts（会自启服务并被process.exit打断）
exportedAt: "2026-10-16T03:18:25.638Z"
---
【踩坑｜写隔离验证脚本时不要 import `src/mcp-server.ts`】2026-10-16 实测（REQ-20261016-002 的隔离探针调试中踩到）。

## 现象
隔离探针（临时 config + 端口 0 起 `createMcpHttpServer`）会**随机在中途**被下面这句打断并整体退出，表现为"时好时坏"：
```
MCP Server 启动失败：
  daemon 子进程在预检阶段退出（exit 1）；请前台执行 ki mcp --http --daemon 查看具体错误
```
典型现场：探针刚打印完第 ② 段的第一个测量值就死，看不到后续断言。

## 根因
`src/mcp-server.ts` 是 **CLI 入口模块**：文件底部有顶层 `startMcpServer().catch(...)`（`mcp-server.ts:851`），失败分支打印上述消息并 `process.exit(1)`。任何脚本 `await import('../src/mcp-server.js')`（通常只为拿 `buildKiMcpServer`）都会**在该进程内真启一次 MCP 服务**；隔离配置里 embedding 端点一般不可路由 ⇒ 预检失败 ⇒ 进程被杀。

## 规避
- **只打 `/api/*` 的探针**：不要 import mcp-server.ts，给 `createMcpHttpServer` 传 stub builder 即可
  （`buildServer: () => ({ connect: async () => {}, close: async () => {} }) as never`）—— `/api/*` 路由不经过它。
- **必须走 `/mcp` 的探针**：用 **CLI 子进程**起 daemon（可指向本地 stub embedding 端点让预检通过），不在同进程 import。
- **为什么"有时能跑完"**：那是与探针自身时长**竞速** —— 1–2s 内就 `process.exit(0)` 的短脚本常赢；含 `sleep(4000)` 的探针必输（本次即此形态）。不要靠运气。

## 同类混点（同一批踩到）
`/api/doc/list`、`/api/tags` 等路由内部走 `callDaemon`：在**非 daemon 实例**里同样会尝试拉起 daemon（`src/lib/daemon-client.ts` spawn + 预检），隔离探针里调用它们会触发同一类副作用（表现为 3ms 内先返回，随后被后台启动的预检失败打断）。同一入口还有：`/api/tags` 的 `submit({operation:'tags-api'})` 不传 kind ⇒ 缺省 write 车道（与 "导入期间排队" 相关）。