# 已知单元测试失败：关系与索引管理专家

> **历史快照提示（2026-11-25 合并补全）**：本篇主体保留 2026-08 基线时的描述；文中出现的 `manage-index` / `query-group` 命令、`13 工具` / `14 文件` / `22 个文件` / 「web 内无单测」等均为**当时状态**，现已变更。当前口径以文末的「合并补全」增量章节与 `INDEX.md` 为准。


## 关系与索引管理专家（当前无已知失败）

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
> - **旧根失效**：`src/manage-index.ts` 已删除；`bin/ki.mjs` 对 manage-index / query-group 是零兼容报错分支（`process.exit(1)`）并映射到 `ki group create/delete/list` 与 `ki scope list`。`src/query-group.ts` 仍在，但只作内部库被 `src/group.ts::executeQueryGroup` 调用，不再是独立 CLI。
> - **Group CRUD 新落点**：`src/group.ts`（CLI 三子命令）、`src/index-optimize.ts`（optimizeVectorIndex 重试）、`src/lib/group-create.ts::executeGroupCreate`、`group-delete.ts::planGroupDelete / executeGroupDelete`、`group-resolve.ts::resolveGroupPath`、`group-cache.ts::writeGroupCache / loadGroupCache`。
> - **回收站与关系编辑层（旧文档完全没写）**：`trash-service.ts`（moveToTrash / restoreFromTrash / purgeExpired）、`trash-store.ts`（writeTrashItem / listTrash）、`relation-edit-{draft,live,publish}.ts`（createDraft / readLiveRelation / finishRelationEditNow）、`relation-lifecycle.ts`（precheckLifecycle / applyLifecyclePlan）、`relation-map.ts`（getRelationMap / resolveAuxHit）。
> - **口径推翻**：wiki 回写不再读 `group-index.json` 的 source 块，只认 scope 级 `config.wikiSync.sourceDir`（`src/lib/wiki-sync.ts` 文件头，2026-11-12 裁定）。
> - **测试**：`test/*group*` 10 个、`*relation*` 11 个、`*trash*` 7 个、`*scoring*` 3 个；`npm run test:all` / `test:group-create` / `test:group-delete` / `test:query-group` / `test:sync-relation`。既有红：后端 tsc 9 个基线错，events 批量 2 红与 run-tests 批量 3 红为并发污染（单跑全绿）。

