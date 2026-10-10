# Code Review Report

**Commit**: 工作区未提交改动（HEAD `9e63124`；无 commit message 可审）
**变更文件**: 12 个已跟踪文件（+687/−81）+ 3 个新增文件（`src/lib/import-retry.ts`、`test/import-partial-success.test.ts`、`test/import-retry.test.ts`）
**关联需求**: `REQ-20261009-001《导入部分成功可用、失败重试与导入页交互修复》`（匹配依据：变更语义 ↔ 需求标题 + 需求 §11 落地记录自述 🟡）
**整体评分**: **C**（存在 1 个未修复 P0，按规则最高 C）
**证据等级**: 静态代码直读为主；测试为**实跑**（`test/import-partial-success.test.ts` 4/4、`test/import-retry.test.ts` 2/2，本次复跑）；前端 R3/R2 冲突为静态路径推演（未跑浏览器）

---

## 🎯 功能意图推测（阶段 3）

**🌍 全局图景**：业务目标 = 让「embedding 中途挂掉」不再毁掉已成功导入的文档，并给出「只重试未完成」的入口；系统位置 = `ki import` CLI / `POST /api/import/run` → `handleDirectImport`（三端同源）→ 文件级提交边界 + `<scope>/.ki-import-incomplete.json` 清单；整体成功判据 =（a）已完成文件在文档列表/检索/query-group 全可见且向量未被删；（b）未完成文件不产生半截文档；（c）重试只跑未完成部分、无 `_1` 副本、已完成 `memoryId` 不变；（d）CLI 与 Web 同口径。

| 代码位置 | 推测的功能意图 | 确认状态 | 置信度 |
|----------|---------------|----------|--------|
| `src/lib/import.ts` `handleDirectImportUnlocked`（文件级失败判定 + 停止改提交 + 清单落盘） | 系统性向量故障不再整批连坐，按文件提交已完成部分并登记未完成 | ⏩ 未确认（用户未在本次会话陈述意图；以需求文档 §9.1 Q1/Q2 与 §11 为基准） | 🟢 |
| `src/import.ts` `program.action`（`--retry-incomplete`） | 无清单/清单空/源目录消失时 fail-loud；有清单时只跑清单内文件并沿用原批次参数 | ⏩ 未确认 | 🟢 |
| `src/lib/mcp-http-api.ts` `handleImportRun`（`onlyRelPaths`） | 子集重试不复用已终态 job、参数回落到清单、非法输入 400 | ⏩ 未确认 | 🟢 |
| `web/src/pages/ImportPage.tsx`（R2 重试入口 + R3 切页清空） | 部分成功时给「重试未完成 N 篇」；切页回来清掉本批暂存 | ⏩ 未确认 | 🟡（R3 与 R2 的边界在需求中未定义 → 见 M1） |
| `web/src/components/ScopePathSelect.tsx`（R4 失焦/按钮确认） | 新建 Scope 不再只能靠回车 | ⏩ 未确认 | 🟢 |

### 🕸 影响链文字树（R1 提交语义变更）

```text
{变更点：src/lib/import.ts:994-1014 · 系统停止不再把全批标失败，改用文件级判定}
  ├─ 已完成文件（行为变化：元数据/原文/向量提交，可浏览可检索）← 目标达成
  ├─ 未完成文件（行为变化：回滚其本批新向量 + 不写元数据 + 进清单）
  ├─ 未完成清单落盘 src/lib/import.ts:1594（新增数据流：跨进程可重试）
  │    ├─ CLI --retry-incomplete（src/import.ts:57-70）← 已接
  │    └─ HTTP onlyRelPaths（src/lib/mcp-http-api.ts:1215-1227）← 已接
  │         └─ Web「重试未完成 N 篇」（ImportPage.tsx:1128-1180）← 已接，但被 R3 清空逻辑销毁（见 M1）
  ├─ daemon 任务台账（daemon-rpc.ts:102-103 / 486-505）← 状态错位（见 M3）
  └─ 辅助向量阶段停止路径（src/lib/import.ts:1290-1349）← 仍整批回滚（见 M2）
```

---

## 📊 维度评分概览

| 维度 | 评分 | 状态 |
| ---- | ---- | ---- |
| 🔑 语义一致性 | 6/10 | ❌ |
| ⚠️ 安全性 | 8/10 | ✅ |
| 🐛 Bug 风险 | 6/10 | ❌ |
| 📐 代码规范 | 7/10 | ⚠️ |
| 🏗️ 架构设计 | 7/10 | ⚠️ |
| ⚡ 性能 | 8/10 | ✅ |
| 🧪 测试覆盖 | 7/10 | ⚠️ |

