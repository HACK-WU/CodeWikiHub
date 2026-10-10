<!-- 执行台账【快照副本】
     源文件：.plans/2026-10-10-indexing-stage-two-tier/plan.md
     快照时间：2026-10-10
     ★ 执行中的最新状态以**源文件**为准（AGENTS.md「近期工作」有指针）；本副本用于
       需求文档目录内可追溯查看进度、完成判据与「未完成清单（跨需求）」。
-->

---
task: REQ-20261009-003 剩余主体：索引整理阶段（optimize 接入）与两级完成口径
status: 进行中
created: 2026-10-10
updated: 2026-10-10
related: REQ-20261009-003（R4/R6/R2/R1/R5；R9 待 Q6 拍板）；输入包 CodeWikiHub/kisearch/requirements/2026-10-09-导入完成口径与索引整理阶段/design/design-input.md；上一阶段 .plans/2026-10-10-engine-quiescence-phase2（已完成，其护栏 #6 要求 R4/R6/R2/R1 先经设计）
---

# 执行计划：索引整理阶段与两级完成口径

## 目标

让"导入完成"对用户**诚实且可见**：导入收尾**异步**触发一次受限并发的索引整理（`optimize({concurrency})`，不用 `optimizeSync()`），任务在四端（CLI / HTTP / 任务中心 / 导入页）显示同一阶段（`…→ 索引整理中 →`）与两级终态（**可用** / **已优化**）；整理期间文档照常可读可检索，失败/超时一律降级为「可用」并可重试。

## 完成判据

- [ ] 设计文档落盘（`design-craft`），其评审问题清零；含：optimize 接线点与失败路径、全局串行口径、`indexing` 阶段状态机、四端口径、配置项、A11 判据落法
- [ ] 引擎侧 `optimize({concurrency:N})` 可被调用（`src/zvec-engine` 三处扩展 + `npm run build:zvec-engine` 重建 dist），实测返回且并发参数生效
- [ ] 导入收尾**异步**触发整理：不推迟「可用」（元数据提交后文档立即可读）；失败注入下任务仍成功 + 有提示 + 有可重试入口
- [ ] 多 scope 同时导入时，索引整理**全局串行 ≤1**
- [ ] 四端（CLI / HTTP / 任务中心 / 导入页）同一时刻显示同一阶段与同一终态
- [ ] 整理期同 scope 检索不报错（可慢）且有明确提示；其他 scope 不受影响
- [ ] `indexCompleteness` 接出到任务 / 任务中心，且判据按 A11 交叉口径（索引实体 + 重开校验），不得出现"实体已落盘而信号为 0 被判成未建"
- [ ] 回归：`tsc --noEmit` 相对基线新增 0；相关测试套件全绿；REQ-20261009-001 的 `partial` / `retryFilter` / 未完成清单语义不回归
- [ ] `checklist.md` 逐条回填，P0 未通过 = 0

## 注意事项（执行护栏）

| # | 注意事项 | 来源 | 违反后果 |
|---|----------|------|----------|
| 1 | 索引整理一律 `await optimize({concurrency:N})`（**夜/异步**），**禁止** `optimizeSync()` 与"进程级 init 代替" | Q2 已拍板 + 实验 1（optimizeSync 阻塞 worker、多核暴涨；233ms 的 optimize 期间 `info()` 延迟 212ms） | P0：导入自身"假死"、CPU 暴涨 |
| 2 | 整理**不得推迟「可用」**：元数据提交完成后文档必须立即可读可编辑（R3 语义不得回退） | R1/R3 + S-01 已落地语义 | P0：回退到"导入完页面打不开" |
| 3 | 整理失败 / 超时一律**降级为「可用」**：不得判导入失败、不得丢数据、不得触发重建/清库引导 | R4 + N4/N8/N9 | P0：任务状态错判 + 误伤数据 |
| 4 | 多 scope 并发整理上限 = **1（全局串行）** | Q4 已拍板 + N6 | P0：多 scope CPU 竞争（现场已观测单核 100% 持续 ~11 分钟） |
| 5 | 不得回归 REQ-20261009-001 的对外语义（`partial` / `retryFilter` / 未完成清单 / 退出码） | A8 回归红线 | P0：破坏已交付契约 |
| 6 | 改 `src/zvec-engine/*` 后**必须** `npm run build:zvec-engine` 重建 dist（worker 只加载编译产物） | 已知坑（ki 强关联「向量引擎-向量客户端」） | P0：改了不生效（假更新） |
| 7 | 不得改动 R8 已落地语义：超时仍须**包在 coordinator handler 内部**、返回 `degraded{reason,waitedMs}` + 服务端日志 | 需求 R8 实现约束 + auto-review 结论 | P0：`submit` 不 resolve → 队列槽再次被占死 |
| 8 | 任何"元数据修改"路径必须保证**单向良性滞后**：`分片（列表）可见 ⇒ KB（详情）可取`——新增/更新 = KB 先写、分片后写；**删除 = 分片先落、KB 后删**；且**不得把引擎 I/O 夹在两次元数据写之间** | 本次 H2 验证（2026-10-10：`temp/verify-h2-delete-window.ts` 实测 + `delete-relation.ts:159→:201` 代码直读） | P0：并发读稳定产出"列表里在、点开 404"（用户可见的数据不一致） |

## 工作项

