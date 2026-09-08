---
groupPath: 数据流/知识索引导入
relation: group 级 assets 附件目录
exportedAt: "2026-09-08T02:26:39.717Z"
---
【数据流｜group 级 assets 附件目录】
- 实体类型：kb/{scope}/{groupPath}/assets/——导入时从源 wiki 复制的本地图片附件，**保持相对 md 的原路径结构**（images/x.png → assets/images/x.png），故前端可用原 URL 直接寻址、无需映射表
- 生产方：collectAndCopyAssets @ src/lib/import.ts（导入主循环内逐文件调用）；落点由 getAssetsDir(scope, groupPath) @ src/lib/scope.ts 计算
- 消费方：GET /api/asset @ src/lib/mcp-http-api.ts（纯文件读取，不经向量引擎，导入后免重启生效）→ Web 前端 MarkdownPreview 的 <img src>；ki export 携带复制（stats.assets）
- 业务用途：解决「md 引用的本地图片从不进 KB → 原文里是悬空引用 → 前端破图」
- **关键约束**：① 不经 writeJson/WAL（是二进制文件直接 copyFileSync，不是 JSON 实体）② 选 group 级而非 scope 级，是为了与 local KB **同生命周期**——delete-group 的 rmSync 整 group 子树、backup 的 tar 整 scope 都自动覆盖附件，零连带代码 ③ 只收相对路径（外链/绝对路径/file:// 不收）④ 复制前 realpath 复检仍须在 sourceDir 内（防符号链接越界读宿主机文件）⑤ 超限（默认 5MB，config import.maxAssetSize）/非白名单后缀/未命中/越界均为告警一行 + 跳过该附件，**不阻断导入**
- 开关：CLI --no-assets 或 config scopes.<scope>.import.assets:false；关闭后前端对图片引用显示占位块
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md