---

## 🔑 语义一致性分析（最高优先级）

**[M1] R3「切页清空」销毁 R2「重试未完成」入口（P0）**

- 📍 涉及：`web/src/pages/ImportPage.tsx:474-494` ↔ `:1128-1180`、`:649-652`、`:580-584`
- 💻 实际做：部分成功后 `phase='done'` 且 `result.partial=true`。轮询分支特意**保留** localStorage 凭据（`:649-652`，刷新后可恢复重试入口）；但 R3 新增的 effect 在「离开 `/import` 再回来」时，只要 `phase==='done'` 就执行清空——`clearImportCredentialIf({uploadId, jobId})`（`:482`）删掉凭据、`setJob(null)`（`:491`）丢结果，于是 `incompleteItems`（来源于 `job.result.incomplete`）与 `readImportCredential()?.uploadId` 双双消失。
- 🔍 推演分析：R3（Q3 拍板「只清 UI 暂存」）与 R2 验收 ④「重试可跨页面进行（切 tab 不中断）」在同一状态上冲突，实现无条件站了 R3 一侧。用户真实路径：导入 50 篇 → embedding 挂 → 40 篇成功、看到「重试未完成 10 篇」→ 切去看已导入的文档 → 切回导入页 → 入口没了，只能重新上传整批（暂存目录 `~/.ki/import-uploads/<uploadId>` 成为无引用孤儿）。副作用不对称：**刷新页面反而能恢复入口**（`:580-584` 保留 partial 凭据），只有"切 tab"这条最常见的路径被摧毁。
- 💡 建议方向：① 清空条件排除「有未完成清单的部分成功态」——`if (result?.partial) { 只清文件选择/上传统计/错误卡，保留 job 与凭据 }`；或 ② 把重试入口按需求 §9.3 迁移到任务中心（任务已持久化），导入页清空不再影响它。①成本低、与 R3 验收 ② 的"错误卡清空"精神一致（清单属"待处置项"而非"暂存"）。

**[M2] 辅助向量阶段自身停止仍整批回滚，且回滚发生在清单落盘之前（P1）**

- 📍 涉及：`src/lib/import.ts:1290-1349`（`pathResult.stopReason` 分支的补偿删除 + `throw makeVectorizationStopError`）↔ `:1594`（清单落盘）
- 💻 实际做：正文向量化成功、`systemStopReason` 为空时才会进入 `bulkStorePaths`；但**path/tag 阶段自身**故障走原分支：删除本批已提交的正文向量 + 抛 `VECTORIZATION_STOPPED`，位置在清单写入之前，因此也不产生未完成清单。
- 🔍 推演分析：这正是 R1 要消灭的现象（"已向量化成功的部分文档也一起不可用"），只是触发点从正文阶段挪到了辅助阶段。需求 §11.3 已登记为残留 #9「建议独立排期」，但**未声明它对 R1 承诺的破坏程度**：用户视角与修复前完全一致（文档消失、无清单、只能整批重跑重算 embedding）。同时 `test/import-vector-rebuild.test.ts:319` 仍以断言锁定这条旧语义（:341 断言 `VECTORIZATION_STOPPED`、:352-358 断言整批回滚），未来改动会被误判为回归。
- 💡 建议方向：至少二选一并写进 docs：① 该路径改为同样的「提交已完成 + 清单」语义（把 `throw` 换成 `stopReport`）；② 若确要留作独立排期，在 `docs/import.md` 明确「辅助向量阶段故障仍全批回滚」并给测试加注释说明这是待改口径，避免被当成期望行为。

**[M3] `cancelled: true` 语义超载 → daemon 任务台账把"取消但已提交"记为 cancelled（P1）**

