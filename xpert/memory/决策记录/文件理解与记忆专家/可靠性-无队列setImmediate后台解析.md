---
groupPath: 决策记录/文件理解与记忆专家
relation: 可靠性-无队列setImmediate后台解析
exportedAt: "2026-10-16T08:16:32.869Z"
---
【决策记录｜可靠性-无队列的 setImmediate 后台解析（同步/后台二分取舍及其代价）】
- 分类：性能取舍（C5 §D10 原分类；本条按「可靠性」归口命名）
- 动机（避坑）：**现象** 解析包含 PDF 页渲染与向量索引，属长耗时任务；**后果** 一律同步会让上传与对话首轮变慢（PDF 页图 ＋ embedding 都在请求线程里，是慢请求主因）；一律异步又会让小文件在下一轮对话前拿不到 preview/vision 元数据，用户体验成「刚传完就要等」
- 决策：用「模式 ＋ 阈值」二分 —— `shouldRunParseInline`：`fast` 恒同步、`deep` 恒假、其余按 `size <= 2_000_000`（`MAX_INLINE_PARSE_BYTES`）；`runInline` 为真走同步 `ParseFileAssetCommand`，否则 **`setImmediate` 后台执行且失败仅 `logger.warn`**；两种路径都先把 `status` 写成 `parsing` 以便观测；`parseMode==='none'` 直写 `ready` 短路（**不解析**）
- 背景约束：**无持久队列、无 lease、无退避重试**（本域 `@Processor`/`@Cron`/`@Interval` 检索 0）⇒ **进程重启即丢任务**，`status` 可能**永久停在 `parsing``（且 `failedAt`/`error` 不会补写）；重试只有显式命令，没有任何自动补偿
- 背景约束（两条重试语义不一致）：HTTP `POST /api/ai/files/:fileId/parse/retry` → `RetryFileParseCommand` **直接**转 `ParseFileAssetCommand`（绕过 Enqueue，因此**不重置 `status`、不读 `runInline`，本身无门禁**）；runtime `retryUnderstanding` 是**唯一带门禁**入口（仅当 `status==='failed'` 或 `vectorIndexStatus ∈ {failed,unavailable}`，否则 400 `Only failed or unavailable file understanding can be retried`）
- 背景约束（失败终态）：`catch` 内写 `status='failed'` ＋ `error=message` ＋ `failedAt`，并把 `metadata.understandingErrorCode` 置为三选一：`file_understanding_embedding_unavailable`（deep 模式缺可用 Embedding 模型）、`file_understanding_vector_index_failed`（向量索引/检索不可用）、`file_understanding_parse_failed`（其余，含解析器不匹配）—— **HTTP 不抛错**
- 被否决方案：无（源码未记录「为何不引入队列」；实现层将其列为技术债 1「无持久队列」而非决策记录）
- 重评条件：多实例部署、或出现「解析必达」的业务要求时，必须引入持久队列/租约；否则需接受「人工重试」的运行口径（排障顺序：先看 `status`，再看 `vectorIndexStatus` 与 `metadata.understandingErrorCode`）
- 关联代码：file://packages/server-ai/src/file-understanding/commands/handlers/{enqueue-file-parse.handler.ts,parse-file-asset.handler.ts,retry-file-parse.handler.ts,index-file-chunks.handler.ts}、file://packages/server-ai/src/ai/context.controller.ts、file://packages/server-ai/src/shared/runtime/workspace-files-runtime-capability.service.ts
- 证据来源：C5-关键决策.md §D10；implementation/{02-实现.md 热点路径 1/2, 03-数据流转.md 链路三, 04-模型.md 未确认项 1}
- 详细资产：.module-experts/后端专题/文件理解与记忆专家/ C5-关键决策.md §D10 · implementation/03-数据流转.md 链路三