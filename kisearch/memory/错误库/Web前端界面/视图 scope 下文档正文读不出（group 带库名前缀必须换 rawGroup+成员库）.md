---
groupPath: 错误库/Web前端界面
relation: 视图 scope 下文档正文读不出（group 带库名前缀必须换 rawGroup+成员库）
exportedAt: "2026-11-20T10:53:33.770Z"
---
视图模式（多库，如 kisearch-docs）下点文档后右侧恒为「无法显示目标文档正文，请选择其他文档」。
- 根因: `normalizeDocData` 给每条 doc 注入三个字段 —— `group` = `库名/真实group`（仅供展示与树路径）、`scope` = 成员库、`rawGroup` = 后端真实 group（其注释已警告「传前缀过去会报未匹配到有效路径」）。但 `GroupTreePanel.onOpenDoc` 只传了带前缀的 `group`，消费方用「视图名 + 带前缀 group」去 `ki_get_module_info` ⇒ 后端解析不到 ⇒ content 为空 ⇒ 前端落到「无法显示正文」分支（且 `message` 也为空，所以看不出是路径问题）。
- 修法: ① `GroupTreePanel.onOpenDoc` 交出 `scope`/`rawGroup`（组内叶子与根散文件两处）；② `DocItem` 补可选 `scope`/`rawGroup` 类型；③ `ReaderLinkComposer` 用 `readScope = doc.scope ?? scope` / `readGroup = doc.rawGroup ?? doc.group` 读正文，并把搜索命中同样归一（视图下搜索返回 buckets，不归一会「命中 0 篇」）；④ `SearchPage` 树入口传 `scope`/`apiGroup`，ModuleDrawer 的 `group={viewing.apiGroup ?? viewing.group}`（与 BrowsePage 已有口径对齐）。
- 验证: playwright 实测 —— 引用选择器点 archive 正文 292141 字符、「引用整篇」可点并加入（toast「原文 315142 字，截断至 2000 字」）；搜索页全屏目录树点 PLAN-专家创建计划 正文 8492 字符。web 88 例绿、build ✓。
- 判定: 既有缺陷（视图聚合改造漏项），非「引用整篇」改动引入。