- 📍 涉及：`src/lib/import.ts:1636`（`...(cancelRequested ? { cancelled: true } : {})`）↔ `src/lib/daemon-rpc.ts:102-103`（`classifyJobState`：`if (cancelled) return 'cancelled'`）与 `:486-488`（`cancelled = job.cancelRequested || value?.cancelled === true || ...`）
- 💻 实际做：D2 之后取消 = `ok:true + partial + cancelled:true`。daemon 侧把该结果判为 `cancelled`（优先级高于 `partial`），`taskReporter.finish('cancelled')`，且 `partialCommitted` 记账分支（`:503-504`）因 taskState 不是 partial/succeeded 而落空。CLI 直连（`src/import.ts:188-206`）与 HTTP（`mcp-http-api.ts:1327-1346`）都把同一结果呈现为 `partial`。
- 🔍 推演分析：同一个 `cancelled` 字段历史上表达"任务被取消、未提交"，现在同时表达"被取消但已提交部分"，消费方（daemon 状态机）无法区分 → Q2「CLI 与 Web 同口径」在任务台账维度不成立：同一次取消，导入页显示「部分成功（完成 40 / 未完成 10）」+ 重试入口，任务中心显示「已取消」且无 `partialCommitted`。
- 💡 建议方向：`classifyJobState` 先判 `value.ok === true && value.partial === true → 'partial'`，再判 cancelled；或新增独立字段（如 `submittedAfterCancel: true`）而不复用 `cancelled`。

**[M4] 未完成清单是 scope 级单文件，跨批次互相覆盖/被误清（P1）**

- 📍 涉及：`src/lib/import-retry.ts:22`（`.ki-import-incomplete.json` 单文件）、`src/lib/import.ts:1594`（写）、`:1605`（`clearImportIncomplete`）
- 💻 实际做：`if (failedRecords.size > 0) writeImportIncomplete(...) else clearImportIncomplete(scope)` —— **无条件**覆盖/清除，不比对来源。场景：先导 A 目录部分成功（清单记 A 的 20 篇）→ 再导 B 目录且全部成功 → A 的清单被删除；若 B 也部分成功 → A 的清单被覆盖。此后 `ki import --retry-incomplete` 报「没有待重试的未完成清单」，用户以为已无待办。
- 🔍 推演分析：清单被文档定性为"不承载不可再生数据（可由重跑重建）"，但"重建"依赖用户还记得哪批没导完——这正是清单要解决的问题。属静默丢弃（0.9 异常路径静默丢数据的最低 ⚠️ 不得放行），且与需求 R1「未完成部分单独记账」的承诺冲突。
- 💡 建议方向（择一）：① 按 `sourceDir` 分键（`<scope>/.ki-import-incomplete.<hash>.json`）并在 `--retry-incomplete` 多清单时列出让用户选；② 保持单文件但写入/清除前比对 `sourceDir`：不同源且旧清单非空时**保留旧清单并 stderr 警告**（fail-loud，最低成本）。

---

## 🔴 严重问题（必须修复）

### P0-1｜切页销毁「重试未完成」入口
- 位置：`web/src/pages/ImportPage.tsx:479-494`
- 代码：`if (phase !== 'idle' && phase !== 'done' && phase !== 'failed') return;` → `clearImportCredentialIf(...)` → `setJob(null)` → `setPhase('idle')`
- 问题：部分成功（`phase='done'` + `partial`）被判为可清空的终态，凭据与结果一并清除，R2 的重试入口与其依赖的 `uploadId` 同时失效（详见 M1）。
- 修复建议：清空前判 `if (job?.result?.partial) { 仅清 selections/uploadStats/uploadErrors/error/failureStage/progressText/scopeDraft，保留 job 与凭据 }`。
- 关联语义：`#M1`

---

## 🟡 建议改进（推荐修复）

### P1-1｜辅助向量阶段停止仍整批回滚且无清单（`src/lib/import.ts:1290-1349`）
详见 M2。至少补文档声明 + 测试注释；理想是与 R1 同语义。

### P1-2｜daemon 任务台账把"取消但已提交"记为 cancelled（`src/lib/daemon-rpc.ts:102-103`、`:486-505`）
详见 M3。修 `classifyJobState` 优先级即可，附带恢复 `partialCommitted` 记账。

### P1-3｜清单跨批次覆盖/误清（`src/lib/import.ts:1594-1605`、`src/lib/import-retry.ts:22`）
详见 M4。

### P1-4｜CLI 重试路径未做路径净化，与 HTTP 端防护不对称（`src/import.ts:283-289` + `src/lib/import.ts:698-700`）
HTTP 端对 `onlyRelPaths` 做了 `..`/绝对路径过滤并 fail-loud（`mcp-http-api.ts:1215-1222`）；CLI 端把清单里的 `item.path` 直接交给 `path.resolve(sourceDir, rel)` 读取。清单损坏/被手工编辑时可读源目录之外的任意 Markdown 并入导入。本地工具、低危，但两端不一致。
建议：CLI 侧复用同一过滤（`!path.isAbsolute(rel) && !rel.split(/[\\/]/).includes('..')`），非法条目归入 `retryFilter.missing` 并告警。

