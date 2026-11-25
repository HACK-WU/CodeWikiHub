---
groupPath: 部署运维
relation: ki-client 随主包 Release 发布
exportedAt: "2026-11-25T08:08:41.066Z"
---
发布时把子包 ki-client 打成第二个附件，跟主包同一个 GitHub Release 一起发；附件名固定为 ki-client.tgz（不带版本号），npm 保持 private、不发 registry。
- 为什么固定名：包内 version 是子包自己的（0.1.0），与主包 tag（v1.2.0-beta）不同步；带版本号会让安装地址长期漂移，固定名才能用 releases/latest/download/ki-client.tgz 这种稳定 URL。
- scripts/release.sh：子包 install（--no-package-lock，因不提交 lock）+ build → 产物检查 dist/cli.js → 测试门禁（npm --prefix ki-client test，85 例）→ ( cd ki-client && npm pack --pack-destination .. ) 后 mv 成 ki-client.tgz → gh release create 带两个 tarball；tar 内校验 package/dist/cli.js，缺了拒绝发布。
- 装法：npm i -g .../releases/download/<tag>/ki-client.tgz；或源码 cd ki-client && npm i && npm run build && npm i -g .（npm 不认带子目录的 git 地址；在仓库根 npm i -g . 装的是主包）。已实测 tarball 可全局安装并 --version/--help 正常。
- 文档入口（2026-11-25）：新建用户向手册 docs/ki-client.md（安装 / 配源 / ping / asset get / doc get / upload(-dir) / atlas / 配置与凭据 / 错误码 / 前提），已登记 docs/README「日常操作」表；根 README「1. 安装」下加「取件客户端（可选）」并链到它。
- .gitignore 补 kisearch-*.tgz / ki-client.tgz。