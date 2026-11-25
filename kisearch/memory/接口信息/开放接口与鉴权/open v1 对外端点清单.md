---
groupPath: 接口信息/开放接口与鉴权
relation: open v1 对外端点清单
exportedAt: "2026-11-25T08:06:24.396Z"
---
对外 /open/v1 通道端点清单（基线 0f1426b）。
- GET /open/v1/ping（contractVersion=1 与 capabilities）、/import/status、/events、/asset、/doc、/atlas/status。
- POST /open/v1/import/upload（分片）、/atlas/package（整包）。
- 开关位 uploadApi / downloadApi 由 mcp-http.ts 注入；downloadApi=false 时 doc/asset 404，Web 侧不受影响。
- 错误码：OPEN_API_TOKEN_REQUIRED / TOKEN_INVALID / TOKEN_READONLY / SCOPE_FORBIDDEN / DAEMON_DRIFT / ATLAS_PACKAGE_INVALID。
- 上限：uploadMaxBytes 默认 512MB、上限 4GiB；atlas 包服务端 20MB。
- 位置：src/lib/open-api/index.ts、src/lib/open-api/constants.ts、src/lib/open-api/routes/ping.ts。