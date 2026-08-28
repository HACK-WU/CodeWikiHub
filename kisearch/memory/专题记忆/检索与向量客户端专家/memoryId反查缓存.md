---
groupPath: 专题记忆/检索与向量客户端专家
relation: memoryId反查缓存
exportedAt: "2026-08-28T08:32:14.069Z"
---
src/lib/relation-map.ts::getRelationMap(scope, ttlMs=10min)：memoryId → {group, relation} 反查映射。
- 模块级 Map<scope, {builtAt, mtimeMs, size, map}>；**命中条件：mtime + size 均未变 且 未超 TTL**（size 兜底毫秒精度下 mtime 未变的原地改写）；任一变化立即失效重建（避免 sync-relation/import 后 10 分钟内反查到陈旧映射），TTL 是第三重兜底。
- 懒构建无定时器：首次 O(N)（N = 全部 hot_relations），后续 O(1)。
- **优先多值 memoryIds**（每个 chunk memoryId 都映射到同一文件级 relation，map.has 防覆盖），无 memoryIds 时回退旧数据单值 memoryId。
- 降级不抛错：文件缺失 → cache.delete + 空 Map；JSON 损坏 → 空 Map。检索结果只是缺 group/relation 字段。
- clearRelationMapCache() 为测试辅助。
- fetchOriginal(scope, group, relation)：readJson 读 kb/{scope}/{group}/index.json 取文件级原文；返回 null（KB 文件不存在）或 {original, hint?}（KB 缺该 relation → original:'' + hint 引导 sync-relation 或 rebuild-vector）。