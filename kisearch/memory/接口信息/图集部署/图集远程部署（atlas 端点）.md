---
groupPath: 接口信息/图集部署
relation: 图集远程部署（atlas 端点）
exportedAt: "2026-11-25T07:26:31.885Z"
---
`/open/v1/atlas/*` 三条端点 + ki-client `atlas` 子命令，解决「图集包与 ki 不同机时装不上」——此前只有 `ki atlas upload`（同机直写盘）与 Web 页的 `/api/atlas/package`（base64 分片、16MiB）。

- 端点: `POST /open/v1/atlas/package?scope=`（单请求整包 zip，Content-Type application/zip，内存收 Buffer 不落 tmp、不分片）、`GET /open/v1/atlas/status?scope=`。前置校验链在读 body **之前**：授权 → 非视图 → 库存在 → 非只读 → Content-Type → 按 Content-Length 预检体积。
- 开关: package 与 status 归 `mcp.http.uploadApi`（与 import 同侧）；download（P1 未上线，能力位如实回 false）归 `downloadApi`。
- 指纹: `meta.packageSha256` 新增**可选**字段（zip 字节的 sha256）。原因：`meta.sha256` 是 entry html 的，而 ki-client 零依赖不解包、算不出它；缺这个字段时「未变更跳过」只能比 packageSize，会把同大小不同内容的包误判成未变更（静默不更新）。
- 错误码: `OPEN_API_ATLAS_SCOPE_NOT_FOUND`(404) / `OPEN_API_ATLAS_PACKAGE_INVALID`(400,413，extra.atlasCode/atlasKey 透出 14xx) / `OPEN_API_ATLAS_NOT_INSTALLED`(P1)。CONTRACT_VERSION 不 bump。
- 客户端: `ki-client atlas upload --scope --file [--title] [--force] [--json]` 与 `atlas status`；--json 输出纯 JSON；跳过判断**只看服务端 packageSha256**，不用本地 state（图集是整包覆盖，别人传过就失真）。
- 落点: `src/lib/open-api/routes/atlas.ts`、`constants.ts`、`index.ts`、`routes/ping.ts`、`ki-client/src/commands/atlas.ts`
- 验证: 服务端 test/open-api-atlas.test.ts 23 例、ki-client 84 例；真机 default 库 931KB 图集上传成功，/api/atlas/view 953769 字节与 meta 一致。