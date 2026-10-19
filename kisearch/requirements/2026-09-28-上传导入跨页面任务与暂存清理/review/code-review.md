# Code Review Report — 上传导入跨页面任务与暂存清理

**Commit**: `[无提交上下文]`（master 工作区未提交改动，自 `~/.codex/worktrees/import-background-task/knowledge-indexer` 迁移）
**关联需求**: `REQ-20260928-001《上传导入跨页面任务与暂存清理》`（匹配依据：变更文件与需求正文第 2 节"现状证据"逐条对应；用户指定迁移主题 ↔ 需求名称 🟡）
**整体评分**: **C**（存在未修复 P0，按规则最高 C）
**审查模式**: 🔬 深度模式（净约 700 行；原为 🔴 巨型档，按需求单一片段整体审查）
**审查方式**: 子 agent 并行（安全+规范 / Bug+性能 / 测试）+ 主 agent 串行（语义一致性 + 架构）+ 主 agent 对子 agent 结论逐条回代码复核

---

## 🎯 功能意图推测（阶段 3）

**🌍 全局图景**：业务目标 `让用户在 Web 导入时切页/刷新不丢任务，并防止暂存目录无限堆积`｜系统位置 `ImportPage(视图+任务宿主) → httpApi(SSE/JSON) → mcp-http-api(批次会话/惰性清理) → operation-coordinator → handleDirectImport(source.dir)`｜整体成功判据 `R1–R9 与第 4 节负向场景全部成立；原有两步调用（upload→run）与 CLI 导入语义不被破坏`

| 代码位置 | 推测的功能意图 | 确认状态 | 置信度 |
|---|---|---|---|
| `mcp-http-api.ts:processImportUpload()` | 分批上传的最后一批经后端校验并持久化后，原子启动导入并返回 jobId，使"已提交"可判定、防重复 | ⏩ 依需求 D1/R5（文档状态"已确认"） | 🟢 高 |
| `mcp-http-api.ts:cleanupExpiredUploads()` | 新上传时顺手删除空闲 24h 且未启动导入的暂存目录；已导入目录作为 source.dir 保留 | ⏩ 依 R7/D2 | 🟢 高 |
| `ImportPage.tsx:useEffect(recover)` | 标签页重开后凭本地 uploadId 找回"已被后端接受"的导入任务并继续跟踪 | ⏩ 依 R4/R5/R6 | 🟢 高 |
| `AppShell.tsx + routes.tsx:element={null}` | 把 ImportPage 升为全局常驻任务宿主，站内切页不丢进度且可在任意页返回 | ⏩ 依 R1/R2 | 🟡 中（载体方式未与需求逐条确认） |

## 📊 维度评分概览

| 维度 | 评分 | 状态 |
|---|---|---|
| 🔑 语义一致性 | 5/10 | ❌ |
| ⚠️ 安全性 | 7/10 | ⚠️ |
| 🐛 Bug 风险 | 4/10 | ❌ |
| 📐 代码规范 | 7/10 | ⚠️ |
| 🏗️ 架构设计 | 6/10 | ⚠️ |
| ⚡ 性能 | 6/10 | ⚠️ |
| 🧪 测试覆盖 | 5/10 | ❌ |

> ✅ = 8-10 无明显问题｜⚠️ = 5-7 需改进｜❌ = 0-4 严重问题

## 📝 语义提取记录

**权威语义**（阶段 3，来源=requirement.md R1–R9 / 第 4 节负向表 / D1–D2）：

| # | 来源 | AI 推测的功能意图 | 确认状态 | 涉及位置 |
|---|---|---|---|---|
| A1 | R4 | 刷新后重新进入上传页应"不显示虚假状态，且新上传可正常完成" | ⏩ | `ImportPage.tsx:456-469` |
| A2 | R5/D1 | 导入启动须可判定、可防重复；丢响应后能按 uploadId 找回同一任务 | ⏩ | `mcp-http-api.ts:830-941` |
| A3 | R6/负向"服务重启" | 状态不确定时**必须显示"待确认"**，不得声称成功或失败 | ⏩ | `ImportPage.tsx:485-494` |
| A4 | R7/D2 | 只清理"空闲>24h + 未启动导入 + 非活跃"的目录；已导入目录保留为 source.dir | ⏩ | `mcp-http-api.ts:106-142` |
| A5 | R9 | 部分文件失败不得显示成整体无错成功 | ⏩ | `ImportPage.tsx:421-423` |

