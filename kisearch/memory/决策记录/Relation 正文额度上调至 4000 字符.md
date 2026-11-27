---
groupPath: 决策记录
relation: Relation 正文额度上调至 4000 字符
exportedAt: "2026-11-27T01:49:45.001Z"
---
Relation 正文推荐额度由 1000 字符上调到 4000 字符（CLI `sync-relation --module-info` 与 MCP 返回体 `warning` 共用同一阈值），目的是让「一张图 + 文字结论」的结构化记忆放得下，而不是被迫只写纯文字。
- 为什么不再高（2026-11-27 实测数据）: 库里 347 篇手写记忆，中位 1037 / p90 1580 / p99 3102 / 最大 3608，**超过 4000 的 0 篇** —— 需求侧没顶到；系统侧 `chunker.ts` 的 `MAX_CHUNK_SIZE=4000`（建议区间才 500~2000），4000 已是整个项目对「单段向量」的硬上限；而 relation 是**整篇一个向量不分块**，import 超 4000 会切块、relation 超 4000 是整块语义被稀释，所以 4000 对 relation 已比 import 的单块口径宽松一倍。
- 为什么 1000 时代没被抱怨: 中位数 1037 恰好贴着旧阈值 —— 阈值在塑造写作习惯，不是硬拦截（只警告）；但「写长」与「画图」不同，图的字符成本高，1000 下画一张图就没地方写结论了
- 容量对照: 25 节点 mermaid 图 ≈ 800 字符，800 字中文说明 ≈ 800 字符，加符号/位置/用法/边界 ≈ 300~500，一条图文记忆 ≈ 2000 字符，留一倍的余量
- 真写不下时的出路: ① 按主题拆条（首选，一条 Relation = 一个主题）；② 走 `ki-upload` 上传整篇文档（自动分块，检索反而更准）；③ 若高频触顶，该做的是让 sync 自动分块（对齐 import），而不是继续抬阈值——抬阈值只降低召回精度，不增加可写量
- 通道: CLI 打 stderr（人读）、MCP 返回体 `warning` 字段（agent 读）、批量逐条各带一条；三者共用 `moduleInfoOverLimitNotice()`。两个 MCP 工具的 description 也写明「超 4000 仍成功但带 warning」
- 边界: 只提示不改写入行为（超长仍正常写入、不自动切分）；`ok:false` 分支不带 warning（失败优先）；**客户端与 daemon 版本需同步**，只更新一端时该字段会静默缺失
- 位置: `src/sync-relation.ts` 的 `RELATION_MODULE_INFO_WARN_CHARS` / `moduleInfoOverLimitNotice`；工具描述在 `src/lib/mcp-tools/{sync,bulk-sync}-relation.ts`；文档同步 `docs/cli.md` / `docs/ki-command-guide.md` / `docs/codekb-agent-guide.md`；口径同步 `skills/agents-md-init`（§2.5 三 / §2.5 四 / §2.9 / AGENTS-template 第二原则）
- 验证: `test/sync-relation.test.ts` 31/31；`test/cli-aliases.test.ts` 22/22；MCP 三套 53/53；tsc build 0；真机 daemon 通道（`KI_DAEMON_CLIENT=1`）单条与批量各验一次
- 验证坑: `shouldUseDaemonClient()` 要求 `KI_DAEMON_CLIENT=1` 且非 daemon owner —— 直接跑 `node bin/ki.mjs sync-relation` 走的是本地直连，用它验证 daemon 通道等于没验
- 推翻的旧判断: ① 最初版测试用 `||` 且不校验文案阈值（假保护）；② 第一版只改 CLI、MCP 仍静默；③ 「daemon 已重启即验证」是错的