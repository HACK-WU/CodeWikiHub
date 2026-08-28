---
groupPath: 关联关系/知识索引导入
relation: 知识索引导入-MCP HTTP API
exportedAt: "2026-08-28T04:31:34.207Z"
---
[强关联] 知识索引导入 与 MCP HTTP API
影响线1：改 handleDirectImport 的参数语义（group/sourcePath/tags）或 ImportResult 结构 → /api/import/* 必改；原因：handleImportRun 消费请求参数透传导入并回传结果，group 缺省语义刚对齐（P1-1 修复）
影响线2：HTTP body 契约变化不要求导入核心改动，仅需 handleImportRun 适配层同步
强度：必改（改导入契约时）；HTTP 契约微调为建议

知识索引导入端：
- handleDirectImport @ src/lib/import.ts

MCP HTTP API 端：
- handleImportUpload/handleImportRun/handleImportStatus @ src/lib/mcp-http-api.ts