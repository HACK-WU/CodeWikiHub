---
groupPath: 接口信息/关系与索引管理
relation: MCP写工具返回文档链接的取址与落点事实
exportedAt: "2026-11-23T03:40:01.552Z"
---
做「MCP 写工具结果附带 Web 文档链接」（REQ-20261123-003 草案）时的取址与落点事实，后续实现/评审直接按此下判断，别重新摸一遍。

## 取址：工具层能拿到请求 Host（已实证）
- SDK 1.29.0 的 Node `StreamableHTTPServerTransport` 委托 webStandard 传输，后者对每个 POST 构造 `requestInfo={headers,url}` 并随 handler `extra` 下发（`server/streamableHttp.js:133-148` → `webStandardStreamableHttp.js:390-393`；类型 `types.d.ts:7953`）。
- 但现有 6 个写工具回调签名都只接 `args`（`src/lib/mcp-tools/sync-relation.ts:21` 等），`extra` 被丢弃 ⇒ 要加链接必须显式接第二个参数。
- 纯 stdio（无 daemon）没有 requestInfo；stdio 探活到 daemon 时整条会话桥接到 `/mcp`，此时有。

## 落点：哪些写操作有浏览页落点
- 有：`ki_sync_relation`/`ki_bulk_sync_relation`/`ki_edit_relation`（relation 文档）；批量 item 已含 group+relation（`src/sync-relation.ts:466-494`），**单条结果没有 group**（`:1626-1651`）需补。
- **没有**：`ki_store`/`ki_bulk_store` 只写向量索引（`src/store.ts:43-49`），不落 KB 文件、不在 `/api/doc/list` ⇒ browse 无落点，不能给链接。
- 删除后不给链接（必然 404）；根目录文档 group 为保留键 `__root__`，浏览页同样认它。

## URL 契约与生效条件
- `/browse?scope=&group=&relation=`：scope 必需、group+relation 必须成对、relation 是**名称**（`web/src/pages/BrowsePage.tsx:305-342`）；写出方向 `web/src/lib/browseUrl.ts:19-33`。
- 前端页面只在 `--web` 且 `web/dist/index.html` 存在时提供（`src/lib/mcp-http.ts:637,1353-1362`），`webDir` 是 `startHttpServer` 局部变量 ⇒ 工具层读不到，需暴露进程级只读上下文。
- 端口不能写死：默认 7423，实际常被 CLI/lock/配置改成 7433 等（`mcp-http.ts:74`、`mcp-server.ts:951-965`）。
- 鉴权开启时链接先跳 `/login`，登录后按 `state.from` 回跳原地址（`web/src/router/routes.tsx:21-36`）⇒ 链接可穿透登录，但无权限账号会报无权而非「文档不存在」。