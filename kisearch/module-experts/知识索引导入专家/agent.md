# 知识索引导入专家

**一句话职责**：kisearch 的知识导入链路——外部 Markdown 目录/单文件原文直导（无 AI 依赖），幂等追加承载增量更新，含导入锁/中断自愈、四类向量写入、HTTP 导入接口与向量重建。

**负责的模块**：`src/lib/{import,interrupt,batch-vectorize,path-vectorize,rebuild-vector,ai-results,progress}.ts` + `src/scan-kb.ts` + `src/lib/mcp-http-api.ts`（`/api/import/*` 三接口部分）

**何时找这个专家**：
- 需要 / 排查 `ki scan-kb import`（目录/单文件导入、幂等重导、--group 落点、--tags 打标）
- 需要排查 HTTP 导入链路（/api/import/upload|run|status、异步 job）
- 需要排查导入中断 / 并发导入锁问题（import-interrupt.json / .import.lock）
- 需要理解向量内容与落点契约（chunk 切分、清洗、ki-path/ki-relation、memoryIds 多值）
- 需要从还原的 KB 重建向量（全量 / --group 子树 / --tags 打标）

**契约层就绪**：`C0 + C1 + C2 + C4` 就绪

**包含的资产**：
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C2-使用流程.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`03-数据流转.md`、`06-测试.md`

**测试状态**：测试目录 `test/`（`import-scheme-d`、`interrupt`、`rebuild-vector`、`mcp-http-api`、`error-handling`、`integration`），✅ 可跑（`npx jiti test/<name>.test.ts`）；⚠️ `import-vector-rebuild` 需向量/embedding 环境未纳入常规回归。详见 `implementation/06-测试.md` 与 `test/known-failures.md`。

**历史版本注意**：2026-08-06 初版描述的 full/incremental 双模式、`incremental.ts`/`diff.ts`、ai-results.json 输入契约、进度文件断点续跑、git commit 基线**均已废弃/删除**（2026-08-07/14 重构，commit a373606 / fce0b57 / 54b035b）。以本版为准。

**出处行**：生成日期 2026-08-06，更新日期 2026-08-28（基于 commit 54b035b）
