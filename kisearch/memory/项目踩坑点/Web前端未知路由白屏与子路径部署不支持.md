---
groupPath: 项目踩坑点
relation: Web前端未知路由白屏与子路径部署不支持
exportedAt: "2026-11-23T07:57:27.189Z"
---
Web 前端只按「站点根路径」假设搭建：未匹配路由此前渲染 null（整页空白且控制台无错），2026-11-23 已加兜底页；真正的「子路径部署」仍不支持（Router 无 basename）。
- 兜底（已修复，事件 #70）: `web/src/router/routes.tsx` 的 `<Routes>` 末尾加**顶层** `<Route path="*" element={<NotFoundPage />} />`，渲染 404 + 「页面不存在」+ **实际访问路径（含 query）** + 「回到总览」；样式 `.ki-notfound*` 在 `web/src/styles/ki.css` 空状态段之后。它渲染在 AppShell 之外，不依赖登录态与侧栏。
- 为何必须在顶层: 嵌套在 `<Route path="/" element={<AppShell/>}>` 内的 `*` 只覆盖 AppShell 内部的未匹配路径，接不住 `/browseX` 这类根级 splat。
- 主题写入有两个入口（本次补齐）: `web/src/main.tsx` 首渲染前调 `applyStoredTheme()`（`web/src/lib/theme.ts`）+ AppShell 的 `useTheme()` 切换器。此前只有 AppShell 写 `<body data-theme>`，而**登录页与兜底页渲染在 AppShell 之外** → 暗色用户看到亮色页面（实测 body 无属性、背景 #f5f6f3）。新增不经过 AppShell 的独立页面时，必须确认入口初始化还在，否则主题静默失效。
- 子路径部署仍不支持: `BrowserRouter` 没有 basename、web 端从未使用 `import.meta.env.BASE_URL`、vite base 默认 `/`、服务端 `serveStatic` 也不剥前缀。挂在 `/ki/` 下时 pathname 是 `/ki/browse`，路由全部不匹配（资源侧另取决于反代是否剥前缀）。要支持必须给 `BrowserRouter` 传 basename，仅加兜底页解决不了。
- 排查口径: 看到「页面不存在」页且路径带意外前缀 → 部署前缀/反代配置问题；仍白屏且控制台有资源 404 → 反代没剥前缀导致 `/assets/*` 取不到。
- 回归: `web/test/router-fallback.test.mjs`（兜底在顶层 + 渲染实际路径 + 样式存在）、`web/test/theme-init.test.mjs`（键名 `ki-theme` / dark / light / 缺失 / 非法值 / 无 document）。
- 关联: 事件 #70（已关闭）