# 向量引擎专家

> **历史快照提示（2026-11-25 合并补全）**：本篇主体保留 2026-08 基线时的描述；文中出现的旧命令、旧文件数与旧工具清单均为**当时状态**，现已变更。当前口径以文末的「合并补全」增量章节与 `INDEX.md` 为准。


**一句话职责**：kisearch 的检索基座——ZvecEngine 门面（worker 多线程隔离架构），提供 dense 语义、FTS 全文、hybrid 混合检索；支持带 dense schema 的 hybrid Collection 与不含 dense/embedding 的 FTS-only Collection。

**负责的模块**：`src/zvec-engine/`（16 个 .ts，含 embedding/ filter/ schema/ search/ 四个子目录，独立子项目，`tsconfig.src.json` 独立构建到 `dist/zvec-engine`）

**何时找这个专家**：
- 需要理解 / 修改向量库底层行为（检索算法、embedding、schema、Filter、异常体系）
- 需要诊断向量相关错误（CollectionLocked / DimensionMismatch / SchemaMismatch 等）
- 需要扩展向量引擎能力（新 embedding 提供商、新检索方式、新标量字段）
- 需要了解 worker 多线程架构与进程隔离机制

**契约层就绪**：`C0 + C1 + C4` 就绪

**更新记录**：2026-09-22 增量补充 FTS-only Collection：`vectorDir/collections/<scope>` 与 `vectorDir/fts-collections/<scope>` 分离，每个 scope 独立 Collection；FTS-only 不创建 dense schema、不调用 embedding。此前 2026-08-28 对齐 58c12ca 的 Worker 族异常与 idle-race 说明仍有效。

**包含的资产**：
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`04-模型.md`、`05-接口.md`、`06-测试.md`

**测试状态**：测试目录 `test/`（`zvec-engine*.test.mjs` 9 个），✅ 可跑（`npm run test:zvec-engine`，node --test）；⚠️ embedding 相关用例需真实 API Key。详见 `implementation/06-测试.md` 与 `test/known-failures.md`。

**出处行**：生成日期 2026-08-06（更新 2026-08-28；合并补全 2026-11-25，git commit `0f1426b`；工作区另含 20 个未提交改动）

---

> **合并补全（2026-11-25，基线 0f1426b）**
> - **文件数**：`src/zvec-engine/` 现 16 个 .ts（旧记 14）；比旧基线多出 `scoring.ts` 与 `embedding/batch-scheduler.ts`。`git diff --name-only 8adc487..0f1426b -- src/zvec-engine` 共 14 个文件变更。
> - **新增/细化**：`scoring.ts`（RRF_FLOOR / SEMANTIC_BONUS / dynamicRatioScore / ftsWeightedRrfScore / SINGLE_SCOPE_RANKING / SEMANTIC_SIMILARITY_RANKING）、`embedding/batch-scheduler.ts`（EmbeddingSchedulerRuntime / normalizeEmbeddingScheduler / parseProviderBatchLimit / MAX_REQUEST_TIMEOUT_MS）、`search/router.ts::routeSearch` 的退化矩阵、`search/normalize.ts::normalizeVectorScore / toHit`。
> - **口径修正**：RRF 不在 `engine.search`；`search/router.ts` 只决定 hybrid/vector/fts 路由，评分公式在 `scoring.ts`，两路实际融合在 `worker.ts`（:454-644）。
> - **异常体系**：`errors.ts` 现 19 个类、`ERROR_CONSTRUCTORS` 表；`index.ts` 对外导出 13 个（旧文档写「11 种核心 + 基类 / 共 18 类」已过期）。
> - **空闲释放在外部**：`src/lib/vector-client.ts::enableIdleClose` / `closeEngine` 触发 `ZvecEngine.close()` → `ZvecEngineProxy.close/terminate` → worker `closeSync` 释放 LOCK；`engine.ts` 另有 probe 孤儿 worker `unref` 兜底。
> - **测试**：`test/zvec-engine*.test.mjs` 9 个（旧记 7）；`npm run test:zvec-engine`，前置 `npm run build:zvec-engine`；⚠️ embedding 用例需 API Key。

