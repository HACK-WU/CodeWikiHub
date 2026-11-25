---
groupPath: 数据流/远端客户端
relation: ki-client 配置与增量状态
exportedAt: "2026-11-25T08:07:10.408Z"
---
ki-client 的数据实体流向（基线 0f1426b）。
- ~/.ki-client/config.yaml：生产方 writeConfig（目录 0700 / 文件 0600），消费方为全部命令，用途是存远端名、url 与 Token 来源；KI_CLIENT_CONFIG 可覆盖路径。
- ~/.ki-client/state/<key>.json：生产方 lib/state.ts，消费方为 upload / upload-dir，用途是按 sha256 记文件级增量；key 必须含 url，失败批不落状态。
- --out 输出目录：生产方 runAsset / runDoc，用途是落附件与 *.md。
- 详细流向：见 .module-experts/远端客户端专家/C4-数据流向与消费.md。