**辅助语义**（阶段 4）：

| # | 来源 | 原文 | AI 理解的语义 | 置信度 | 与权威语义关系 | 涉及位置 |
|---|---|---|---|---|---|---|
| S1 | 新增注释 | `// rename 与状态复核之间无 await；同一进程内的上传/导入无法插入。` | 清理的 check-and-rename 靠同步临界区保证互斥 | 🟢 | ✅ 补充（**已逐行核实为真**） | `mcp-http-api.ts:127` |
| S2 | 新增注释 | `// 完成导入后，此目录会登记为 source.dir，后续编辑/同步仍需读取原文件。` | 已导入目录不可删，否则破坏在线编辑 | 🟢 | ✅ 补充（**已核实**：`import.ts:737` 写 source.dir、`document-editor.ts:63` 读它） | `mcp-http-api.ts:122` |
| S3 | 新增注释 | `/** 仅供页面重开后找回已经由后端接受的导入任务；未完成上传不提供续传。 */` | 该端点只服务恢复，不做续传 | 🟢 | ✅ 一致 | `mcp-http-api.ts:954` |
| S4 | 既有注释（不变式） | `新增带 scope 参数的只读接口时必须同步加入本列表，否则该接口不受越权拦截` | 中心 scope 拦截点是单一 SSOT | 🟢 | ❌ 冲突（新 GET 端点未加入） | `mcp-http-api.ts:387-389` |
| S5 | 既有 hint（跨模块） | `IMPORT_CANCELLED → '任务已在当前批次完成后停止，可用原 uploadId 重新导入。'` | 取消后可复用 uploadId 重导 | 🟢 | ❌ 冲突（新语义下不可执行，见 M5） | `daemon-rpc.ts:146` |
| S6 | 新增文档 | `/api/import/upload` 行未提 `X-Ki-Upload-Id` 头 | 分批协议文档缺该输入 | 🟡 | ⚠️ 补充不全 | `docs/mcp-http.md:114` |

> ⚠️ 请用户核实：⏩ 未逐条确认的权威语义、S4/S5 两条 ❌ 冲突。

---

## 🔑 语义一致性分析

**[M1] 刷新后页面永久卡在"上传中…"，"新上传可正常完成"未达成**（↔ A1 / R4）
- 🏷️ 类型：实现未满足已确认验收标准（0.1 + 0.7 路径）
- 📍 `ImportPage.tsx:456-469`
- 💻 实际做：`while (status?.active && !status.jobId)` 内 `setPhase('uploading')`；退出循环后走 `if (!recoveredJobId) { removeItem; return; }` —— **phase 未复位即返回**。
- 🔍 推演：上传中按 F5 → 服务端 POST 仍在解析 15MB 请求体 → 新页面 `upload-status` 返回 `active:true` → 置 uploading → 约 1s 后服务端 `aborted` 回落 active → 循环退出 → 直接 return。此时 `phase==='uploading'` 会命中 618/662/738（选文件、选目录、拖拽全部 early-return）、859（start 直接 return）、1243（开始按钮 disabled）→ **整页不可用且无任何错误提示**，用户只能再刷新一次浏览器（第二次因 key 已清才恢复正常）。主 agent 已核：此结论由子 agent 提出，我复核代码后将其从 P1 升为 **P0**，因为它直接落在本次需求自身声明的验收场景里。
- 💡 建议方向：循环退出与"未找回 jobId"分支统一 `setPhase('idle'); setProgressText('')`；并给 while 循环加尝试上限。

