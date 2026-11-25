---
groupPath: 错误库/关系与索引管理
relation: 组快照取 KB 键时漏排 writeJson 注入的元字段
exportedAt: "2026-11-23T08:49:49.980Z"
---
组删除入站需要遍历 local KB 的 `index.json` 顶层键来收集篇目（取「分片键 ∪ KB 键」并集）。但 `writeJson`（src/lib/store.ts:84-95）落盘时会自动注入 `version`（number）与 `updatedAt`（ISO string），直接 `Object.keys(kb)` 会把这两个当文档 —— 实测 3 篇的组写出 7 个 `docs/NNNN` 目录，恢复时变成 4 篇名分别为 version / updatedAt 的假文档。
- 正确做法: 判定**同时看键名与值形状** —— `version` 仅当值为 number、`updatedAt` 仅当值为 ISO 时间串时才排除（`trash-service.ts::isKbMetaKey`）。只按键名排除会误伤真叫 version 的文档，而组删除随后 `rmSync` 掉它，属静默丢数据。
- 位置: `src/lib/trash-service.ts`（moveGroupToTrash）
- 验证: `test/trash-group-snapshot.test.ts` 用例「篇目取并集…」断言 docs=3