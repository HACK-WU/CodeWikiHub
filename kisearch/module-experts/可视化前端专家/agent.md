# 可视化前端专家（ki-web）

## 一句话职责
负责 ki 的 Web 可视化界面（`web/`）：知识库浏览、语义搜索、文档上传导入、知识写入与服务健康总览，通过同源 MCP 协议与 `/api/*` 扩展接口与 `ki mcp --http` 后端通信。

## 负责的模块
- 模块根：`web/`（独立 Vite 工程 `ki-web`），源码 `web/src/` 共 22 个文件（约 4000 行 TS/TSX/CSS）
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
- 不含 `test/known-failures.md`（web 目录内无单元测试，见 06-测试）

## 测试状态（切面级）
⚠️ web/ 目录内**无单元测试**；验证手段为 `npm run typecheck`（tsc --noEmit）+ 手动浏览器验证 + 后端 `test/mcp-http-api.test.ts` 对 `/api/*` 契约的间接覆盖。详见 `implementation/06-测试.md`。

## 出处
- 生成日期：2026-08-28 · git commit：8adc487
