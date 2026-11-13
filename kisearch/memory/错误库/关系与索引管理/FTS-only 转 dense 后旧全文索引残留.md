---
groupPath: 错误库/关系与索引管理
relation: FTS-only 转 dense 后旧全文索引残留
exportedAt: "2026-11-13T09:04:34.221Z"
---
【已修复 2026-11-13】文档从 FTS-only 写入切到 dense 写入时，旧全文索引记录原本不会被清理，`--mode fulltext` 会命中并返回 KB 里已不存在的旧内容。修复后 dense 写入成功即清旧 FTS。

- 根因：`executeSyncRelationLocal` 的 `fts` 仅在 `params.vector===false` 时赋值（vector=true ⇒ 整段跳过）；随后 `else if (relRec && !relRec.ftsIds?.length)` 对「有旧 ftsIds」恒 false ⇒ 既不清理也不改。批量路径同构。
- 修复：新增 `cleanupStaleFtsIds`（只删 + 改 rel，不落盘，NOT_FOUND 视为成功）；单条在 `vec` 成功后调用并**基于重新 `loadCacheShape` 的副本落盘**（`vectorWriteBack` 会自读自写 cache 回写 memoryIds，用旧 in-memory cache 落盘会把它们冲掉）；批量在 `vectorStored===true` 的条目上逐条清理，沿用阶段 4 落盘。返回体新增 `ftsRemoved` / `ftsCleanupFailed` / `ftsCleanupReason`。
- 测试：`test/sync-relation-fts-cleanup.test.ts` 9 例（含「先写向量后删 FTS」调用顺序断言、memoryIds 不被回滚断言）。
- 位置：`src/sync-relation.ts`（`cleanupStaleFtsIds` / `executeSyncRelationLocal` / `executeBulkSyncRelationLocal`）；文档 `docs/cli.md`；需求 `CodeWikiHub/kisearch/requirements/2026-11-13-fts-residual-after-dense-switch/requirement.md`（v2，含实施记录）
- ★ 被推翻的旧判断：「默认 hybrid 因『同 group|relation 只留最高分』去重而被掩盖」。实为物理隔离：`ftsOnlySearch`（`ftsSearch` 别名）唯一调用点在 `fullTextSearch` 内，`vectorSearch`（hybrid）只查 hybrid Collection ⇒ 旧记录不进候选池；`--tags` 的 hybrid 召回同样漏不出来。
- ★ 危害面更正：`src/search.ts` 在 `ensureVectorAvailable` 不可用时把 hybrid 静默降级为 fulltext（查询 embedding 失败同理），此时默认检索就返回旧内容 —— FTS-only 部署 / 降级启动并非「潜伏」。
- 存量修复：`ki restore <scope> --rebuild-vector` 已有清理（实测有效，代价是重算 embedding 且会把 FTS-only 文档一并向量化）；`ki doctor` 只读诊断项**未实现**。
- 已知遗留：只有该文档再次写入才会重试清理，长期不写则残留（诊断靠 doctor，待做）；批量反向清理（dense→FTS-only）用例未补。