### P1-5｜FTS-only 模式下文件级完成度不反映 FTS 写失败（`src/lib/import.ts:1010-1014`、`:1623-1630`）
`failedRecords` 唯一填充点带 `if (vector && ...)`，`--no-vector` 时恒空 → `partial:false`、`files.incomplete:0`、不落清单；FTS 写失败只进 `stats.errors`（`:1172`、`:1554`）。用户用 FTS-only 导入时拿不到"未完成清单 + 重试入口"，与 R1 承诺口径不一致（只对 dense 向量成立）。
建议：文档明确「部分成功语义仅适用于向量模式」，或把 FTS 写失败的关系也纳入 `files.incomplete`。

### P2-1｜清单读写的静默失败（`src/lib/import-retry.ts:57-68`、`:70-76`）
`writeImportIncomplete` 吞掉所有异常，但注释写「调用方另有 stderr 告警」——调用方 `src/lib/import.ts:1594` **没有任何告警**（注释与实现不符）。`readImportIncomplete` 对损坏清单也静默返回 `null`，CLI 于是报「没有待重试的未完成清单」（实际是损坏，误导）。
建议：写失败 stderr 提示「未完成清单写入失败，本次未完成文件无法用 --retry-incomplete 找回」；读失败区分「不存在」与「存在但损坏」并告警。

### P2-2｜冗余语句（`src/lib/import.ts:1289`）
`if (vector && cancelRequested) noteCancel();` —— `noteCancel` 只做 `if (aborted) cancelRequested = true`，执行到此处 `cancelRequested` 已为 true 时该调用无任何效果；上一行（`:1266` 附近）已调用过。建议删除，避免读者以为这里有额外语义。

### P2-3｜取消成功后前端仍显示"已请求取消"（`web/src/pages/ImportPage.tsx:1623-1635`）
`cancelState` 只有 `idle/pending/requested/failed`，任务终态（done + partial）后不复位，取消提示与"部分成功"结果同屏并存。
建议：`phase === 'done' || phase === 'failed'` 时复位 `cancelState='idle'`，或按 `cancelled` 字段改文案为「已取消后面的文件，已完成部分已提交」。

### P2-4｜统计口径无法与扫描数对齐（`src/lib/import.ts:1617`、`:1623-1627`）
`stats.skipped` 混入 `failedRecords.size`（跳过与未完成同计），`files` 三元组无 `scanned`/`skipped`，`logSummary` 打的 `files=${files.length}`（`:1555`）在重试模式下是全量白名单而非本轮子集。
建议：`files` 增 `scanned`（或把 `skipped` 从 `stats.skipped` 拆出），至少让「扫描 N = 完成 X + 未完成 Y + 跳过 Z」可自洽核算。

### P2-5｜HTTP `onlyRelPaths` 无数组长度上限（`src/lib/mcp-http-api.ts:1215-1222`）
单项有 4096 上限与穿越过滤，但未限制条数（本地 loopback 服务，低危）。
建议：加 `slice(0, 50000)` 或超限 400。

### P2-6｜`retryFilter.matched` 口径与文档措辞不符（`src/lib/import.ts:713-716`、`docs/import.md:171`）
`matched = effectiveFiles.length`（清单 ∩ 扫描结果，含随后因过大/冲突/超限被 `skip` 的文件），文档称"本轮实际处理数"。
建议：改文档措辞为"本轮纳入处理的条数（可能随后被跳过）"，或把 skipped 后的数量单列。

### P2-7｜开发配置搭车变更（`web/vite.config.ts:6-10`）
`API_TARGET` 由 7433（本工作区隔离实例，见 AGENTS.md「开发模式启动方式」）改为 7423（真实 dataDir 常驻实例）。与本次导入需求无关，属 0.10 搭车变更：裸跑 `vite dev` 会直连真实数据，且提交后改变团队开发默认。
建议：从本提交中剔除或独立提交，仅本地保留。

---

## 🟢 亮点

