---
groupPath: 错误库/关系与索引管理
relation: 回收站正文缺失判据用 sizeBytes===0 不可靠
exportedAt: "2026-11-23T13:35:07.914Z"
---
回收站把「正文缺失」判成 `sizeBytes === 0`，但它是**入站瞬间的目录字节快照**（此时还没写 meta.json），正文在入站后丢失的条目该值停在旧值>0，判据失效：无徽标、文档名可点、恢复可点（恢复写出空文档并删条目），diagnostics 的 emptyContent 同时漏报。

**被推翻的旧判断**：以为 `writeTrashItem` 把 meta.json 也算进 sizeBytes 所以恒 >0 —— 实测该计算发生在 `writeJson(meta.json)` 之前，入站即无正文的条目 sizeBytes=0，徽标/禁用/诊断都正常。

修复（2026-11-23，事件 #81）：
- `listTrash` 为 doc 条目下发 `hasContent`（content.md 存在且非空白；组条目不给；另有 `probeContent:false` 供到期清理/体积统计免读盘）
- `restoreFromTrash` 写 KB 前 fail-closed → `TRASH_CORRUPTED`（码 1312、HTTP 409；未登记码会退化成 400），与入站 `TRASH_CONTENT_MISSING` 对称、与组恢复同口径
- diagnostics 单库/视图两处 `emptyContent` 改用 `hasContent === false`
- 契约 DTO 前后端同步 `hasContent?: boolean`；前端 `broken` / 批量 `restorable` 只认 `false`（兼容旧 daemon 不下发）

触发条件：产品代码里没有「单删 content.md 保留 meta.json」的路径，只能来自外部原因（磁盘/备份只回 meta、手工清理、部分失败）。

验证：`test/trash-broken-content.test.ts` 11 例、`web/test/trash-broken-judgement.test.mjs` 5 例；真机 13 项断言（直调 restore → 409、KB 未写、条目仍在回收站）；证据 `.debug/trash-broken-judgement-20261123/`。