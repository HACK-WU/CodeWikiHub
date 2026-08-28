---
groupPath: 专题记忆/关系与索引管理专家
relation: Group路径解析四级降级
exportedAt: "2026-08-28T07:38:41.826Z"
---
src/lib/group-resolve.ts::resolveGroupPath(userInput, groupIndex, groupsData, scope?) 返回 ResolveResult{resolvedPath, hint, matched, candidates?, fuzzyMatched?, fuzzyScore?}，四级降级：
1. groupsData 键直接命中（relations-cache 有数据的 Group）；
2. pathExistsInTree 树中路径完整存在（无 Relation 数据也算成功）；
3. 对每个顶层 Group 拼 top/userInput 整段补全：唯一命中自动补全并给 hint，多命中返回 candidates + matched:false；
4. 部分匹配提示暂存，再在**传了 scope 时**调 searchPath(userInput,'ki-path',scope)；向量候选须通过 pathExistsInTree 或 groupsData 存在性校验才采纳（fuzzyMatched:true）；都失败才用部分匹配提示，最后兜底「未匹配到任何 Group + 可用顶层 Group 列表」。
坑：向量兜底**仅在传 scope 时启用**——manage-index 内部调 resolveGroupPath 不传 scope，所以那里没有语义兜底。
rootName 概念已于 2026-08-14 移除，group 即完整相对路径，分隔符仅 '/'。
工具函数：pathExistsInTree / findLongestExistingPrefix / getDirectChildren。