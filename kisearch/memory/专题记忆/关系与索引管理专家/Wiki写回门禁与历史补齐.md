---
groupPath: 专题记忆/关系与索引管理专家
relation: Wiki写回门禁与历史补齐
exportedAt: "2026-08-28T07:38:41.827Z"
---
src/lib/wiki-sync.ts：writeBackToWiki 是 writeBackToWikiInner(..., allowAutoBackfill=true) 的薄封装。
- 统一门禁：getScopeWikiSync(config,scope)?.enabled === false 直接返回 {synced:false, reason}（未配置 wikiSync 时视为启用）。2026-08-27 前的 Bug：enabled 只对 fallback 路径生效，source.dir 存在时会绕过门禁。
- 目标目录优先级：group-index 的 source.dir > 配置的 wikiSync.sourceDir；都没有则返回「无可用 wiki 写回目录」。
- autoBackfill：allowAutoBackfill && wikiSync.autoBackfill !== false 时，若目标目录不存在或 readdirSync 为空 → 先跑 backfillWiki(scope)；backfillWiki 内部逐条写回传 allowAutoBackfill=false **防递归**。
- backfillWiki（CLI: ki wiki-backfill <scope>）：三项 fail-loud 前置（enabled=false / 无目标目录 / cache 缺失或解析失败），再遍历 cache.groups 的 hot_relations，从 local KB 取内容逐条写回。数据源是 **relations-cache + local KB，不是向量层**（只有 KB 里有原文的关系才能补齐）。
- **缺省幂等**：跳过已存在文件，避免 generateMarkdown 的 exportedAt 刷新给 git 管理的 wiki 目录造成全量脏 diff；--force 才覆盖写。