1. **改动落在正确的抽象层**：R1 不是新增机制，而是复用既有的文件级失败判定（`:1010-1014`）与 `activeFileRecords` 通路，把"系统停止"从全批连坐改为逐文件判定；零完成仍 fail-loud（`:1154-1159`）守住了"不假成功"。
2. **三端同源且参数透传无丢失**：CLI 直连 / daemon RPC / HTTP 都调同一个 `handleDirectImport`；daemon 侧是整对象展开（`daemon-dispatch.ts:107`）而非逐字段白名单，新增 `onlyRelPaths` 自动随行（本次已核对，无静默降级）。
3. **安全与失败路径有意识**：HTTP `onlyRelPaths` 做了绝对路径/`..` 过滤，且"声明了但全被过滤掉"时 400 fail-loud（`:1220-1222`），避免静默落回复用旧 job 的歧义分支；子集重试不复用已终态 job。
4. **幂等约束被测试锁死**：`test/import-retry.test.ts:131-139` 断言"提交给向量化的 chunk 集合恰为 b/c"、"a 的 memoryId 不变"、"无 `_1` 后缀"——正是需求验收 ③ 的三条硬指标，比只断言数量更有价值。
5. **文档与代码同批更新**：`docs/cli.md` / `docs/import.md` / `docs/error-handling.md` 同步了退出码语义变化、清单路径与 3 条新错误引导。
6. **部分成功时特意保留凭据**（`ImportPage.tsx:649-652`、`:580-584`），使刷新后重试入口仍在——方向正确（只是被 R3 削弱，见 P0-1）。

---

## 🧪 测试验证（阶段 8）

| # | 来源 | 验证内容 | 结果 |
|---|------|----------|------|
| 1 | 维度 6 | 复跑 `test/import-partial-success.test.ts` | ✅ 实跑 4/4 通过（R1 提交/回滚/零完成 fail-loud/取消同语义） |
| 2 | 维度 6 | 复跑 `test/import-retry.test.ts` | ✅ 实跑 2/2 通过（子集重试、幂等、清单清空、全缺失 fail-loud） |
| 3 | 维度 0.6 | 前端 R3 与 R2 交互（切页后重试入口是否仍在） | ⏸ 未跑浏览器；静态路径确定（`ImportPage.tsx:479-494`），建议按 P0-1 修复后补一条 UI 回归（现有 `temp/verify-r2-retry-ui.mjs`、`temp/verify-r345-ui.mjs` 均未覆盖"部分成功后切页"这一交叉场景） |
| 4 | 维度 0.9 | 清单跨批次覆盖/误清 | ⏸ 静态确定（`import.ts:1594-1605`）；建议补一例：导入 A 部分成功 → 导入 B 全成功 → 断言 A 的清单是否被吞（按 P1-3 结论作期望） |
| 5 | 维度 2 | daemon 取消状态映射 | ⏸ 静态确定（`daemon-rpc.ts:102-103`）；建议补 `daemon-rpc` 层单例：`{ok:true, partial:true, cancelled:true}` → 期望 `partial` |

**未覆盖即风险**（子代理核查结论）：CLI `--retry-incomplete` / HTTP `onlyRelPaths` 无端到端测试；FTS-only 部分成功无测试；辅助向量阶段停止仍只锁定旧语义（`import-vector-rebuild.test.ts:319`）；清单损坏/版本/覆盖场景无测试。

---

## 📝 总结与行动项

**🎯 合入结论**：**⚠️ 修复 P0 后可合入**（回扣全局成功判据：（a）(b)(c) 已达成并有实测；（d）在"取消"与"任务台账"维度不成立；（a）在辅助向量阶段故障路径上不成立）

**💥 缺陷 → 功能影响翻译**

| 缺陷 | 预期功能行为 | 实际功能行为 | 功能影响 |
|------|--------------|--------------|----------|
| `#M1` P0-1 | 部分成功后切页再回来，仍能看到「重试未完成 10 篇」并一键重试（只跑未完成的） | 切页回来暂存被清、凭据被删，重试入口消失，只能重新上传整批 | 🔴 需求 R2 的核心入口在最常见的"切 tab"后失效，未完成文件仍需整批重做（含已完成文件的重复上传） |
| `#M2` P1-1 | 任何"向量化中途挂掉"的场景都保住已成功文档 | 若故障发生在关系/路径辅助向量阶段，已成功的正文向量被删除、无清单、重跑重算 embedding | 🔴 用户感知与修复前完全相同（"文档又没了"），R1 承诺存在开口 |
| `#M3` P1-2 | 取消后 Web 显示"部分成功（完成 40/未完成 10）"，任务中心同口径 | 导入页显示部分成功，任务中心把同一次取消显示为"已取消"，且不记 `partialCommitted` | 🟡 同一事件两处结论不一致，用户无法判断到底导进去没有 |
| `#M4` P1-3 | 每批未完成项都留痕，事后可重试 | 后一批（全成功或部分成功）会删掉/覆盖前一批的清单 | 🟡 前一批的未完成文件静默失去重试入口，需要用户自己记得 |