**[M2] 恢复流程与用户新上传互踩，可显示虚假"导入完成"**（↔ A1/A5 / R9）
- 📍 `ImportPage.tsx:417-484`（`active` 只随卸载置 false；常驻挂载后永不取消）
- 💻 实际做：`recover()` 可挂起 2s 以上（8×250ms 重试 + 无上限 500ms 轮询），期间 `start()` 已 `removeItem/setItem` 新 uploadId；迟到的 `status.jobId` 仍执行 `setJob(旧)/setScope/setPhase`。
- 🔍 推演：轮询 effect 依赖 `job?.id` → 会改轮旧任务；新上传真未完成时徽标可能显示"导入完成"。违反 R9"部分失败/未成功不得显示成整体无错成功"。
- 💡 建议方向：引入代际令牌（`generation.current++`，recover 每步比对）；或 `uploadPlanRef.current` 非空即放弃恢复。

**[M3] 服务重启后任务被静默丢弃，"状态待确认"承诺未兑现**（↔ A3 / 第 4 节"服务重启"行）
- 📍 `ImportPage.tsx:485-494`
- 💻 实际做：catch 判据 `status === 404 && !jobId` 用的是**闭包里 localStorage 的旧值** `jobId`，而非 `recoveredJobId`。
- 🔍 推演：key 只有 `{uploadId, scope}`（trackImport 未来得及跑）→ upload-status 找回 jobId → `/api/import/status` 404（job 已被 `MAX_JOBS`/`JOB_TTL` 淘汰或进程重启）→ 条件成立 → `removeItem` + return → 回到 idle **零提示**。需求明确要求此场景显示"状态不可确认并引导核查"。另 `:473` 的 `if (!active || !result.job) return;` 同样是静默分支。
- 💡 建议方向：判据改 `!recoveredJobId`，并区分错误来源（upload-status vs import-status）。

**[M4] 终态后不清任务凭据 → 陈旧徽标与周期性误报**（↔ A3）
- 📍 `trackImport:794-800` 写入，仅 `start()` 与两条 404 分支清除；done/failed 终态不清。
- 🔍 后果：此后每次冷启动都重跑恢复——服务未重启时任意页面弹出旧任务"✓ 导入完成"徽标；重启过则**每次进应用都误报"无法确认上次导入结果"**。
- 💡 建议方向：轮询/恢复到达终态（done/failed/cancelled）即 `removeItem`。

**[M5] 已启动导入的 uploadId 再上传 → 200 静默丢弃本次文件；跨模块提示已失准**（↔ A2 / 0.9 守恒 + 0.4 传递性）
- 📍 `mcp-http-api.ts:839-842`
- 💻 实际做：`if (session.jobId) { sendJson(200, {ok:true, …, total:0, errors:session.errors}); return; }` —— 不写盘、不报错、返回成功。
- 🔍 推演：对 Web 的"重发最后一批"是正确幂等；但对**两步调用/API 客户端**（文档仍描述 upload→run 兼容路径）意味着"文件被静默吞掉"，属守恒破坏，与项目 fail-loud 约定冲突。
- 🕸 连带（主 agent 独立发现，子 agent 未覆盖）：`daemon-rpc.ts:146` 对 `IMPORT_CANCELLED` 的用户提示"可用原 uploadId 重新导入"在新语义下**不可执行**（复用只会 202 返回同一个已取消 job，或 409 状态已失效）；`.module-experts/知识索引导入专家/C0-使用总览.md` 已知坑行「status 404 → 重新 upload + run（上传目录文件仍在可重用 uploadId）」同样失准。
- 💡 建议方向：无 `files` 与"已启动"并存时返回 409 + hint（"该 uploadId 已启动导入，重传请用新 uploadId"）；同步更新 daemon-rpc 提示与专家 C0（已入待生效台账）。

**[M6] 两条导入启动路径对同一字段规范化口径不一致**（↔ A2 / 0.7）
- 📍 `mcp-http-api.ts:931`（`group: body.finalize.group`）vs `:1071`（`group: body.group?.trim() || undefined`）
- 💡 建议方向：抽公共的 finalize/run 参数归一函数，避免兼容路径与新路径长期分叉。

### 🛤️ 条件路径与执行场景语义分析

**被分析函数**: `recover()`（`ImportPage.tsx:439-484`）　**函数功能**: 标签页重开后按 uploadId/jobId 找回任务