| # | 工作项 | 状态 | 证据 | 备注 |
|---|--------|------|------|------|
| 1 | W1 设计（`design-craft`）：R4/R6/R2/R1/R5 **+ W7a** 技术设计 —— 接线点与失败路径、全局串行、`indexing` 状态机、四端口径、配置项、A11 判据落法、写侧不变量（I1/I2）与 read 判据简化 | 已完成 | 设计已落盘（`CodeWikiHub/kisearch/requirements/2026-10-09-导入完成口径与索引整理阶段/design/`）：`DESIGN.md`（父）+ `S01_索引整理能力`、`S02_完成口径与阶段展示`、`S03_索引就绪判据与可观测`、`S04_写侧不变量与读全旁路`（子）；已 `req update` 注册（状态→设计中）。阶段 0/2.3 已确认（用户：确认"1"+"直接一次性给出完整设计"） | 设计含每子需求的 AS-IS/TO-BE/接口/决策点（含被否决方案）/异常处理/影响范围/待定问题 |
| 2 | W2 R4 实施：引擎 `optimize(options)` 扩展 + 导入收尾异步触发 + 失败/超时降级 + 全局串行 + 可重试入口 | 进行中 | **引擎/客户端/编排/配置已落地（2026-10-10，未提交）**：`src/zvec-engine/{engine,worker,worker-protocol}.ts` 扩展 `optimize({concurrency})`（原生异步）并**重建 dist**；`vector-client.ts` 新增 `optimizeVectorIndex`（超时=中断、**不抛错**契约）；新增 `index-maintenance.ts`（**进程内单飞** + coordinator `engine-only` **显式 kind** + 状态 + `whenIndexMaintenanceIdle`）；配置 `vector.optimize.{enabled,concurrency,timeoutMs}`（schema + config.ts 三处）。**验证**：`tsc` 新增 0；`scope-doc` 18/18、`timeout` 6/6、`coordinator-read-lane` 9/9；`temp/verify-s01-optimize.ts` 冒烟 **A1 ok(wall 1000ms) → A2 ok(0ms) → A3 非法 scope 结构化降级不抛错**。**实施中发现并修复**：`withEngine` 同步抛错会穿透 `optimizeVectorIndex` 的"不抛错"契约（已用 async IIFE 包裹）。**重试入口**：CLI `ki index-optimize -s <s> [--concurrency N] [--timeout-ms N]`（`src/index-optimize.ts` + `bin/ki.mjs` 注册；实跑 `{ok:true, wallMs:963}` exit=0）+ HTTP `POST /api/vector/optimize`（`handleVectorOptimize`，body scope 越权校验，经 coordinator **显式 `engine-only`** 入队；`kindForOperation` 已登记 `'vector-optimize'`）。**关键验收（带数据）**：`temp/verify-s01-index-completeness.ts` → 隔离集合写 300 条显式向量 → **A1 `dense=0` → A2 `optimizeVectorIndex({concurrency:1})` ok wall=212ms → A3 `dense=1`** ✅。**待办（见「未完成清单」A2/A3）**：整理期检索延迟实测、HTTP 端点的真实 HTTP 验证（两者都需重启 daemon 加载新 dist）；**导入收尾接线（S-02）已于 2026-10-10 完成**（`handleDirectImport` 异步入队 + CLI/HTTP/Web 两级口径，端到端 `dense 0→1` 已验证）。 | 引擎侧改动已完成 | 已核（🟢 代码直读）：① 原生 `ZVecCollection.optimize(options?: ZVecOptimizeOptions): Promise<void>`、`ZVecOptimizeOptions{concurrency?:number}`（0=自动）——`node_modules/@zvec/zvec/src/index.d.ts:965-971/1383/1391`；② 我们的封装**尚未暴露并发**：`engine.ts:335-337`（无参）、`worker-protocol.ts:92`（payload `Record<string,never>`）、`worker.ts:146-148`（只调 `optimizeSync()`）⇒ 三处都要改 + 重建 dist | 引擎侧改动是本项第一步（可独立验证） |
| 3 | W3 R6 实施：索引就绪接出到任务 / 任务中心；判据按 A11（实体 + 重开校验） | 已完成 | `readIndexReadiness`（`index-maintenance.ts`）+ `TaskRecord.indexReadiness`（`task-registry.ts`）+ CLI/HTTP 写入 + `TasksPage`「索引」行（已建/未建/**未知≠未建**）；`ki doctor` / `/api/vector/status` 原有 | — |
| 4 | W4 R2 实施：`indexing` 阶段展示（复用既有 `phase`，不新增状态枚举） | 已完成 | **四端一致**：CLI 台账 `update({state,phase})`、HTTP job `indexState`、`/api/tasks` phase、Web（导入页轨道文案/徽标 + 任务中心 `PHASE_LABEL` 中文映射） | — |
| 5 | W5 R1 实施：两级终态「可用 / 已优化」四端一致（CLI / HTTP / 任务中心 / 导入页） | 已完成 | CLI 打印 + HTTP `usable/indexState` + 导入页二级徽标 + 任务中心「阶段/索引」；失败/超时一律降级「可用」并可重试 | — |
| 6 | W6 R5 实施：整理期提示（同 scope 检索可能变慢）+ 可重试整理的说明文案 | 已完成 | `AppShell` 顶栏全局徽章「索引整理中 · 文档已可用（scope）」+ 整理期 3s 刷新；导入页说明文案 + `ki index-optimize` 重试引导 | — |
| 7 | W7 R9 队列槽保护（形态＝写侧不变量 + read 判据简化） | 已完成 | **Q6 已拍板（2026-10-10）：读必须能与在跑的写任务并发** ⇒ 形态收敛为「写侧不变量补全（见 W7a）+ read 判据简化为只与 commit 窗口互斥」，**不再依赖"占槽上限 / 强制释放"**（原路线 a/b 随之重估）。现状：`operation-coordinator.ts:19`（三态）/`:195-197`（read 旁路）/`:128`（队列项只记 `enqueuedAt`） | 前置 = W7a；若 W7a 落地，`engine-read` 细粒度 kind 非必需 |
| 7a | W7a **H2 前置修复（= R9 落地的必要条件）**：删除类路径顺序反转（分片先落 → KB 后删）+ 两次元数据写紧邻入窗、剥离夹在中间的引擎 I/O；`setSource` 改原子写并移入窗口；跨进程 `bumpManifestRevision` 顺序（P2） | 已完成 | **I1/I2/I3 + I4 全部落地（2026-10-10，未提交）**。**I4**：`operation-coordinator.ts` 的 read 判据简化为"只与提交窗口互斥"（写任务/挂住任务一律并行）；`test/coordinator-read-lane.test.ts` 用例⑥ 语义反转。**表驱动回归**：`test/read-write-concurrency.test.ts` **6/6** —— 对照臂 993 采样检出 **992 次 DIR E**（灵敏度确证），4 条真实路径（文档级/目录级删除、manage 级联、sync 覆盖写）全程 **0 次**；未纳入的 3 条路径（导入 / doc-edit 发布 / rebuild+restore）在用例 6 中**显式登记打印**（不静默）。**回归全绿**：coordinator-read-lane 9/9、delete-group 7/7、manage-index 10/10、daemon-concurrency 10/10；`tsc` 新增 0。证据：① 代码——`src/delete-relation.ts`（文档级+目录级：**分片先落 → KB 后删**、两次写入 `withMetadataCommitSync`、引擎 I/O 全部移出窗）、`src/manage-index.ts`（级联删除改为分片先删）、`src/lib/scope.ts`（`setSource` 改 tmp+rename 原子写）、`src/lib/import.ts`（Phase 5 `setSource` 移入 Phase 4 提交窗口）；② `npx tsc --noEmit -p tsconfig.json` → 仅 2 条既有基线报错（`import-budget.ts:78`、`mcp-http.ts:571`），**新增 0**；③ 测试——`delete-group` **7/7**、`manage-index` **10/10**、`coordinator-read-lane` **9/9**；④ 实测 `temp/verify-h2-delete-window.ts` → A 段仍复现 DIR E（**探针灵敏**）、**B 段 30 轮真实删除 0 次 DIR E**（两次写在同一同步块、中间无 await ⇒ 窗口**结构性消除**）。**核对结论（上线门槛项）**：`manage-index --force` 原为反序（已修）；**restore 两条路径本来就满足 I1**（`safe-tar.ts:19-32` 内部 staging + 原子 rename；daemon 路径 `restore-snapshot.ts:118-122` 用 rename 移开旧目录）⇒ 超范围改动已**回滚**。**H2 验证（2026-10-10）**：① 单文件原子 ✅（`writeJson→walWrite` = `.tmp`+`renameSync`+`.lock`，`wal.ts:134-154`）；② **删除路径跨文件顺序反了 ❌**：`delete-relation.ts:159` 删 KB 并落盘 → `:201` 才落分片，中间夹 `moveToTrash` / 向量删除 / FTS 删除（引擎 I/O），且**整条路径无提交窗口**（`withMetadataCommitSync` 仅用于 `import.ts:1974/2049`）；③ **实测**（隔离 scope，`temp/verify-h2-delete-window.ts`）：构造该中间态 → 真实读函数得 `list=有 / detail=404:文档原文不存在`（A3 ✅ 复现）；30 轮真实删除并发读命中 DIR E 一次（B3）；④ 导入路径顺序正确（KB `import.ts:1119-1128` 先写、分片 `:1706-1712` 后写且入窗） | 设计须同步：read 判据简化为"只与 commit 窗口互斥"；未测项 = 生产级窗口时长（引擎 I/O 量级），可用 flock 法放大后补测 |
| 8 | W8 回归与交付收口：tsc + 相关测试套件 + auto-review + acceptance-verify | **进行中**（剩余见「未完成清单」A4/A5/A6） | 已做：`tsc` 新增 0（仅 2 条既有基线）；**相关**套件全绿（`read-write-concurrency` 8/0、`get-module-info` 12/0、`manage-index` 10/0、`rebuild-vector` 40/0、`edit-relation` 29/0、`sync-relation-bulk-vector` 10/0、`mcp-http-api` 41/0、web 67/0 等）；**auto-review + code-review 已执行**（修 P0 1 个：导入页"可用"被整理推迟；修陈旧期望 3 处：`sync-relation-bulk-vector`，根因 = `025976d` 起的批量止损 fail-loud 契约）。未做：`acceptance-verify`、**全量**套件、提交（50 文件未提交） | Step 3/4 执行 |

> 证据写法：`命令 → 观察到的输出` / `文件:行号` / `测试名 → 结果`

## 未完成清单（跨需求，2026-10-10 核对）

> **活文档**：完成一项就在行首标 ✅ 并把证据补进「进度日志」；跨需求条目在对应需求目录另立条目后回填指针。

### A. 本计划收口

| # | 事项 | 阻塞/前置 | 归属 |
|---|---|---|---|
| A1 | 重启 daemon（`ki mcp stop && ki mcp --http --daemon`）—— 当前 daemon 跑**旧 dist**，CLI/Web 导入仍走老逻辑 | **需用户授权** | — |
| A2 | 真机全链路：一次真实导入验证 `usable → indexState` 四端呈现 + `POST /api/vector/optimize` 的 HTTP 验证 | A1 | W2 尾巴 |
| A3 | 整理期**检索延迟实测**（带数据 + 并发查询） | A1 | W2 尾巴 |
| A4 | `acceptance-verify`（交付前按验收指标逐条核验） | A2 | W8 |
| A5 | **全量**测试套件完整跑一遍（本会话只跑了*相关*套件） | — | W8 |
| A6 | 工作区 **50 文件全部未提交**；建议按子特性拆 commit（review P1-1） | **需用户授权** | W8 |

### B. code review 未修项（2026-10-10）

| # | 事项 | 性质 | 依据 |
|---|---|---|---|
| B1 | `read` 通道仅 2 个入口（`mcp-http-api.ts:553/572`）⇒ 其余元数据读仍与写任务串行 | 能力缺口（扩面前需逐个核对"是否纯元数据读"） | review P1-2 |
| B2 | `rebuild-vector` 批写期读会看到**空列表** ⇒ 正解 = **写 staging → 按组原子换目录** | 设计级（**不能靠入窗**：批写数秒会阻塞读） | review P2-1；已登记于 `read-write-concurrency.test.ts` 例外表 |
| B3 | `fts-rebuild` 窗口包住多组 `persistCacheShape`（窗口偏长） | 可接受，暂不动 | review P2-3 |
| B4 | 阶段 7 **challenger 二次质疑**（复杂场景，流程要求） | 未发起 | code-review 阶段 7 |
| B5 | doc-edit 发布**采样臂**（现以"入窗 + 顺序核对"替代） | 需先做"草稿构造工具" | `read-write-concurrency.test.ts` registry |

### C. 未立项需求（本会话提出，等拍板）

| # | 内容 | 前置 / 待决 |
|---|---|---|
| C1 | **R-B5 写入聚合**：持久化与 embedding 批解耦，~500 条一个提交单元（落点在**引擎层** `writeDocsWithScheduler`） | 先做 **R-B5-0 探针**（量"持久化占导入墙钟比" + native 调用计数）再决定是否动引擎 |
| C2 | **R-B1** embedding 侧批大小与 `batchSize × maxConcurrency` 对齐（否则并发上限被钳在 13/25） | 待拍板取值（400 / 500 / 配置化） |
| C3 | **R-B2** 常量统一（`batch-vectorize.ts:140` / `rebuild-vector.ts:49` 重复 200 + `batch-vectorize.ts:5` 头注释漂移） | 成本极低，随时可做 |
| C4 | **R-B3** tag / path 旁路补分批（现按 scope 整组一次提交：无进度、取消粒度粗、逼近 64MiB 预算） | 与 C2 同批做口径才一致 |
| C5 | "引擎层每批暂停 2s 让 zvec 先整理" | **已判不可行**（收益上界≈暂停总时长，净亏；存档理由见进度日志）——仅记录，不实施 |

### D. 其它需求线

| 需求 | 剩余 |
|---|---|
| REQ-20261010-001 | 仅 1 个**可选**项：CLI 侧预检告警（提示非门禁） |
| REQ-20261009-002 | **/chat 独立页视觉精修 D1–D7**：仍等用户拍板 Q1–Q11 |
| REQ-20261009-003 | **R8 第三期"检索类降级口径"**：需先定"降级后用户看到什么" |

