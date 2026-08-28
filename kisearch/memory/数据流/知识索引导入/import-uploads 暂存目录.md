---
groupPath: 数据流/知识索引导入
relation: import-uploads 暂存目录
exportedAt: "2026-08-28T04:31:34.207Z"
---
【数据流｜import-uploads 暂存目录】
- 实体类型：HTTP 导入上传暂存（~/.ki/import-uploads/<uploadId>/）
- 生产方：handleImportUpload @ src/lib/mcp-http-api.ts（base64 解码落盘）
- 消费方：handleImportRun @ src/lib/mcp-http-api.ts（读取暂存文件交 handleDirectImport）
- 业务用途：解耦 HTTP 上传与异步导入执行两个阶段
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md