**执行场景覆盖（0.8）**：

| 场景 ID | 场景名称 | 是否执行 | 语义一致性 | 分析说明 |
|---|---|---|---|---|
| S1 | 上传中刷新，服务端仍在解析最后一批 | ✅ | ❌ | M1：phase 卡 uploading，页面砖掉 |
| S2 | 已启动导入后刷新（同进程，job 在内存） | ✅ | ✅ | 正确恢复为 importing/done 并继续轮询 |
| S3 | 已启动导入后刷新 + 服务重启 | ✅ | ❌ | M3：应"待确认"，实为静默 idle |
| S4 | 用户在恢复窗口内点开始导入 | ✅ | ❌ | M2：旧任务迟到覆盖新任务 |
| S5 | 非 localhost / 非 HTTPS 打开页面 | ✅ | ❌ | M-B9：`crypto.randomUUID` undefined，点击无反应 |
| S6 | 两个标签页同时各有任务 | ✅ | ⚠️ | 单一 localStorage key 后写覆盖前写（负向表要求"不得互相覆盖/须明确拒绝"） |

**数据流守恒（0.9）**：

| 数据实体 | 流向变化 | 数量变化 | 内容变化 | 异常路径归宿 | 消费方及效果判定 | 结论 |
|---|---|---|---|---|---|---|
| 已启动导入的 uploadId 的 `files[]` | ✅ 无 | ❌ 该批全部丢弃（N→0） | — | ❌ **静默丢弃**（`:839` 早退，仅 total:0） | 导入任务：收不到这些文件 | ❌ |
| `session.errors`（跨批次累积） | ✅ | ✅ 只增不减、无上限 | ✅ 无 | ✅ 有记录 | 前端 `setUploadErrors` | ⚠️ P2（DoS 面/平方级 JSON 成本） |
| 取消态 `state` | ❌ `cancelled` 折叠写为 `'failed'` | — | ❌ 状态语义丢失 | ✅ 有记录 | upload-status 消费方（前端未消费 state） | ⚠️ P2 |
| 暂存目录（已导入） | ✅ | ❌ 永不回收（单调增长） | — | ✅ 有注释依据（D2） | document-editor 读 source.dir | ⚠️ 设计取舍已被需求确认，但清洁成本转嫁给 M7 |
| 批次号 `completedBatches` | ✅ | ✅ Set 去重，`length===batchCount` ⟺ 全齐（鸽笼） | ✅ | ✅ 409 拒绝 | createJob 前置门 | ✅ |

**新增数据贯通（0.9 两问）**：

| 新增数据元素 | 正向贯通 | 反向消费 | 结论 |
|---|---|---|---|
| `finalize`（批次内嵌导入选项） | ✅ 逐跳落地：plan → upload → createJob/runImportJob 全字段透传 | ✅ 有生产有消费 | ✅ |
| `X-Ki-Upload-Id` 头 | ✅ → `activeUploadRequests` → upload-status `active` → 前端恢复循环 | ✅ | ✅（但文档未记录，S6） |
| `UploadStatusResponse.state` | ✅ 后端产出 | 🟡 **前端零消费**（只用 jobId/active/errors）`[待确认]` | 🟡 |

**搭车变更审计（0.10）**：

| 搭车变更位置 | 改动性质 | 围栏检查 | 正确性 | 结论 |
|---|---|---|---|---|
| `readJsonBody` 新增 `req.on('aborted')` | 需求外的健壮性修补 | ❓ 原缺该监听是缺陷非设计（无注释/测试主张） | ✅ **本次特性承重改动**：无它则中断请求永不 settle → active 永不回落 + 资源悬挂 | 🟢 放行（建议写入需求 D1 支撑证据） |
| `bindUploadScope`/`mkdir` 后 `lstat.is()` 加固 | 顺手安全加固 | ✅ 已证非故意（符号链接可绕过原判定） | ✅ 正确且堵住跨 scope 复用面 | ⚠️ 建议拆分独立提交 |
| `invalidateImportQueries` +`fullTextSearch` 键 / SearchPage `ki-import-completed` | R8 授权范围内 | — | ✅ 前缀匹配确实命中 BrowsePage 的 `['docList',scope,'search',…]` 与 `['fullTextSearch',scope,q,tag]` | ✅ 放行 |

