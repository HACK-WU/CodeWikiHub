# 已知单元测试失败：向量引擎专家

> **历史快照提示（2026-11-25 合并补全）**：本篇主体保留 2026-08 基线时的描述；文中出现的旧命令、旧文件数与旧工具清单均为**当时状态**，现已变更。当前口径以文末的「合并补全」增量章节与 `INDEX.md` 为准。


## 向量引擎专家（当前无已知失败）

当前无已记录的已知失败单元测试。若在使用中发现测试问题，请按以下格式追加。

### {测试文件路径}:{测试函数名}

- **执行方式**：{运行该测试的完整命令}
- **失败时间**：{date}
- **失败原因**：{断言错误摘要}
- **修复尝试**：{尝试了什么，为什么未修复}
- **影响**：{对使用/验证的影响}
- **来源**：code-review 阶段 8 / expert-lookup 增量更新

---

> **合并补全（2026-11-25，基线 0f1426b）**
> - **文件数**：`src/zvec-engine/` 现 16 个 .ts（旧记 14）；比旧基线多出 `scoring.ts` 与 `embedding/batch-scheduler.ts`。`git diff --name-only 8adc487..0f1426b -- src/zvec-engine` 共 14 个文件变更。
> - **新增/细化**：`scoring.ts`（RRF_FLOOR / SEMANTIC_BONUS / dynamicRatioScore / ftsWeightedRrfScore / SINGLE_SCOPE_RANKING / SEMANTIC_SIMILARITY_RANKING）、`embedding/batch-scheduler.ts`（EmbeddingSchedulerRuntime / normalizeEmbeddingScheduler / parseProviderBatchLimit / MAX_REQUEST_TIMEOUT_MS）、`search/router.ts::routeSearch` 的退化矩阵、`search/normalize.ts::normalizeVectorScore / toHit`。
> - **口径修正**：RRF 不在 `engine.search`；`search/router.ts` 只决定 hybrid/vector/fts 路由，评分公式在 `scoring.ts`，两路实际融合在 `worker.ts`（:454-644）。
> - **异常体系**：`errors.ts` 现 19 个类、`ERROR_CONSTRUCTORS` 表；`index.ts` 对外导出 13 个（旧文档写「11 种核心 + 基类 / 共 18 类」已过期）。
> - **空闲释放在外部**：`src/lib/vector-client.ts::enableIdleClose` / `closeEngine` 触发 `ZvecEngine.close()` → `ZvecEngineProxy.close/terminate` → worker `closeSync` 释放 LOCK；`engine.ts` 另有 probe 孤儿 worker `unref` 兜底。
> - **测试**：`test/zvec-engine*.test.mjs` 9 个（旧记 7）；`npm run test:zvec-engine`，前置 `npm run build:zvec-engine`；⚠️ embedding 用例需 API Key。

