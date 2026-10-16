---
groupPath: 决策记录/知识库专家
relation: 数据归属-Wiki状态列挤在KB表
exportedAt: "2026-10-16T03:53:30.130Z"
---
【决策记录｜Wiki 是 KB 上的派生索引，其配置与状态列挤在 knowledgebase 表】\n- 分类：数据归属 / 演进\n- 动机：无明写依据。结构性事实：Wiki 配置与状态以 `wikiConfig/wikiStatus/wikiAvailability/wikiActiveRevision/wikiStagedRevision/wikiConfigFingerprint/wikiRebuildRequiredReason/wikiBuildError/wikiGeneratorVersion` **九列直接挂在 `knowledgebase` 行上**，而页面内容全部落在 15 张 `knowledge_wiki_*` 表。[推测] 这样能让「Wiki 是否就绪/是否需要重建」与 KB 其他状态在同一行内一次读取，避免为状态机再开一张单行表\n- 决策：把配置与状态当作 KB 行的一部分（`knowledgebase` 表），把内容与 job 台账当作独立派生面（`knowledge_wiki_*` 15 表）\n- 背景约束：`KnowledgebaseModule` 与 `KnowledgeWikiModule` 各自 `RouterModule.register({ path: '/knowledgebase' })`，靠 `@Controller(':knowledgebaseId/wiki')` 段区分——状态列与接口同处一个前缀空间\n- 被否决方案：无\n- 重新评估触发条件：`knowledgebase` 表状态列继续增长导致行宽与写竞争成为问题；或需要按 KB 独立审计 Wiki 状态变更历史\n- 关联代码：`Knowledgebase.wiki*` 列；`KnowledgeWikiService.getStatus/updateConfiguration`\n- 证据来源：knowledgebase.entity.ts（wiki* 列）；knowledge-wiki.module.ts；knowledge-wiki.service.ts