## 🔴 严重问题（必须修复）

**P0-1** `ImportPage.tsx:456-469` — 见 M1。修复示例：
```ts
recoveredJobId = status?.jobId ?? jobId;
if (!recoveredJobId) {
  localStorage.removeItem(LAST_IMPORT_JOB_KEY);
  setPhase('idle'); setProgressText(''); setUploadErrors([]);   // ← 复位，否则整页被 uploading 态锁死
  return;
}
```

## 🟡 建议改进（推荐修复）

**P1-1** `ImportPage.tsx:432-484` 恢复与新上传互踩（M2）→ 代际令牌 / `uploadPlanRef` 非空即放弃恢复。
**P1-2** `ImportPage.tsx:485-494` catch 判据 `!jobId` → `!recoveredJobId`（M3）。
**P1-3** `ImportPage.tsx:794-800` 终态清凭据（M4）。
**P1-4** `mcp-http-api.ts:839-842` 200-丢弃 → 409 + hint（M5）；同步 `daemon-rpc.ts:146` 提示与专家 C0 已知坑。
**P1-5** `ImportPage.tsx:893` `crypto.randomUUID()`：`[需确认]` 部署形态（`mcp-http.ts:1002` `authEnabled = !isLoopbackHost(host)`，而非回环时 `/api/*` 需 Bearer，前端 `req()` 不发 Authorization → 远程 HTTP 场景当前本就 401，故实际暴露面受限）；但一旦上反代/放宽鉴权即硬阻塞。建议 `crypto.randomUUID?.() ?? getRandomValues 兜底`，并给 `start()` 补 catch → `setError`（否则 TypeError 成未处理 rejection，点击毫无反应）。
**P1-6** `mcp-http-api.ts:106-142` 清理在新上传路径做**无上限同步 I/O**（每目录 3–4 次 syscall + `readFileSync`+`JSON.parse`，整轮在一个 tick 内跑完）→ stall 同进程 MCP 检索流；需求影响评估要求"清理耗时应受限"。建议 `fs.promises` + 每 N 目录让出 + 时间预算（如 50ms 后转下轮）+ 无 session 时用 `.scope` mtime 短路。
**P1-7** `mcp-http-api.ts:80-89 / 118-139` 元数据损坏：上传路径无 try → 该 uploadId 永远 400；清理路径 `catch {}` → 目录永不清理（磁盘泄漏）+ 零日志（违反 fail-loud）。建议损坏即降级为"按 mtime 判定并隔离"，并 `process.stderr.write` 记录。
**P1-8** 测试 `test/mcp-http-api.test.ts:217-252 / 304-306`：
- R5/R6 只断言"返回同一个 jobId 字符串"，不查 job 终态、不查落库文档数 → "不重复导入"未被真正证明。**（主 agent 把子 agent 的 P0 判为 P1：实现侧无已知缺陷，属测试强度问题，不阻断合入，但须在合入前补齐）**
- 清理用例的"已导入目录保留"断言经**变异实验证伪**：删掉 `if (session?.jobId) continue`（即 D2 保护）后 33 例全绿 = 变异存活；`:306` 是在竞态窗口里侥幸通过。修法：连续两轮新上传 + 等到 `.expired-*` 全部消失后再断言 `importedDir` 存在。
- 缺失（后端集成层，现成 fetch 基建，每条约 8 行）：401/403（`authScopes` 从未以非 null 走过任何 import 路由）、非法 uploadId→400、头与 body 不一致→400、410（upload 与 run 两条路）、409 批次未齐、`batchCount` 与既有 session 不一致、`req.on('aborted')`、活跃上传不被清理（现有用例的新上传不带 header，`activeUploadRequests` 实际未被测到）。
- 前端 R1/R2/R3/R8/R9 零自动化覆盖：恢复逻辑全内联在 effect。最小改造：抽 `recoverLastImport({ getStorage, getUploadStatus, getJobStatus, apply })` 纯函数导出，即可在 `web/test/` 用假 api + 假计时器全量驱动（本仓先例：`web/test/markdown-preview.test.mjs` 的 vite `ssrLoadModule`；提示中提到的 `test/chat/e2e-sr02-sources.test.ts` **在本仓不存在**，属主 agent 误导，已纠正）。

