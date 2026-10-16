---
groupPath: 接口信息/知识索引导入
relation: 浏览页正文读接口 doc-get
exportedAt: "2026-10-13T03:27:03.289Z"
---
# GET /api/doc/get —— 浏览页正文读取（read 通道）

- **实现**：`src/lib/mcp-http-api.ts::handleDocGet` + 路由 `p === '/doc/get' && GET`；越权校验列表（query scope）已登记 `'/doc/get'`。
- **参数**：`scope`、`group`、`relation`（group/relation 必填，缺 → 400）。
- **入队**：`submit({operation:'doc-get-api'}, …, [scope], 'read')` —— 只与「元数据提交窗口」短互斥，**导入/向量化期间不被阻塞**（实测 1–2ms；对照：老通道 MCP 曾等 8745ms）。
- **语义**：`executeGetModuleInfoLocal(params, {noVectorFallback:true})` —— 精确读（id 或名称），**不做** group 路径/relation 名的向量模糊兜底（不打开 zvec）；评分回写（recordUse）仍保留并包在 `withMetadataCommitSync` 窗口内（与 MCP 路径同源）。
- **返回**：`ok:true` → `{ok, scope, content, revision, totalLines, hint?}`（200）；未命中/无数据 → `{ok:false, error, hint?}`（404，fail-loud，hint 含可用 relation 列表）。
- **前端**：`web/src/api/httpApi.ts::getDocContent(scope, group, relation)`（404 时把 error+hint 拼成消息抛出）；`BrowsePage.tsx` 的 `fetcher={getDocContent}`（2026-10-13 前为 `kiGetModuleInfo`）。
- **为什么不用 MCP**：MCP 请求按缺省 `write` 入队，与导入长任务互斥 ⇒ 现场"导入期间打不开文档"。MCP 的 `ki_get_module_info` 现已按读工具判 read（P2），但前端仍走本接口：语义更贴合浏览（精确、无兜底）、开销更小（无 MCP 会话/JSON-RPC）。
- **相关同类**：`/api/asset` 同期改 read（附件复制已原子化 tmp+rename）。