### E. 工程债 / 环境

| # | 事项 | 说明 |
|---|---|---|
| E1 | 2 条既有 `tsc` 基线报错：`import-budget.ts:78`（`'DISABLED'` 当类型用）、`mcp-http.ts:571`（`getActiveResourcesCount` 不存在） | **既存**（非本计划引入），未修 |
| E2 | `.gitignore` 有未提交改动 | **非本会话改动**，需用户确认是否有意 |
| E3 | 未跟踪产物 `demo/browser-click-proof-collapsed.png`、`demo/diagrams-net-flowchart.png` | 非本次改动，建议清理或入库 |
| E4 | daemon 仍是旧 dist | 见 A1 |

### 🎯 需用户决策的三件事

1. **重启 daemon**（解锁 A2 / A3 / A4）
2. **是否提交 / 怎么拆 commit**（A6）
3. **C 段挑哪些立项**（建议顺序：C1 探针 → C3 → C2 → C4）

## 决策与偏差

| # | 事项 | 决策 / 偏差 | 原因 |
|---|------|------------|------|
| 1 | R7（跳过未变重写）**不列入**本计划 | 判定为已交付：由 REQ-20261010-001「增量导入」落地并默认开启（`src/lib/import.ts:963-976` `isContentUnchanged()`；提交 `b38507d`） | 避免重复建设；若要按 R7 的 A7 口径补验收，另开小项 |
| 2 | R8 剩余（检索类降级口径）**不列入** | 需先定"降级后用户看到什么"（`design-input §5-1`），属独立小决策 | 与本计划（阶段/终态）无耦合 |
| 3 | R-B1/B2/B3/B5（写入流水线：批大小对齐 / 常量统一 / 旁路分批 / 写入聚合）**不在本计划** | 尚未立项（本轮 PM 分析产出），需用户先拍板范围与目标 | 对象不同（写入效率 vs 收尾阶段口径） |
| 4 | 先设计后实施 | 沿用上一阶段 `2026-10-10-engine-quiescence-phase2` 护栏 #6：R4/R6/R2/R1 须先经 `design-craft` | 涉及引擎公开面 + 任务状态机 + 四端口径，跳过设计易返工 |
| 5 | **Q6 已拍板（用户 2026-10-10）**：读必须能与在跑的写任务并发 | 落地形态改为「W7a 写侧不变量补全 + read 判据简化为只与 commit 窗口互斥」；R9 原"占槽上限 / 强制释放"不再需要，`engine-read` kind 亦非必需 | 用户要求"页面必须打得开"；H2 验证显示真正风险在**写侧跨文件顺序**，而非队列占槽 |
| 6 | H2 判定：**部分成立** | 单文件原子成立；**跨文件一致性只在"顺序正确 + 两次写紧邻入窗"的路径上成立**（导入 ✅ / 删除 ❌） | 证据见 W7a 行；新增护栏 #8 并同步 checklist E8 |