**P2**（择要）
- 中心 GET scope 白名单（`mcp-http-api.ts:387-389`，文件自述"必须同步加入"）未含新端点；handler 内自查无绕过，但破坏单一拦截点不变式。
- `upload-status` 不走 `resolveScope`：`scopeMode=strict` 下未注册 scope 返回 404 而非 400，且 query scope 未 trim 即 404，与其余端点口径不一致。
- `X-Ki-Upload-Id` 重复时 `req.headers[...]` 为数组 → `activeId=null` → 一致性校验被跳过且失去"活跃免清理"保护。
- 410/409 在前端统一落 `failureStage:'upload'` → 仍渲染"重试第 N 批"，而该 uploadId 必然再次 410 → 重试入口死循环（缺结构化错误码 + hint）。
- 常驻挂载副作用外溢：`fetchTags(scope)` + `getImportConfig(scope)` 现在每次冷启动与每次切 scope 都会打（与 SearchPage 重复）；编码阶段逐文件 `setProgressText` → `onTaskChange` → AppShell setState → 当前页整树重渲染；`PendingFile.file` 句柄与 `selections` DOM 在完成后不清空。
- `session.errors` 无上限、`name` 未截断；`cancelled` 折叠成 `'failed'` 写盘。
- 规范：`ImportPage.tsx:559-561` catch 内多缩进 2 空格、`start()` try 体未重排（`:861-916`）；`routes.tsx:16` `element={null}` 语义隐晦；AppShell 内联 `style` 与本 PR 已建的 `ki.css` 混用；`runImport` 仅剩类型引用（死导出）；`UploadSession`/`UploadStatusResponse`/`docs` 三处契约无 SSOT（项目已有 `contract-parity` 式先例可仿）；`ki-last-import-job` 名不符实；`active`（effect 标志）与 `status.active`（后端字段）同名易误读；`while` 循环无上限。
- 工作区噪声：`web/node_modules`（被跟踪的符号链接，mode 120000）当前为已删除状态，勿随本次提交带入。

## 🟢 亮点

1. **`req.on('aborted')` 是承重改动**：没有它，客户端中断的请求会让 `readJsonBody` 永不 settle → `activeUploadRequests` 永不回落 → 恢复循环 `while (status.active)` 无限自旋。主 agent 独立核实该因果成立。
2. **"检查 jobId → createJob → 写盘"确实全程同步**（`mcp-http-api.ts:830 → 926 → 928`，中间含文件写入循环，无一个 `await`）→ 单进程内幂等启动成立；清理侧"复核 + rename"同为同步临界区，注释 S1 所述与代码一致。**但这条正确性靠"未来不许在此区间插 await"维持，建议就地加注释锁定并补一条时序测试。**
3. **注释 S2 经核实为真**（`import.ts:733-740` 写 `source.dir`，`document-editor.ts:60-66` 读它）——"已导入目录必须保留"不是臆测，D2 的判断有代码依据。
4. **批次协议设计干净**：`completedBatches` 用 Set 去重，`length === batchCount` 与"全齐"等价（鸽笼），乱序/重试天然幂等；`.scope` + `session.scope` 双绑定 + `bindUploadScope` 符号链接加固，堵住了原有跨 scope 复用面。
5. **导入选项冻结在 plan**（`plan.scope` / `plan.finalize`，而非提交时读当前表单）恰好满足负向需求"任务绑定发起时的 scope/group/选项"。
6. **测试隔离实测通过**：`os.homedir()` 在 POSIX 下优先取 `process.env.HOME`，真实 `~/.ki/import-uploads` 跑前跑后逐条 diff 为空 → 零污染零误删。
7. 需求文档本身质量高（R1–R9 可验收 + 负向场景表 + D1/D2 取舍），本次多条缺陷正是靠它才判定得出来。

## 📝 总结与行动项

