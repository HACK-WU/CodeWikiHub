# 可视化前端专家（ki-web）

> **历史快照提示（2026-11-25 合并补全）**：本篇主体保留 2026-08 基线时的描述；文中出现的 `manage-index` / `query-group` 命令、`13 工具` / `14 文件` / `22 个文件` / 「web 内无单测」等均为**当时状态**，现已变更。当前口径以文末的「合并补全」增量章节与 `INDEX.md` 为准。


## 一句话职责
负责 ki 的 Web 可视化界面（`web/`）：知识库浏览、语义搜索、文档上传导入、知识写入与服务健康总览，通过同源 MCP 协议与 `/api/*` 扩展接口与 `ki mcp --http` 后端通信。

## 负责的模块
- 模块根：`web/`（独立 Vite 工程 `ki-web`），`web/src/` 共 **185 个 .ts/.tsx**、`web/src/pages/` **18 个页面**
- 技术栈：React 18 + TypeScript + Vite 5 + react-router-dom v7 + @tanstack/react-query v5 + marked + mermaid + MCP SDK（浏览器端 StreamableHTTPClientTransport）
- 构建产物 `web/dist/` 由后端 `ki mcp --http --web` 静态托管（SPA fallback）

## 何时找这个专家
- 需要新增/修改前端页面、组件、交互（浏览/搜索/导入/写入）
- 前端调后端接口报错，需要定位是前端封装问题还是后端契约问题（`web/src/api/` 双通道封装）
- 修改后端 MCP 工具或 `/api/*` 端点后需要同步前端类型与调用
- 前端构建/部署/代理配置问题（Vite dev 代理 7423、`--web` 静态托管）
- scope 切换、tag 过滤、Group 树等业务交互的行为疑问

## 契约层就绪
`C0 + C1 + C2 + C4` 就绪

## 包含的资产
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C2-使用流程.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`03-数据流转.md`、`05-接口.md`、`06-测试.md`、`07-运维.md`
- `test/known-failures.md`（web/test 下 111 个 node --test 用例，已登记既有红）

## 测试状态（切面级）
✅ `web/test/*.test.mjs` **111 个**，`cd web && npm test`；另 `npm run typecheck` / `npm run build`。11 红为既有基线，详见 `test/known-failures.md` 与 `implementation/06-测试.md`。

## 出处
- 生成日期：2026-08-28 · 合并补全：2026-11-25 · git commit：`0f1426b`（资产基线；工作区另含 20 个未提交改动）

---

> **合并补全（2026-11-25，基线 0f1426b）**
> - **规模**：`web/src/` 185 个 .ts/.tsx（旧记 22）、`web/src/pages/` 18 页（旧记 5）；新增 `router/`、`styles/`（7 个 CSS）、`components/governance/`、`chat/`，**没有 `utils/`**。
> - **18 个页面**：AiSettings / Atlas / Browse / Chat / Dashboard / DataSource / Events / Import / Lifecycle / Login / Profile / Resources / Search / Tasks / Trash / Users / Views / Write。
> - **侧栏三段分组**（2026-11-16 重划）：工作台（`/`、`/browse`、`/atlas`、`/search`、`/chat`、`/import` 含 also `/write`）、接入与运维（`/datasource`、`/tasks`、`/views`、`/resources`）、知识治理（`/governance/lifecycle|events|trash`，带计数徽标）。见 `web/src/layouts/AppShell.tsx` 的 NAV_WORKSPACE / NAV_OPS。
> - **路由表位置修正**：`web/src/router/routes.tsx`（旧记 `web/src/routes.tsx`），含 RequireAuth / RequireCapability / RequireUsersManage / NotFoundPage；`/import` 与 `/write` 页面本体在 AppShell 常驻渲染，路由只挂能力守卫。
> - **上传导入与知识写入已合并**为 `/import` 单一入口（旧记两个入口）。
> - **双通道**：`web/src/api/mcpClient.ts`（`StreamableHTTPClientTransport` 指向 `/mcp`、callTool、401 → notifyUnauthorized）、`web/src/api/httpApi.ts`（同源 `/api/*`、统一 req<T>、返回 `{ok,error,code}`）；契约文件 `chatContract.ts` / `governanceContract.ts`。
> - **测试现状（旧文档说「无单测」，已推翻）**：`web/test/*.test.mjs` 111 个；`cd web && npm test` / `npm run typecheck` / `npm run build`。全量 1548/1537 中 11 红为既有基线，另有 chat e2e-sr02 1 红、批量 3 例并发污染（单跑全绿）。

