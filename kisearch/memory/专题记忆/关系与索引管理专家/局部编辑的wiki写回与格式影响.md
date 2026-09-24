---
groupPath: 专题记忆/关系与索引管理专家
relation: 局部编辑的wiki写回与格式影响
exportedAt: "2026-09-24T08:51:34.874Z"
---
【已知坑｜ki_edit_relation 的 wiki 写回】2026-09-24 实测 + 源码核对。finish 成功后清理旧索引并调用 writeBackToWiki（同 sync_relation 链路，@ src/lib/relation-edit-publish.ts::runFinish）。
- 落点：{source.dir}/{group}/{relation}.md；内容 = generateMarkdown = YAML frontmatter(groupPath/relation/exportedAt) + 正文（@ src/lib/markdown-gen.ts）；**无条件覆盖写**（fs.mkdirSync recursive + fs.writeFileSync，@ src/lib/wiki-sync.ts）。
- 坑1 路径推断：group 与源文件相对目录不一致的旧数据（如 scope rv-e2e 的 relation 用户认证 sourcePath=「API 参考/用户认证.md」而 group=「TestWiki/API 参考」）会写到 {dir}/TestWiki/API 参考/用户认证.md——**新建文件而非更新原文件**（实测 fts_test 同样多出一层 group 目录）。group 与文件路径一致时（如 kafka：group=stages/2-核心架构、relation=overview、sourcePath=stages/2-核心架构/overview.md）才命中原文件。
- 坑2 格式污染：原文件无 frontmatter 时（如 /root/learning/kafka/** 手写教程）会被注入 6 行 frontmatter，且每次写回 exportedAt 刷新 → git 全量脏 diff。仅当源文件本就是 ki 导出格式时才无损。
- 坑3 autoBackfill：source.dir 目录不存在或为空时，写回前会触发 backfillWiki 全量补齐（wikiSync.autoBackfill 默认 true）→ 可能在源目录批量生成全部 relation 文件。
- 安全用法：scope 无 group-index source 块且 config 未配 wikiSync 时，finish 不写任何文件，view 返回 wikiSynced:false + wikiReason（实测 bulk-test：“无可用 wiki 写回目录（source 块和 wikiSync 均未配置）”）。
- 因此：以工作区文件为 SSOT 的教程/知识库修订流程（如 tutorial-lookup 的「改文件 + ki import --conflict-mode overwrite」）不宜直接换成 ki_edit_relation，除非可接受 frontmatter 注入与 exportedAt 变动。