**🎯 合入结论**：⚠️ **修复 P0-1 后可合入**（P1-1/P1-2/P1-3/P1-8 建议同批完成，它们与 P0-1 同属"恢复流程状态机未收口"这一根因）

**💥 缺陷 → 功能影响翻译**

| 缺陷 | 预期功能行为 | 实际功能行为 | 功能影响 |
|---|---|---|---|
| P0-1 | 上传中刷新后，重新进入上传页可重新选文件并正常完成新上传 | 刷新后页面永久停在"上传中…"，选文件/开始按钮全禁用、无提示，必须再刷新一次 | 🔴 本次需求自证场景（R4）不可用 |
| P1-2 | 服务重启后显示"状态待确认"并引导核查 | 静默回到初始态，用户以为"什么都没发生过" | 🔴 已启动的导入结果不可知，可能重复导入或误判成功 |
| P1-1 | 恢复期间用户开始新上传应以新任务为准 | 旧任务迟到覆盖，可能显示"导入完成"而新上传未启动 | 🔴 虚假成功反馈（R9） |
| P1-3 | 任务终态后凭据应回收 | 每次冷启动重跑恢复，弹旧任务徽标或反复误报"无法确认" | 🟡 长期噪声与信任损耗 |
| P1-4 | 已启动的 uploadId 再上传应明确拒绝 | 返回 200 且文件被丢弃；跨模块提示"可用原 uploadId 重新导入"不可执行 | 🔴 API 客户端静默丢数据 |
| P1-6 | 清理耗时受限，不拖慢新上传 | 单 tick 内同步扫全量目录，随历史导入数单调增长 | 🟡 导入越多、检索链路越容易被 stall |
| P1-8 | 测试能证明"不重复导入"与"已导入目录不被删" | 前者只验字符串，后者变异存活（删保护仍全绿） | 🟡 D2 保护无回归网，未来误删用户源目录不会被发现 |

**🚧 合入前必须完成（P0）**

| # | 行动项 | 对应功能影响 | 关联语义 |
|---|---|---|---|
| 1 | `ImportPage.tsx:466-469` 退出恢复分支复位 `phase/progressText/uploadErrors`，并给 `while` 加尝试上限 | P0-1 | #A1 |
| 2 | catch 判据由 `!jobId` 改 `!recoveredJobId`，unknown 态保留可执行引导 | P1-2 | #A3 |
| 3 | 补 R5/R6 终态与文档数断言 + 修复清理用例竞态（CF-C 变异必须变红） | P1-8 | #A2/#A4 |

**📌 合入后跟进（P1/P2）**：P1-1 代际令牌、P1-3 终态清凭据、P1-4 409+hint（并同步 `daemon-rpc.ts:146` 与专家 C0）、P1-5 randomUUID 兜底 + `start()` catch、P1-6 清理异步化+预算、P1-7 损坏降级+日志、P1-8 其余缺失用例（鉴权/410/409/aborted/活跃免清理）、P2 全部（含规范与前端可测性改造）。

## 🧪 测试验证建议（交阶段 8，本次因存在阻塞项未执行）

| # | 来源维度 | 验证类型 | 涉及代码 | 建议验证内容 | 原因 |
|---|---|---|---|---|---|
| 1 | 0.8 场景 S1 | 状态机时序 | `ImportPage.tsx:456-469` | 上传中刷新 → active 回落 → phase 是否复位 | 需真实浏览器时序；纯 reducer 可覆盖（抽纯函数后） |
| 2 | 0.8 场景 S4 | 并发交错 | `ImportPage.tsx:432-484` + `start()` | recover 与 start 交错，断言不被旧任务覆盖 | 同上 |
| 3 | 0.9 守恒 | 端到端 | `mcp-http-api.ts:839-842` | 已启动 uploadId 再上传，文件是否被静默丢弃 | 需真实路由 + 落盘 |
| 4 | 维度 2 | 同步临界区 | `mcp-http-api.ts:830-928` | 并发两路最后一批只起一个 job（当前靠"无 await"成立） | 建议固化为回归测试 |
| 5 | 维度 5 | 运行时 | `mcp-http-api.ts:106-142` | 暂存目录数 ×N 时新上传的 event-loop stall 时长 | 需压测数据 |