**🚧 合入前必须完成（P0）**

| # | 行动项 | 对应功能影响 |
| -- | ------ | ------------ |
| 1 | 修 `ImportPage.tsx:479-494`：部分成功态不清 job 与凭据（只清本批选择/统计/错误卡），并补一条"部分成功 → 切页 → 切回 → 重试入口仍在"的 UI 回归 | `#M1` |

**📌 合入后跟进（P1/P2）**

| 优先级 | 行动项 |
| ------ | ------ |
| P1 | 决定辅助向量阶段停止的语义（改提交 or 文档声明）并处理 `import-vector-rebuild.test.ts:319` 的旧语义锁定（`#M2`） |
| P1 | `classifyJobState` 让 `ok+partial` 优先于 `cancelled`；恢复 `partialCommitted` 记账（`#M3`） |
| P1 | 清单加 sourceDir 维度或覆盖/清除前比对 + 告警（`#M4`） |
| P1 | CLI 重试路径净化，与 HTTP 对齐 |
| P1 | FTS-only 口径写进文档（或纳入 incomplete） |
| P2 | 清单读写失败的 fail-loud（并修正与注释不符之处）；删冗余 `noteCancel`（`import.ts:1289`）；取消提示终态复位；`files` 增 `scanned/skipped`；`onlyRelPaths` 限长；`matched` 措辞；`vite.config.ts` 移出本提交 |

**合入后需同步的知识资产**：`docs/import.md`（若采纳 P1 建议需补"辅助阶段"与"FTS-only"两节口径）；项目记忆 ki `kisearch-memory` 的「知识索引导入」专题（退出码语义变化 + `.ki-import-incomplete.json` + `cancelled` 字段新含义），建议合入时一并登记。

---

## 🧨 阶段 7：challenger 接力与过滤评审

> 依据 auto-review Step 6（复杂场景 → 自动质疑）。质疑报告：`review/challenge-report.md`（8 条成立质疑，另反证 5 条）。

### 接力后对本报告的补充与修正

| # | 性质 | 内容 |
|---|------|------|
| 修正 1 | **P0-1 影响面扩大** | 除"部分成功后切页 → 重试入口消失"外，**在途任务在用户切页期间于后台完成**（轮询把 `phase` 推向 `done`）也会命中同一清空分支：用户切回时连结果摘要都看不到。触发条件相同（`ImportPage.tsx:479-494`）。 |
| 修正 2 | **P1-1 需拆为两种形态** | ① **tag 阶段**（`src/lib/import.ts:1056`、`:1074`）：不抛错，但 `for (const rec of fileRecords) failedRecords.add(rec)` → **全批进未完成清单、零提交**（已成功的正文向量被回滚删除）；② **path 阶段**（`:1341`）：抛 `VECTORIZATION_STOPPED` + 整批回滚 + **无清单**（位置早于 `:1594`）。两者都是 R1 承诺的开口，①更隐蔽（仅在使用 `--tags` 时触发）。 |
| 新增 P1-6 | **Web 端不展示 `retryFilter.missing`** | `startRetry`（`ImportPage.tsx:1128-1180`）只发 `onlyRelPaths`、不读 `result.retryFilter`；清单内已被删除/改名的文件在 UI 无任何说明，且永久留在清单里——负向需求 N3 的"说明原因"只在 CLI 落地（服务端仅 `logWarn`，`import.ts:684-690`）。 |

### 质疑点过滤评审（按 auto-review Step 7）

| 质疑 | 层面 | 过滤判定 |
|------|------|----------|
| #1 tag 阶段全批连坐 | 代码层面（业务特有约定：文件级完成判定） | **保留**——缺明确约定时实现者会继续按"整批"处理，且直接违反 Q1 拍板口径 |
| #2 R3 清空影响面 | 非代码层面（交互流程/需求边界） | 一律不过滤 → 保留 |
| #3 `retryFilter.missing` 断链 | 非代码层面（交互流程 + 负向需求） | 保留 |
| #4 清单跨批次覆盖 | 非代码层面（数据模型：scope 级单文件 vs 批次维度） | 保留 |
| #5 daemon 状态口径 | 非代码层面（对外契约/状态机语义） | 保留 |
| #6 清单读写静默 | 代码层面（异常处理） | **保留**——fail-loud 是本项目显式约定，且注释已声称有告警（实现与声明不符） |
| #7 vite 配置 | 非代码层面（开发约定） | 保留 |
| #8 组合极端文案 | 代码层面（文案/UX 细节） | 💤 可延后：AI 编码时通常会自行收敛文案，可在实现阶段关注 |

