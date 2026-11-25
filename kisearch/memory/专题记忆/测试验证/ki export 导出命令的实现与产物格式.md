---
groupPath: 专题记忆/测试验证
relation: ki export 导出命令的实现与产物格式
exportedAt: "2026-11-18T08:15:47.190Z"
---
`ki export` 把知识库导出为 **Markdown Wiki 目录**（不是 PDF、不是二进制文档）。
- 入口：`bin/ki.mjs` 的 COMMANDS 表 → `src/export.ts`
- 产物结构：`<out>/<scope>/<group>/<relation>.md`，附带 `index.md`
- 依赖：只依赖 mcp-sdk / zvec / commander / jiti / yaml / zod；**不含 jsPDF / pdfkit / puppeteer / html2canvas 等渲染库**
- 已知边界：不支持样式、分页、字体嵌入；中文以 UTF-8 Markdown 原样落盘，不存在字体子集化问题
- 相关：`ki wiki-backfill` 是反向（Markdown → 知识库），与导出无关