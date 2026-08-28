---
groupPath: 关联关系/知识索引导入
relation: 知识索引导入-restore
exportedAt: "2026-08-28T04:31:34.207Z"
---
[强关联] 知识索引导入 与 restore
强度：必改——改 rebuildScopeVectors 签名或 RebuildVectorOptions 语义（groupFilter/tags/tagsProvided），restore.ts 的调用必须连带改；改 restore 还原流程时须确认重建参数仍匹配
原因：restore.ts 在还原后调用 rebuildScopeVectors 重建向量，是 rebuild 能力的核心消费方

知识索引导入端：
- rebuildScopeVectors/RebuildVectorOptions/RebuildDeps @ src/lib/rebuild-vector.ts

restore 端：
- 重建调用点 @ src/restore.ts