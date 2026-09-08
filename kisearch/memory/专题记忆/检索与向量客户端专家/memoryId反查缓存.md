---
groupPath: 专题记忆/检索与向量客户端专家
relation: memoryId反查缓存
exportedAt: "2026-08-28T10:05:26.877Z"
---
# memoryId反查缓存（契约更新 2026-08-28）

src/lib/relation-map.ts::getRelationMap(scope, ttlMs=10min)：memoryId → RelationMapEntry 反查映射。

## 契约变更（2026-08-28 tags 透传）
- RelationMapEntry 由 {group, relation} 扩展为 {group, relation, tags?}：tags 来自 relation.tags（文档级自定义标签），供 executeSearch 附加到 SearchHit.tags，前端搜索/浏览页全量展示多标签。
- **缺省语义**：rel.tags 缺省或空数组时**不注入 tags 键**（entry 形状与旧版 deepEqual 兼容，JSON 输出不变）。测试断言勿用 {tags: undefined} 形状。
- 同文件 chunk memoryId（多值 memoryIds）映射到同一 relation，tags 一致。
- 其余机制不变：模块级 Map<scope,{builtAt,mtimeMs,size,map}>，mtime+size+TTL 三重失效；懒构建 O(N)；文件缺失/损坏降级空 Map。

## 测试
- test/relation-map.test.ts 9 例全绿（含新增「tags 透传 + 无标签键缺省」正向路径）。
- 消费方：executeSearch（SearchHit.tags）、web 前端 SearchPage/BrowsePage 徽章渲染（旧后端无 tags 字段时回退单条 hit.tag）。