## 📌 待生效变更台账（阶段 2.3）

ki-search 记忆对本项目不可用（`ki scope list` 仅有 `kafka` 等测试 scope，本项目 scope 无向量 Collection）→ 按约定降级为 AGENTS.md 指针，共 2 项：
1. `.module-experts/知识索引导入专家/C0-使用总览.md` 已知坑行「HTTP `/api/import/status` 返回 404 → 重新 upload + run（上传目录文件仍在可重用 uploadId）」——合入后应为：**同一 uploadId 已启动导入后不可复用重导；run 会返回同一 jobId（202）或 409 状态已失效，须用新 uploadId 重新上传。**
2. `src/lib/daemon-rpc.ts:146` `IMPORT_CANCELLED` hint「可用原 uploadId 重新导入」——合入后应为：**取消后须重新选择文件并用新 uploadId 导入（原 uploadId 已绑定终态任务）。**

---

## 🔧 修复记录（2026-09-28 · 同日）

已修：P0-1、P1-1、P1-2、P1-3（四条同属"恢复流程状态机未收口"）。仅改 `web/src/pages/ImportPage.tsx`。

| 项 | 落地方式 |
|---|---|
| P0-1 | 恢复流程新增 `releaseToIdle()`；"任务未被后端接受"的两条退出路径（无 jobId 退出 / catch 的 404 分支）统一复位 `phase/progressText/uploadErrors`，不再停在 `uploading` 锁死选文件与开始按钮。`while (status.active)` 加 60 次（30s）上限，超时落 `unknown`（`unknown` 不参与任何禁用判定，页面仍可用）并**保留凭据**供下次再认 |
| P1-1 | 引入 `taskGenRef` 代际令牌：`start()` 在首个 await 前自增；恢复流程每一步落地前经 `isStale()` 闸门（卸载或用户已发起新任务即作废），旧任务的迟到写入不再覆盖新任务 |
| P1-2 | catch 判据由闭包旧值 `!jobId` 改为 `!recoveredJobId`（`recoveredJobId` 提到 effect 作用域）：只要曾拿到过 jobId，查不到结果就呈现"状态待确认"，兑现负向需求表"服务重启不得声称成功或失败"；仅"从未被接受"的任务才静默清凭据 |
| P1-3 | 终态（done/failed/cancelled）清凭据：轮询 effect 三条终态分支 + 恢复路径各调 `clearImportCredentialIf`；恢复按 uploadId 找回 jobId 时**回写凭据**，否则后续终态清理匹配不上（该联动已补） |
| 附带 | 清除改为归属判定（`clearImportCredentialIf`）：迟到的恢复不得误删新任务凭据；顺带修掉 P2 之一「全新页面无端显示"部分文件未上传（N）"」与 `:559-561` 缩进破口 |

验证：`cd web && npx tsc --noEmit` ✅ exit 0（中途因我漏掉 `uploadId` 缺失分支的收窄守卫报 TS2345，已补 `if (!recoveredJobId) return;`）· `npx vite build` ✅ exit 0 · 后端零改动（`mcp-http-api.ts` 等与迁移基线逐字节一致）。

**未验证（须补）**：上述三条时序（上传中刷新、恢复窗口内发起新任务、服务重启后找回）都是 effect 内的异步交错，静态改 + 构建不能证明行为正确。本仓前端测试基建（`web/test/markdown-preview.test.mjs` 的 vite `ssrLoadModule`）只能取模块级导出纯函数，跑不了 effect → 需要 P1-8 里的 `recoverLastImport(...)` 纯函数抽离，或浏览器实测（注意：真实导入会写用户知识库，须用一次性 scope）。

未修：P1-4 ~ P1-8 及 P2（含 `crypto.randomUUID` 兜底、清理同步 I/O 预算、元数据损坏降级、409+hint 与跨模块提示、测试补强、架构层"任务状态从视图组件抽 store"）。合入结论维持 ⚠️（P1-4 之后仍有非阻塞但应在合入前评估的项）。

