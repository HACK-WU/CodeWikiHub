---
groupPath: 专题记忆/知识索引导入
relation: 上传通道的 wiki 回写口径
exportedAt: "2026-11-13T02:51:45.353Z"
---
从上传通道导入时为何可能「导入成功但 wiki 目录没文件」，以及新增导入入口时要检查什么。

- 唯一开关: `handleDirectImport` 严格 `args.wikiWriteback === true` 才写回（`src/lib/import.ts`）
- 入口清单: CLI `ki import`（`src/import.ts`，经 daemon RPC 全量展开 params）· `/api/import/run` · `/api/import/upload` 分步 finalize（均经 `runImportJob`，2026-11-13 起传 true）· `/open/v1/import/upload`（同）· `ki datasource sync`（不传）
- 坑: 新增内核布尔开关必须逐个调用点决定。`RunImportArgs` 缺字段时 HTTP 侧根本无法开启，故障表现为「功能静默不生效」而不是报错——排查时先看内核入参，别先怀疑配置
- 相关: `wiki-sync.ts::writeImportedDocsToWiki` 只认 `wikiSync.sourceDir`、已存在文件跳过、源在 wiki 内不自我复制；覆盖测试 `test/wiki-import-sync.test.ts`