### 结论一致性（质疑回写）

challenger 的 2 条 🔴 中，#2（R3 清空）与本报告 P0-1 同源（已定 P0）；#1（tag 阶段全批连坐）为等价级新发现，**提升为合入前必须完成**：

| # | 行动项（新增 P0） | 对应功能影响 |
| -- | ------ | ------------ |
| 2 | 修 `src/lib/import.ts:1056`、`:1074`：tag 阶段故障改为文件级判定；或在 `docs/import.md` 显式声明该路径仍全批回滚并把 `import-vector-rebuild.test.ts` 的断言改成显式期望 | 使用 `--tags` 的批次在 tag 阶段故障时，已成功文档全部被删、重试需重算全部 embedding（挑战 #1） |

**合入结论维持**：⚠️ 修复 P0（`#M1` 与 tag 阶段）后可合入。

---

## 🔧 P0-1 修复记录（方案 A，2026-10-09）

**改动**：`web/src/pages/ImportPage.tsx:476-521`（R3 清空 effect）——清空前判 `job.result.partial` 或 `incomplete` 非空，命中则走「待处置结果」分支：保留 `job` / localStorage 凭据 / `uploadPlanRef`（原批次参数）/ `uploadErrors` 与 `phase`，只清本批暂存（`selections`、`uploadStats`、`failedUploadBatch`、`progressText`、`scopeDraft`；`phase !== 'failed'` 时清 `error`/`failureStage`）。依赖数组补 `job?.result`，由 `wasOn` 守卫保证非切页渲染时不会触发。全成功 / 无未完成清单时维持原清空语义（R3 不变）。

**实测（实跑，playwright chromium headless @127.0.0.1:5173；三条 `/api/import/*` 路由被拦截，未发起真实上传/导入）**：`temp/verify-r3-partial-keep.mjs` **16/16**

| 组 | 覆盖 | 结果 |
|----|------|------|
| A（7 项） | partial 态切页 `/tasks` → 切回 `/import`：徽标、结果摘要、「重试未完成 2 篇」仍在；凭据保留；**切页后点重试仍复用同一 `uploadId` 且 `onlyRelPaths=[b.md,c.md]`** | ✅ |
| B（4 项） | 全成功态切回：仍按 R3 清空（回到「等待开始」、凭据删除、结果摘要消失） | ✅ |
| C（4 项，覆盖本报告「修正 1」） | 任务在**切页期间后台完成**为 partial → 切回仍保留结果与重试入口 | ✅ |

**回归**：web `npm test` 58/58；`npm run build`（`tsc --noEmit` + vite build）通过。

**结论更新**：P0-1 已修复并实测 → 合入结论由「修复 P0（`#M1` 与 tag 阶段）」收敛为 **⚠️ 修复 P0-2（tag 阶段全批连坐）后可合入**；P1/P2 按前表跟进（其中 P1-6 `retryFilter.missing` 展示与「partial + 上传失败文件」的提示区分同属 Web 结果区文案，可一并处理）。

---

## 🔧 第二批修复记录（P0-2 + 全部 P1/P2，2026-10-09）

> 用户指示「其他的也顺便一起修复」。本批含**行为变更**（辅助向量语义、清单跨源、统计字段），合入时建议在提交信息中显式标注。

### 已修复清单与证据

