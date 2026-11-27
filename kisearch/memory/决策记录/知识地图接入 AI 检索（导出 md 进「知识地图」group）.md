---
groupPath: 决策记录
relation: 知识地图接入 AI 检索（导出 md 进「知识地图」group）
exportedAt: "2026-11-26T09:56:07.673Z"
---
把 project-atlas 图集的文字层导出为 Markdown、导入**图集所在那个 scope** 的固定 group「知识地图」，让 AI 用 ki_recall / ki_search 查阅图集。落地在 `skills/atlas-deploy/SKILL.md` §2.3 / §3.2 / §3.3 / §4.4。
- **落点硬约束（2026-11-26 用户拍板）**：md 必须与图集同 scope，不为 md 另建库。视图不能当 scope。
- 流程：`export_markdown.py <图集目录> dist/atlas-md/ --clean` → `ki-client upload-dir … --group 知识地图 --prune`（同机 `ki import … --prune`）。必须在生成侧导出；**不要加 --no-images**；不要整形目录（#101 已修）。
- **篇数口径不同，别对账**：`ki-client` 打印的「共 N 篇」= `stats.total = entries.length`（chunk 数，`src/lib/import.ts:2401`）；`ki import` 的 `createdTotal` 才是文档数。同一目录前者 16、后者 9（8 页 + README），不是丢文档。
- **清理用 `--prune`，不删 group**：只算候选不删，删除走同机 `ki import --prune --yes` 或页面「目录同步清理」；双闸门 0.8/0.8 + 单次 500 篇；group 默认保留。
- **两条通道均已实测（2026-11-26）**：本机（一致 0 候选；移走一页 1 候选命中 modules）；远端 `ki-client upload-dir --prune`（9 组 / 17 文件 9 md + 8 svg、1.4MB、失败 0；整批无变化时仍算：8 篇 / 9 篇 / 候选 1，额外提示整组无文件落入）。
- **检索口径**：`kisearch-docs` 不含 `default`，引用图集需 `scope: "kisearch-docs,default"`（已写 AGENTS.md 第一原则）。
- **检索片段 ≠ 正文**：chunk 过 codePath 清洗，file:line 与图片引用被抹；正文完整。先 search 定位、再 get 读全文。
- 坐标坑：`ki group delete` 的 scope 是 `-s`；`ki import` 省略 `--scope` 写 default；`--prune` 用只读 token 会 403。事件 #105 已收口。