## 进度日志

- 2026-10-10 建档：范围 = REQ-20261009-003 的 R4/R6/R2/R1/R5（R9 阻塞待 Q6）；已完成 R4 的前置勘察（原生 `optimize` 支持 `{concurrency}`；我方三处封装尚未暴露并发）。下一步：W1 设计（`design-craft`）。
- 2026-10-10 **Q6 拍板 + H2 验证完成**（W7a 证据就位）：单文件原子 ✅；删除路径"KB 先删、分片后落 + 中间夹引擎 I/O + 无提交窗口" ❌，实测复现 `list=有 / detail=404`。新增护栏 #8（已同步 checklist E8）。下一步：用户确认 W1「已有理解摘要」→ 走阶段 2.3；W7a 的修复并入设计范围。
- 2026-10-10 **W1 设计完成**：用户要求"一次性给出完整设计" ⇒ 跳过逐阶段确认，直接产出父文档 + 4 子文档并落盘 `.../2026-10-09-导入完成口径与索引整理阶段/design/`，`req update REQ-20261009-003` 注册（**v12**，状态→设计中）。下一步：自动评审循环（`design-review` → 修复 → `challenger` → `scenario-rehearsal`），通过后按 **W7a → W2** 顺序实施。
- 2026-10-10 **设计评审第 1 轮（`design-review`）**：结论 **❌ 不通过** —— 🔴 3（① 整理 kind 未登记 `kindForOperation`，会落到 `write` 把读挡回去；② "超时不中断底层"与 CLI 进程退出矛盾；③ I4 前置未闭合：两条待核对路径未进上线门槛）+ ⚠️ 疑似阻断 3（跨进程"全局串行"口径 / 提交窗口只同进程有效 / R6 的"任务·任务中心"接线被收窄）+ 🟡 12 + 🟢 4。报告：`design/design-review.md`（已注册）。**待用户拍板**：疑似阻断 #4/#5/#6；其余可按建议直接修后复评。
- 2026-10-10 **code review（auto-review → code-review）+ 修复（未提交）**：**① 修 1 个 P0**：`web/src/pages/ImportPage.tsx:747-766` 的提前 `return` 吞掉了「可用」转换（`setPhase('done')` / 缓存失效 / 凭据清理 / `ki-import-completed` 广播全部被跳过）⇒ 整理期间 UI 仍显示「导入中…」、结果区不渲染——**正是本需求要消除的"把可用推迟"**（我上一轮把"不切 phase"当成设计，是错的）。修法：先做「可用」转换，**一次性副作用用 `wasDone`（effect 依赖里的 phase）做闸门**，`indexing` 期间只保留轮询；验证：web `tsc` 0 错 + **67/67** + build 成功（dist 已重建）。**② 修 P2-2 既有红**：`test/sync-relation-bulk-vector.test.ts` 3 个失败用例——探针 `temp/probe-bulk-unavailable.ts` 证明 **mock 是生效的**（`ensureVectorAvailable` 调用 1 次、`vectorBulkStore` 0 次），真正根因是**产品侧有意 fail-loud**：`025976d「feat(vector): 批量故障止损与全局任务状态」` 起，"向量服务不可用"= 系统性停止 ⇒ `ok:false + stopReason`，而测试停留在更早契约 ⇒ **陈旧期望（非回归）**。三处期望改为 `ok:false` + `stopReason.code === 'VECTOR_UNAVAILABLE'`，同时**保留**"KB 层不阻塞 / 逐条 `vectorStored=false` / `hints` 照样透出"的原断言 ⇒ **10 pass / 0 fail**。**回归**：`edit-relation` 29/0、`read-write-concurrency` 8/0、`sync-relation` 0 失败、tsc 新增 0。**review 未修项（待拍板）**：P1-1 提交粒度（6+ 子特性混在一处，建议拆 commit）；P1-2 `read` 通道仅 2 入口（`mcp-http-api.ts:553/572`，能力缺口）；P2-1 `rebuild-vector` staging + 原子换目录（设计级）；P2-3 `fts-rebuild` 窗口粒度（可接受）。**阶段 7**：按流程应接力 challenger（复杂场景），建议下一轮发起。
- 2026-10-10 **W8 ④ 三处欠账清理：1 真修 + 2 转为例外登记（未提交）**：① **真修** `get-module-info.ts`（**读详情路径的评分回写**）：两处写点（单条 :204 与批量 :419/:430）包入 `withMetadataCommitSync`——窗口**只包写本身**，不含其上的 `await resolveGroupPath`（可达秒级）；该路径经 daemon/MCP 暴露、且 `read` 通道任务可与写并行 ⇒ 暴露是真实的。② **转为例外（有意不入窗，理由写进表与源码）**：`manage-index.ts` 旧布局整文件写（:313/:538）——本命令 **CLI 专属**（MCP 只暴露空节点删除），进程内无并发读者，原始说明见 `src/manage-index.ts:520-522`；登记为**绊线**（若将来 Web/HTTP 调用该函数，理由失效、必须入窗）。③ **设计性欠账（不能靠入窗解决）**：`lib/rebuild-vector.ts` 的 `writeGroupCacheBatch`（:969/:1038）——批写可达数秒，入窗会让**所有读排队数秒**（比现状更糟）；正解是"写 staging 目录 → 按组原子换目录"，现状"旧分片整目录 rename 备份 → 逐文件写新分片"期间读会看到**空列表**（方向安全，非 DIR E）；`/api/restore/run` 的 rebuild-only 在 daemon 内可跑 ⇒ 暴露真实。④ **不变量表语义升级**：`METADATA_WRITE_DEBT` → **例外登记表**（每一行必须写清"为什么可以不入窗"或"为什么现在还缺"），未知新项直接 fail。**验证**：`read-write-concurrency` **8/0**、`get-module-info` **12/0**、`manage-index` **10/0**、`rebuild-vector` **40/0**；tsc 新增 0。**W8 剩余**：① rebuild-vector 的 **staging + 原子换目录**重构（设计级改动，需单独立项/验证）；② doc-edit 采样臂（需草稿构造工具）；③ 重启 daemon 的真机实测 + 整理期检索延迟实测；④ `sync-relation-bulk-vector` 3 个既有红（疑 mock 打桩失效）。
- 2026-10-10 **W8 ③ 不变量"假绿"自查自纠 + 编辑发布补窗（未提交）**：**发现上一步的静态扫描是假绿**——初版原语清单只有 `persistCacheShape|persistTouchedGroups|setSource`，漏了**第三种写原语族** `writeGroupCache/writeGroupCacheBatch` 与旧布局 `writeJson(cachePath / getRelationsCachePath(...))`。补全清单后**当场暴露 3 个此前不可见的 offender**：`get-module-info.ts`（详情读路径自动补建写分片/缓存 :204/:419/:430）、`lib/rebuild-vector.ts`（批写 :969/:1038）、`manage-index.ts`（旧布局整文件写 :313/:538）——**均在窗外**，是真实 I2 缺口，已**逐条显式登记欠账 + 原因**（不再静默、不再谎报"全部入窗"）。**已修**：`lib/relation-edit-publish.ts` 发布临界区的缓存/分片写（新布局 `writeGroupCache` + 旧布局 `writeJson(cachePath)`）包入 `withMetadataCommitSync`（顺序本就正确：① KB 写 → ② 分片写 ⇒ I1 安全，补的是 I2）；`sync-relation.ts` 6 处同前。**回归**：`read-write-concurrency` **8 pass / 0 fail** —— 5 条采样臂全绿（delete 文档级 182 采样/曾列出 1、delete 目录级 265/1、manage 级联 128/128、sync 覆盖写 53889/53889、**导入 44881/**曾列出 7242**，全部 DIR E=0**）+ 欠账列表 3 条可见；tsc 新增 0（顺带修掉 relation-edit-publish 的一处重复 import）。**W8 剩余**：① 3 处欠账补窗（建议顺序 get-module-info → manage-index → rebuild-vector）；② doc-edit 采样臂（构造草稿成本高，暂以"入窗 + 顺序核对"替代，已在 pending 说明中写明降级理由）；③ 重启 daemon 的真机实测；④ 整理期检索延迟实测；⑤ `sync-relation-bulk-vector` 3 个既有红（HEAD 对照证实非本次引入，疑 mock 打桩失效）。
- 2026-10-10 **W8 ② sync-relation 补窗（欠账清零）+ 采样器防呆 + 导入臂转正（未提交）**：① `src/sync-relation.ts` **6 处** `persistCacheShape`（:372/:575/:970/:1124/:1197/:1255）全部包 `withMetadataCommitSync`（脚本 `temp/wrap-sync-relation.mjs`，**替换数量守卫=6**；导入路径修正为 `./lib/operation-coordinator.js`）⇒ 不变量静态扫描由「1 条欠账」变为 **「全部元数据写均已入窗 ✅」**。② **采样器防呆**：`Sampler.stop()` 新增 `listed`（曾观察到该 relation 被列出）计数，**每个臂强制断言 `listed > 0`** —— 防"rel 名口径不符 ⇒ dire 恒 0 ⇒ 臂绿着骗人"。③ **导入臂转正**（pending → covered）：`handleDirectImport` 作为第 5 条被测臂（`fresh` 臂自行造数）；★ 首次运行即被防呆断言拦下（probe 用 `a.md` 而真实 relation 名是**去扩展名的 `a`**，见 `temp/probe-import-relation-name.ts`）⇒ 修正后 **采样 45781 次（曾列出 7292 次）、DIR E = 0** ✅。④ 覆盖臂 4 → **5**，pending 3 → **2**（剩 doc/edit 发布、rebuild+restore）。**验证**：`read-write-concurrency` **8 pass / 0 fail**（对照臂采样 980 检出 DIR E 979 = 灵敏度确证；不变量打印"全部元数据写均已入窗 ✅"）；`edit-relation` / `edit-relation-dense-e2e` / `edit-relation-fts-e2e` / `sync-relation` 全绿；tsc 新增 0。**⚠️ 发现既有红（与我无关，已对照证实）**：`test/sync-relation-bulk-vector.test.ts` **3 个子用例**失败（`result.ok === false`），**用 HEAD 版本源码复跑同样 3 红** ⇒ 预先存在；疑因 `mockAvailable` 打桩未生效（mock 与实现的实际调用路径漂移）导致的**测试基建陈旧**，非本次改动引入，尚未修（超出 W8 范围，已登记）。
- 2026-10-10 **W8 ① 写侧不变量补口 + 机器可检化（未提交）**：**补窗**——`src/lib/fts-rebuild.ts` 两处分片落盘（预写 `ftsIndexComplete=false`、最终 `ftsIds/ftsLocators`）此前**不在提交窗口内**，均包 `withMetadataCommitSync`（窗口仅含本组分片写=毫秒级；顺序不变：**FTS 写/清在前、分片状态在后** ⇒ "分片说完整 ⇒ 引擎里真的有"）。**不变量机器化**——`test/read-write-concurrency.test.ts` 新增静态扫描用例「含元数据写的文件必须出现提交窗口」（原语 `persistCacheShape｜persistTouchedGroups｜setSource｜writeJson(groupIndexPath`；排除两个原语定义文件 `group-cache.ts`/`scope.ts`），**未知 offender 直接 fail**（防新增路径绕过 I2）。**审计新发现（钉为欠账，不静默）**——`src/sync-relation.ts` **6 处** `persistCacheShape`（:370/:573/:968/:1122/:1195/:1253）**未入窗**：顺序已是 KB 先→分片后（I1 安全、采样臂 DIR E=0），**I2 待补**；补前读最多看到"正文已新、列表元数据仍旧"（已接受形态），不会"列表里在、点开 404"。`import.ts:1128-1135` 的 KB 正文 flush 属 **content 写**、按已接受形态**有意不入窗**。**验证**：`read-write-concurrency` **7 pass / 0 fail**（对照臂采样 1075 检出 DIR E **1074** = 灵敏度确证；4 条真实路径 DIR E=0；不变量打印欠账 1 条）；相关 **8 套**回归（edit-relation-fts-e2e / fts-only-client / fts-rebuild-layout / import-vector-rebuild / rebuild-vector / restore-layout-matrix / restore / zvec-engine-fts-only）**全部 0 失败**；tsc 新增 0。**W8 剩余**：① `sync-relation` 6 处补窗；② 3 条 pending 臂（导入 / doc-edit 发布 / rebuild+restore）**须先给采样器加"关系曾出现"计数**——否则 rel 名口径不符时 `isDire` 恒 false 会产生**空断言假通过**；③ 重启 daemon 的真机 HTTP/UI 实测；④ 整理期检索延迟实测。
- 2026-10-10 **状态更正（W7/R9 早已完成，上一轮口径汇总说"仍阻塞"是错的）**：Q6 已拍板且 **I4 已落地** —— `operation-coordinator.ts:194-204` 的 read 判据 = **只与该 scope 的提交窗口互斥**（`committing>0`），与写任务 / engine-only / **挂住请求一律并行**（"一个挂住的请求把整页读挡死 >10 分钟"由此结构性消除）；写侧不变量 I1/I2 由 `delete-relation.ts`（分片先删→KB 后删、两次写同窗）、`manage-index.ts`、`scope.ts`（`setSource` tmp+rename 原子写）、`import.ts`（Phase 4 窗口含 source）承载。**本轮复跑确认**：`read-write-concurrency` **6/6**（旧顺序对照臂检出 DIR E **992/993** = 灵敏度确证）、`coordinator-read-lane` **9/9**。⇒ **R9 真正剩余的不是"路线选择"，而是写侧不变量的覆盖度**：4 条真实路径已有断言，**3 条路径（导入 / doc-edit 发布 / rebuild+restore）目前只做"显式登记打印"、尚未补断言**；其中 `fts-rebuild.ts:139/200` 的 `persistCacheShape` 经审计**不在提交窗口内**（read 期间可能看到半新半旧分片）——这是 I1 的真实缺口，属 **W8 收口内容**（无需新决策，只需投入）。
- 2026-10-10 **R6 接出 + R5 整理期提示完成（未提交）**：① **R6**：`task-registry.ts` 增 `TaskIndexReadiness` 类型 + `TaskRecord.indexReadiness` + `update()` 三处 Pick 扩展 + `reason` 卫生化（180 字）；CLI（`src/import.ts`）整理落定后 `readIndexReadiness` → `task.update({ indexReadiness })`，并在打印「✅ 索引已优化」时**交叉核对**：整理成功但**无 dense 实体**则显式告警（A11：信号与实物矛盾必须说出来，不静默）；HTTP job 同步 `taskReporter.update({ indexReadiness })`；Web `tasksApi.ts` 同构类型 + `TasksPage` 新增「索引」行（已建（dense N）／未建（可执行 ki index-optimize 整理）／**未知（读取超时/失败，稍后重试）**——`unknown ≠ 未建`，操作指引相反）。② **R5**：`AppShell` 顶栏全局徽章新增「索引整理中 · 文档已可用（<scope>）」（`phase==='indexing'` **单独成列**，不混入 `activeTasks` 的"运行中"计数），整理期 `refetchInterval` 由 15s 提到 **3s**（否则徽章切换延迟会被误读为卡住）。**真机验证**：**直连 CLI（绕过 daemon）**跑真实导入 → 台账 `state=succeeded | phase=optimized | indexReadiness={"denseIndexed":true,"completeness":{"dense":1}}` ✅、JSON 输出含 `indexMaintenance.scheduled=true`。**回归**：root tsc 新增 0；后端 mcp-http-api / task-registry / coordinator-read-lane / import-scheme-d / import-vector-rebuild **全绿**（HTTP 套件含新增断言「未触发整理 ⇒ `indexReadiness` 保持缺省，不白读一次引擎」）；web tsc 0 错 + **67 pass / 0 fail** + build 成功（17:25）。**剩余**：重启 daemon 后的真机 HTTP/UI 全链路实测、整理期检索延迟实测。
- 2026-10-10 **Web 侧两级口径落地（W4/W5 收尾，未提交）**：`web/src/api/httpApi.ts` 的 `ImportJob` 增 `usable / indexState / indexMaintenance / indexMaintenanceDegraded / indexReadiness`（纯新增）；`ImportPage.tsx`：① 轮询条件扩为「`importing` **∨**（`done` ∧ `indexState==='indexing'`）」——刷新/重进页面也能继续跟进整理；② `state==='done'` 且仍在整理时**继续轮询、不切 phase**；③ 轨道文案「导入完成 · 索引整理中… / · 索引已优化 / · 索引整理未完成（可重试）」；④ 结果摘要新增**二级徽标**（索引整理中… / 索引已优化 / 索引整理未完成（可重试））+ 说明文案（整理期文档照常可用；失败给 `ki index-optimize -s <scope>` 重试引导，**不谎报导入失败**）；`TasksPage.tsx`：新增 `PHASE_LABEL` 中文映射（含新四值）+ `phaseLabel()`，用于「阶段」与进度文案（**此前直接把英文枚举露给用户**）。**验证**：`web` `tsc --noEmit` **0 错**；`node --test web/test/*.test.mjs` **67 pass / 0 fail**；`npm run build`（vite）成功、`web/dist` 已更新（17:11）。**兼容性**：新字段缺失时 UI 优雅降级（徽标/文案均条件渲染）⇒ 新 dist 可与旧 daemon 共存。**待办**：R6 接出（`indexReadiness` 写任务记录）、R5 整理期提示、重启 daemon 后的真机 HTTP/UI 实测、整理期检索延迟实测。
- 2026-10-10 **S-02 HTTP 侧 + S-03 就绪判据完成（未提交）**：`Job` 新增 `usable / indexState / indexMaintenance / indexMaintenanceDegraded / indexReadiness`（**纯新增字段，`state` 语义不变** ⇒ 既有调用方零影响）；`runImportJob` 在"导入结果可用"那一刻置 `usable=true` + 台账 `update({state, phase:'indexing'|'skipped'})`，若有整理则 `await whenIndexMaintenanceIdle(config.timeoutMs)` → `indexState='optimized'`（失败/超时/未知一律降级 `available` + recoveryHint + degraded，**不判失败**）→ `readIndexReadiness` → 最后 `finish()`（`finishedAt` 在 finally ⇒ 反映"整件事"结束）；`/api/import/status` 下发上述字段（前端在 `indexing` 期间继续轮询，无需理解新状态值）。**S-03**：`index-maintenance.ts` 新增 `readIndexReadiness(scope,{timeoutMs=5s})` —— A11 交叉判据（**dense 索引实体 ≥1 为主** + 引擎信号仅参考；读取失败/超时一律 `unknown`，**永不抛错**）。**验证**：`test/mcp-http-api.test.ts` 扩断言（`usable===true` / `indexState==='skipped'`(vector:false) / `indexMaintenance` / 任务 `phase==='skipped'`）→ **41 pass / 0 fail**；`temp/verify-s02-import-wiring.ts` 增 A5 → 本 scope `{denseIndexed:true,completeness:{dense:1}}`、不存在 scope `{denseIndexed:false}`（不抛错）；tsc 新增 0。**待办**：Web 导入页/任务中心消费 `usable/indexState`（W4/W5 四端一致的最后一环）、R6 接出到任务记录、R5 整理期提示、**重启 daemon 后的 HTTP 实测**（当前 daemon 仍是旧 dist）、整理期检索延迟实测。
- 2026-10-10 **S-02 导入收尾接线完成（未提交）**：`handleDirectImport` 在元数据提交后按 `vector && mergedMap.size>0` **异步入队**索引整理并返回 `indexMaintenance{scheduled,merged}`（返回类型新增可选字段）；CLI（`src/import.ts`）改为**两级口径**：`task.update({state, phase:'indexing'})` → 打印「⏳ 索引整理中…」→ `await whenIndexMaintenanceIdle(timeoutMs)` → 打印「✅ 索引已优化」或「⚠️ 整理未完成 + 重试命令」→ 再 `finish()`（**整理失败不判导入失败**）。**端到端验收（隔离 scope，绕开在跑旧 daemon）**：`temp/verify-s02-import-wiring.ts` → A1 导入返回「可用」1386ms / A2 `scheduled:true` / A3 整理 ok wall=250ms / A4 **`dense` 0→1** ✅。**E2E 抓到的生产必踩 bug（已修）**：未配 `concurrency` 时 `optimize(undefined)` 被原生拒绝（`Expected 0 to 1 argument`）⇒ worker 改为**零参调用**分支；并按设计把 `vector.optimize.concurrency` 默认值设为 **1**（D5）。**顺带修 2 处陈旧断言**（增量导入新增 `unchanged` 字段后未同步：`import-vector-rebuild:286`、`import-auxiliary-degrade:142`）——属既有失败，非本次引入。**回归**：import-scheme-d 21/21、import-conflict 10/10、coordinator-read-lane 9/9、read-write-concurrency 6/6、import-partial-success/retry 全绿、上述 2 套件已回绿；tsc 新增 0。**待办**：HTTP job 侧（`usable`/`indexState`/`indexReadiness` + job 保持 open）、Web 导入页/任务中心消费 `usable`/`phase`、S-03 就绪判据接出。
- 2026-10-10 **S-01 主体完成（未提交）**：引擎 `optimize({concurrency})` + dist 重建、`optimizeVectorIndex`（超时=中断 + 不抛错）、`index-maintenance.ts`（进程内单飞 + 显式 engine-only）、配置 `vector.optimize.*`、CLI `ki index-optimize`、HTTP `POST /api/vector/optimize` + `kindForOperation` 登记。**关键验收通过**：隔离集合 300 条向量 → `dense 0 → 1`（concurrency=1，212ms）；CLI 实跑 ok；tsc 新增 0；mcp-http-api 41/41。**下一步**：S-02（导入收尾接线 + `usable`/`indexState` 四端口径 + `indexReadiness`），以及 S-03（就绪判据接出）与 S-01 的两项收尾（检索延迟实测 / 重启 daemon 后 HTTP 实测）。
- 2026-10-10 **W7a + W7 完成（I1/I2/I3 + I4，未提交）**：新增 `test/read-write-concurrency.test.ts`（6/6；对照臂 992/993 检出 DIR E = 灵敏度确证；4 条真实路径 0 次；3 条未覆盖路径在用例 6 显式登记）；`operation-coordinator.ts` read 判据简化为只与提交窗口互斥（**Q6 目标达成**：读不再被任何在跑/挂住任务挡住）；`coordinator-read-lane` 用例⑥ 语义反转。回归：9/9 + 6/6 + 7/7 + 10/10 + 10/10，tsc 新增 0。**下一步**：进 **W2/S-01**（引擎 `optimize({concurrency})` 三处扩展 + `npm run build:zvec-engine` 重建 dist + `index-maintenance.ts` 单飞 + 重试入口 + 配置项）。
- 2026-10-10 **W7a 实施（I1/I2/I3 已落地，未提交）**：改 4 个文件（`delete-relation.ts` 文档级+目录级顺序反转并入窗、`manage-index.ts` 级联删除顺序、`lib/scope.ts` setSource 原子写、`lib/import.ts` Phase 5 入窗）；tsc 新增 0；`delete-group` 7/7 + `manage-index` 10/10 + `coordinator-read-lane` 9/9；H2 脚本**真实删除 0 次 DIR E**。核对：restore 两条路径**本来就满足 I1**（safe-tar 内部 staging+rename），超范围改动已回滚；`manage-index --force` 原为反序已修。**下一步**：① 写 `test/read-write-concurrency.test.ts`（表驱动 + 旧顺序对照臂）② 写完后才可合 **I4**（判据简化）③ 随后进 S-01。
- 2026-10-10 **设计评审第 2 轮（增量再审）：✅ 通过**。用户拍板：#4 = 口径确认为「**进程内**全局 ≤1」（跨进程并发登记为已知限制 G9，补锁条件可观测）；#6 = **接 `readiness`** 到任务/任务中心（不收窄需求）；#5 = 表述修正。修订：5 份文档全量更新（S-01 增非功能性假设 + 性能&安全章 + **超时=中断** + kind 两处登记 + 越权校验/路由护栏；S-02 增**时序图**与就绪证据、`update/finish` 时机明确、`partial.usable` 定稿；S-03 接出 `indexReadiness`、`includeSignal` 语义定稿；S-04 增**上线门槛**、AS-IS/TO-BE 流程图、迁移策略；父文档补 I1–I4 术语 + 用户视角一览图 + G8/G9 风险）。**约束**：I4 合入受 S-04 §3.3 上线门槛限制（`manage-index --force` 与 `restore/rebuild` 两条待核对）。下一步：`challenger` 二次质疑 → `scenario-rehearsal` → 实施（W7a → S-01 → S-02 → S-03）。
