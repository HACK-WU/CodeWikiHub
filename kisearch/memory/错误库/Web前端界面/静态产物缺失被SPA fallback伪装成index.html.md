---
groupPath: 错误库/Web前端界面
relation: 静态产物缺失被SPA fallback伪装成index.html
exportedAt: "2026-11-15T06:36:43.580Z"
---
# 「图表渲染不可用」实为静态产物 404 被 SPA fallback 伪装

- 现象：mermaid 图红标「不可用」（= `import('mermaid')` 动态 chunk 加载失败），而服务端 `index.html` 与全部 chunk 引用都在、`/assets/*.js` 返回 200 text/javascript。
- 根因：**旧标签页**（重新构建前打开）引用的旧 hash chunk 已被删除 → 请求落到 `serveStatic` 的 SPA fallback → 返回 `index.html`（200 / text-html）→ 动态 import MIME 不匹配失败。前后端都「看起来正常」。
- 修复（已落地 `src/lib/mcp-http.ts`）：`/assets/*` 与已知静态扩展名的缺失文件一律 404（不回 index.html）；`index.html` 等固定名文件 `Cache-Control: no-cache`，`assets/` 下带 hash 产物 `immutable` 长缓存。测试在 `test/mcp-http-api.test.ts`「--web 静态服务」（缺失产物 404 + 缓存头），改动需重启 `ki --web` 生效。
- 排查口径：报「图表/静态资源坏了」时先查**是否旧标签页 + 后端是否把 index.html 当 js 回**；语法错的红标是「失败」并带错误原文，两者别混。