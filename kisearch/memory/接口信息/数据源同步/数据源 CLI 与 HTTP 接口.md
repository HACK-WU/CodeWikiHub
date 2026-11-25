---
groupPath: 接口信息/数据源同步
relation: 数据源 CLI 与 HTTP 接口
exportedAt: "2026-11-25T08:06:24.396Z"
---
数据源同步域对外接口清单（基线 0f1426b）。
- CLI：ki datasource add|list|remove|sync。
- HTTP：GET /api/datasource/list、/detail；POST /api/datasource/sync、/schedule、/add-remote、/update、/remove、/prune。
- 能力位：datasource.read / datasource.write / datasource.delete；错误 DATASOURCE_LIFECYCLE_LOCKED 1006 与 SourceDirCode / GitUrlCode 字符串码。
- 调度器无对外端点，只在 daemon 的 HTTP 分支末尾拉起。
- 位置：src/datasource.ts、src/lib/mcp-http-api.ts、src/lib/auth/capabilities.ts。