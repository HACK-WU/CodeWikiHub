---
groupPath: 决策记录
relation: ki-client 独立包与对外取件契约
exportedAt: "2026-11-25T02:47:02.891Z"
---
ki 的对外取件客户端 ki-client 用 TypeScript 实现（Node ≥18），位于 kisearch 仓库的 `ki-client/` 子目录：**源码同仓、发布物独立**（自己的 package.json / 依赖 / 版本号，不进主包构建）。需求真源 REQ-20261124-002。
- 仓库归属（2026-11-24 用户澄清）：同仓子包，**不是独立仓库**。耦合点只有 HTTP 契约，拆仓会让能力位 / 错误码 / 版本协商两头对；此前「独立仓库 + 工作区外目录」的读法作废。
- 分发（2026-11-25 已定方案 B）：进 `ki-client/` 执行 `npm i && npm run build`，再 `npm i -g .`。**主包 bin / prepare 不动**——方案 A（把 ki-client 挂进主包 bin）会让每次安装 ki 都多跑一次子包构建，把客户端问题绑成主包安装失败，已否决。同仓子包不支持 `npm i -g github:<org>/<repo>/ki-client`（npm 不认带子目录的 git 地址）。
- 语言理由：跑 ki 的机器必然有 Node；内置 fetch / FormData / Blob 让零依赖更彻底；契约常量可与服务端同源复制。
- 多源：类比 git remote，**配置多个源时使用时必须显式指定**，不设隐式默认；单源自动；token 按源隔离。
- 配置：`~/.ki-client/config.yaml`（目录 0700 / 文件 0600），唯一第三方依赖 `yaml`；值强制双引号、源名白名单排除 on/off/yes/no、未知顶层键 fail-loud、同名换地址清空旧 token。
- 服务端：MCP 只回答「图在哪」，字节走 HTTP；只读端点落 /open/v1，不复用 /api/*（人类兜底 humanUrl 除外）；字段缺失视为 contractVersion=0。
- 已实现（端到端冒烟过）：remote add/list/show/remove、ping（能力位/上限）、asset get（落盘保留 ref 子路径 + 绝对路径 + sha256、默认不覆盖、ref 越界本地先拦）。未实现：doc get、upload / upload-dir、单测。
- 推翻：「独立仓库」「Python + PyYAML」「ki_upload.py 升格为 ki-client」「一条命令装两个 bin」四条旧判断作废。