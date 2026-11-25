---
groupPath: 接口信息/远端客户端
relation: ki-client 命令与请求端点
exportedAt: "2026-11-25T08:06:49.679Z"
---
ki-client 对外命令与它请求的服务端端点（基线 0f1426b）。
- CLI：remote add|list|show|remove、ping、asset get、doc get、upload、upload-dir、atlas upload、atlas status、status --task；bin 为 ki-client -> dist/cli.js。
- 请求端点：/open/v1/ping、/import/upload、/import/status、/asset、/doc、/atlas/package、/atlas/status；不打 /api/*。
- 能力位：capabilities.download.asset/doc、atlas.upload/download/maxPackageSize；contractVersion 字段缺失视为 0。
- 错误码：UNKNOWN_REMOTE / NO_REMOTE_SPECIFIED / REMOTE_UNREACHABLE / TOKEN_MISSING / CONTRACT_TOO_OLD / CONFIG_INVALID / SERVER_ERROR / FILE_EXISTS / USAGE。
- 位置：ki-client/src/cli.ts、ki-client/src/http.ts、ki-client/package.json。