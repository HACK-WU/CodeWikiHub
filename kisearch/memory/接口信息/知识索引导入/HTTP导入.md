---
groupPath: 接口信息/知识索引导入
relation: HTTP导入
exportedAt: "2026-08-28T04:31:34.207Z"
---
【接口信息｜HTTP导入】
- 子功能：HTTP 导入
- 所属模块：知识索引导入
- 接口列表：
  - POST /api/import/upload → handleImportUpload @ src/lib/mcp-http-api.ts：接收 base64 文档落盘 ~/.ki/import-uploads/<uploadId>/，返回 uploadId
  - POST /api/import/run → handleImportRun @ src/lib/mcp-http-api.ts：按 scope/sourcePath/group 异步执行导入，202 返回 jobId（group 缺省传 undefined，与 CLI 推断语义一致）
  - GET /api/import/status → handleImportStatus @ src/lib/mcp-http-api.ts：查询导入 job 进度与结果（job 为内存态，服务重启后查询返回 404）