| 编号 | 问题 | 修复 | 证据 |
|------|------|------|------|
| P0-2 | tag 阶段全批连坐 | `src/lib/import.ts`：tag 向量失败改为**辅助向量降级**——不标文件未完成、不回滚正文，只记 `errors[]`（含 `<tags>` 汇总），正文照常提交 | `test/import-auxiliary-degrade.test.ts` 用例 1（元数据/原文/向量提交、`partial:false`、未回滚） |
| P1-1 | path 阶段停止整批回滚 + 抛错 + 无清单 | 同文件：删除回滚块与 `throw`，改为「未写入的 `ki-relation` 登记 `failedRelationPathTexts` 保护旧索引 + `<ki-path/ki-relation>` 汇总 error」 | `test/import-vector-rebuild.test.ts:319` 用例改写为降级断言；该套件 15/15 |
| P1-2 | daemon 把 `ok+partial+cancelled` 判为 cancelled | `daemon-rpc.ts`：`classifyJobState` 先判 `ok && partial → 'partial'`；`partialCommitted` 记账补 `stats.vectorized` | `daemon-rpc-stream`/`daemon-concurrency`/`mcp-daemon` 通过；**该分支无专门断言** |
| P1-3 | 清单跨批次覆盖/误清 | `import-retry.ts` 新增 `backupImportIncomplete` + `readImportIncompleteStatus`；`import.ts` 写/清前比对 `sourceDir`，跨源先备份 `.ki-import-incomplete.prev.json` + 告警 | 新测试用例 3（A 部分成功 → B 全成功 → prev 保留 A 的清单） |
| P1-4 | CLI 重试路径未净化 | 核心层 `sanitizeRelPath`（绝对路径 / `..` / 空 / 超长一律拒绝）→ 入 `retryFilter.invalid`；全非法 fail-loud | 新测试用例 2 + HTTP 原校验 |
| P1-5 | FTS-only 口径不清 | `docs/import.md` 新增口径（FTS 失败只进 `errors`，不产生 partial/清单） | 文档 |
| P1-6 | Web 不展示 `retryFilter.missing` | `ImportPage.tsx` 结果区展示「命中 N / 找不到 M / 非法 K」 | 浏览器 A9/A10 |
| P2-1 | 清单读写静默 | 写失败 `logWarn` + 返回布尔；`readImportIncompleteStatus` 区分 `corrupted`；CLI/HTTP 对损坏 fail-loud 并给路 | `import-retry`/`import-auxiliary-degrade` 通过 |
| P2-2 | 冗余 `noteCancel` | 删除 `import.ts` 中无效果调用 | tsc |
| P2-3 | 取消提示不复位 | `ImportPage.tsx` 新增终态复位 effect | 前端 58/58 + build |
| P2-4 | `files` 无法核算 | 增 `scanned`/`skipped`（`completed+incomplete+skipped=scanned`），Web 展示文件级账目 | 5 处测试断言同步 + 浏览器 A8 |
| P2-5 | `onlyRelPaths` 无上限 | HTTP 侧 `> 50000` → 400 | — |
| P2-6 | `matched` 措辞 | `docs/import.md` 改为"源目录命中并纳入本轮处理的条数" | 文档 |
| P2-7 | `vite.config.ts` 搭车默认值 | 恢复 `7433`（AGENTS.md 开发约定）+ `KI_API_TARGET` 环境变量覆盖 | 需重启 dev server 生效 |
| 🟡R3 | 保留 plan 的 File 引用 | 部分成功分支只保留 `{...plan, selectionSnapshot: [], batches: []}` | 浏览器 A 组 |
| 🟡R4 | 上传失败文件与未完成清单混淆 | 上传错误卡补文案区分二者 | 前端 |
| 追加 | 辅助向量降级时 CLI 静默 | `src/import.ts`：`stopReason && !partial` 时打印「ℹ️ 辅助向量未完成…可 rebuild-vector 重建」 | tsc |

### 验证汇总（均实跑）

- 后端：`import-auxiliary-degrade` 3/3（新）、`import-retry` 2/2、`import-partial-success` 4/4、`import-vector-rebuild` 15/15、`import-scheme-d` 19/19、`import-assets` 26/26、`import-budget` 13/13、`import-conflict` 4/4、`import-export` 1/1、`import-interrupt-convergence` 2/2、`mcp-http-api` 38/38、`daemon-rpc-stream` 1/1、`daemon-concurrency` 10/10、`mcp-daemon` 15/15、`interrupt` 5/5、`cli-help` 45/45
- `npx tsc -p tsconfig.json --noEmit`：相对基线新增 0（仅既有 `import-budget.ts:78`、`mcp-http.ts:571`）
- 前端：`npm test` 58/58、`npm run build` 通过
- 浏览器：`temp/verify-r3-partial-keep.mjs` **19/19**（含 retryFilter 展示、文件级账目、切页保留、后台完成、全成功清空）

**结论更新**：**✅ 可直接合入**（2 个 P0、5 个 P1、7 个 P2 与 2 条质疑 🟡 全部处理）。

**仍留白（不阻塞）**：① daemon `classifyJobState` 的 `ok+partial+cancelled → partial` 无专门断言（靠集成套件回归）；② `import-interrupt-convergence` 的 SIGKILL 未命中路径沿用既有计法（不在本次范围）。
