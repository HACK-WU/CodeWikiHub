---
id: REQ-20261019-001
feature: 目录导入同步清理本地已删除文档
status: 实施中
created: 2026-10-20
updated: 2026-10-20
version: 2
tags: [feat]
document_type: review
---

# Code Review（第 2 轮）：import prune stale 实现收口

## 审查上下文

| 项 | 值 |
|---|---|
| **变更** | `7 文件 +584 −19` + 3 个新文件（805 行）· `src/lib/import-prune.ts`(新)、`test/import-prune.test.ts`(新)、`test/import-prune-e2e.test.ts`(新)、`src/lib/import.ts`、`src/lib/mcp-http-api.ts`、`src/delete-relation.ts`、`web/src/api/httpApi.ts`、`web/src/pages/ImportPage.tsx`、`docs/cli.md`、`docs/configuration.md` |
| **模式 / 需求** | `深度`（净增 ~1.4k 行，超 200 行门槛 → 建议拆分提交，见 `D1`）· `REQ-20261019-001`（名称匹配命中，置信度 🟡）· `[无提交上下文]`（工作区未提交） |
| **检查覆盖** | `18 条（✅9 / ❌5 / ⚠️3 / ➖1）` · 未覆盖维度：无 |
| **既有缺陷** | `2 项（Q12 Q13，非本次范围）` |

---

## 一 · 审查过程

### 1.1 我的理解（后面所有判定的前提，有误请直接指出）

- **业务目标**：目录导入后列出「库里还有、本次目录里已经没有了」的文档，让用户勾选清理；前提是本地仍在的文档一篇都不能被误删，且删除不可逆（物理删除，无回收站）。
- **系统位置**：

  ```text
  Web 导入页（pickMode / pruneStale）
    ▼
  POST /api/import/run ──► handleDirectImport ──► planImportPrune（读 group cache 快照）
    ▼                                                  └─► ImportResult.prune{items, token}
  前端结果卡（勾选）
    ▼
  POST /api/import/prune ──► 重扫暂存目录 + 重算计划 + verifyPruneToken
    ▼
  executeBatchDelete（cache + KB + wiki 源文件 + 向量 + FTS）
  ```

- **整体成功判据**：① run 与 prune 两次计算必须得到**同一候选集**（"看到的 = 删掉的"）；② 未开开关时既有导入零回归；③ 任何本地仍存在的文档都不进候选。

| 位置 | 我以为它要做什么 | 置信度 | 状态 |
|---|---|---|---|
| `src/lib/import-prune.ts:computePrunePlan()` | 零 IO 差集 + 双闸门 + token，纯函数 | 🟢 | ⏩ 未确认 |
| `src/lib/mcp-http-api.ts:handleImportPrune()` | 与 run 同源重算，token 对齐后才删，selected 必填 fail-safe | 🟢 | ⏩ 未确认 |
| `web/src/pages/ImportPage.tsx` 结果卡 | 只展示服务端给的候选，勾选后二次确认删除，失败可重试 | 🟢 | ⏩ 未确认 |
| `docs/cli.md` / `docs/configuration.md`（搭车） | 纠正 delete-relation 的旧文档（不再有回收站、删组走 `ki group delete`） | 🟢 | ⏩ 未确认 |

### 1.2 问题

#### `Q1` · 🟥 本次引入 · 🔴

- **位置**：`src/lib/mcp-http-api.ts:1729`
- **问题**：prune 的越权判据写成 `authScopes && !authScopes.includes(scopeRaw)`，与全站其余 20+ 处 `authScopes !== null && !scopeAllowed(authScopes, …)` 不同；`scopeAllowed` 含 `ALL_SCOPES`（`'all'`）通配而 `includes` 不含。持全权临时 Token（`--token` / `KI_MCP_TOKEN`）的远程客户端授权集合恒为 `['all']`，于是**永远 403**。
- **业务后果**：非回环部署 + 全权 Token 的调用方，清理功能完全不可用，且错误信息是"无权访问该 scope"——会把用户引向排查权限配置，而真正原因是判据写错。
- **依据**：`mcp-http-api.ts:470-486`（`scopes = [ALL_SCOPES]`）、`:345-347`（`scopeAllowed` 定义）；动态验证见 §1.5 T2（② 403 / ③ 200）。
- **链路**：

  ```text
  远程客户端 + --token（授权 ['all']）
    ▼
  handleApiRequest:486  authScopes = ['all']
    ▼
  handleImportPrune:1729  ['all'].includes('ai-docs') === false   ← 缺口
    ▼
  403 Forbidden: 无权访问该 scope（功能永久不可用）
  ```

- **片段**：`if (authScopes && !authScopes.includes(scopeRaw)) {`
- **修复方向**：改成 `if (authScopes !== null && !scopeAllowed(authScopes, scopeRaw))`——一处零成本对齐。

#### `Q2` · 🟥 本次引入 · 🔴

- **位置**：`src/lib/mcp-http-api.ts:1777`
- **问题**：prune 用 `collectMarkdownFiles(dir)`（**默认白名单 `.md`**）重扫暂存目录，而 run 侧用的是 `collectMarkdownFiles(sourceDir, extensions)`，`extensions` 来自 `scopes.<scope>.import.extensions`（`import.ts:727`，`docs/configuration.md:241` 公开支持）。scope 放宽过扩展名（如加 `.mdx`）时，两侧"本次有哪些文件"根本不同 → 候选集不同 → token 必然失配；更危险的是 **`dryRun` 会照此签发 token**，按该 token 删除就会删掉本地仍存在的文档。
- **业务后果**：① Web 端：这类 scope 的删除按钮永远 409「库在这期间发生了变化，请刷新候选清单后重试」，而 UI 没有任何刷新入口 → 功能等于不可用；② 任何按 `dryRun` 结果删除的调用方（设计要求支持）会**物理删除本地仍存在的文档**，不可恢复。
- **依据**：设计 S02 §3.2「为什么首选 uploadId」只堵了"前端拼清单"这一条，未覆盖扩展名口径；动态验证见 §1.5 T1（import 侧 0 条候选 / HTTP 侧重算 3 条假候选，双闸门全过且签发 token，文件仍在本地）。
- **链路**：

  ```text
  run:  collectMarkdownFiles(dir, ['.md','.mdx']) → 5 篇 → 候选 0 → 无 token
  prune: collectMarkdownFiles(dir)              → 2 篇 → 候选 3（x/y/z.mdx）  ← 缺口 :1777
    ▼
  coordRatio = 2/min(2,5) = 1.0  ≥ 0.8（闸门 A 过）
  deleteRatio = 3/5 = 0.6        ≤ 0.8（闸门 B 过）
    ▼
  签发 token → x.mdx / y.mdx / z.mdx 可被删除（本地仍在）
  ```

- **片段**：`scannedRels = collectMarkdownFiles(dir).files;`
- **修复方向**：与 run 同源传扩展名——`collectMarkdownFiles(dir, getScopeImportConfig(requestConfig, scope)?.extensions ?? DEFAULT_EXTENSIONS)`（两个常量/函数该文件已 import）。

#### `Q3` · 🟥 本次引入 · 🔴

- **位置**：`src/lib/mcp-http-api.ts:1788`、`web/src/pages/ImportPage.tsx:1609`
- **问题**：prune 的 `group` 取请求体（前端传的是**结果卡渲染时刻的 Group 输入框实时值** `group.trim()`），而设计 S02 约束 **N-2 明确要求取导入参数快照 `session.params.group`**、"不取前端当前表单值"。当前 `session.params` 只写了 `skipDuplicates` / `pickMode`，没有 `group`。
- **业务后果**：用户导入完成后顺手改了 Group 输入框（改完往往还没提交），再点删除 → 重算作用域漂移 → 候选集不同 → token 失配 → **恒 409**，且提示让人"刷新候选清单"而界面上没有该入口，只能重新导入一遍。
- **依据**：`design/S02_结果字段与删除接口_DESIGN.md` N-2；`ImportPrunePlan` 也未携带计算时使用的 `group`（结构上就无法自证）。
- **修复方向**：① 契约：`UploadSession.params` 增 `group`（run 时写入），prune 优先取 `session.params.group`，body.group 仅作降级；② 或给 `ImportPrunePlan` 增 `group` 字段由前端原样回传。

#### `Q4` · 🟥 本次引入 · 🟡

- **位置**：`web/src/pages/ImportPage.tsx:2535`（文案）、`1600-1630`（`handlePrune`）、`src/lib/import-prune.ts:145-153`
- **问题**：界面承诺"失败项已保留勾选，可重试"，但 token 是候选集指纹——只要本次**有任意一条删除成功**，库变化 → 重算候选集变小 → 新 token ≠ 旧 token → 重试必 409。承诺只在"一条都没删成功"时成立。
- **业务后果**：部分失败后按钮还在、勾选也在，但点下去只会看到"库在这期间发生了变化，请刷新候选清单"——而 `dryRun` 重算接口前端从未调用，用户没有任何刷新手段。
- **依据**：`computePruneToken()` 对候选行做哈希（删掉一条即变）；`pruneImport` 在前端只被 `handlePrune` 调用一次且不带 `dryRun`。
- **修复方向**：① 删除结束后用已支持的 `dryRun:true` 重算并写回新 token/清单（推荐，接口已就绪）；② 或把文案改成"需重新导入刷新清单"。

#### `Q5` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/mcp-http-api.ts:1725-1760`（`uploadId`）、`:1788`（`group`）
- **问题**：入参校验与兄弟入口分叉——`/api/import/preflight`、`/api/import/run` 都过 `isSafeGroupPath`（`:1447` / `:1532`），run 还对 `uploadId` 过 `UPLOAD_ID_RE`；prune 两样都没有，`uploadId` 只靠 `startsWith(root + sep)` 前缀校验，`group` 完全裸用。
- **业务后果**：不构成越权（`..` 前缀校验仍拦得住穿越，非法 group 只退化成 `EMPTY_LIBRARY`），但新入口把"三端同口径"的护栏破了；`uploadId` 可指向上传根下任意子目录，配合 `dryRun` 可把任意外部清单当作"本次目录"。
- **依据**：`run`/`preflight` 同口径注释（`:1531`「Group 合法性：与 /api/import/preflight 同口径」）。
- **修复方向**：补 `isSafeGroupPath` + `UPLOAD_ID_RE`，与兄弟入口逐字一致。

#### `Q6` · 🟥 本次引入 · 🟡

- **位置**：`docs/cli.md:720-726` 与 `:739-748`
- **问题**：「批量删除（`--input`）」整段出现两次，且写法不一致——新增段写 `ki delete-relation --input items.json`（无 `--scope`），旧段写 `ki delete-relation --scope <scope> --input <file.json>`。
- **业务后果**：同一命令两种写法并列，读者无法判断哪个对（strict 模式下 `--scope` 其实必填）。
- **依据**：diff 中新增段 + 未删除的旧段；`delete-relation.ts:517` 的 option 定义支持 `-s`。
- **修复方向**：删掉旧段（保留新增段的措辞，并补上 `--scope` 的 strict 模式说明）。属搭车变更（0.10），**必须先修正确性再谈拆分提交**。

#### `Q7` · 🟥 本次引入 · 🟡

- **位置**：`docs/mcp-http.md`（路由表与 run 参数段）、`docs/import.md`
- **问题**：新增的 `POST /api/import/prune` 未进 HTTP 路由表；`/api/import/run` 新增的 `pickMode` / `pruneStale` / `preserveRels` 也未补；`docs/import.md` 没有任何"目录同步清理"章节。同时 `docs/cli.md:713` 的「不可逆的破坏性操作，**仅通过 CLI 暴露**；MCP 工具仅支持文档级单条删除」已因本改动失真（现在还有一条可批量删 ≤500 条的 HTTP 通路）。
- **业务后果**：Web/外部客户端以 `docs/mcp-http.md` 为契约来源，缺条目等于该接口无契约；安全声明与实现相反会误导后续评估。
- **修复方向**：补路由表 1 行 + run 参数 3 个 + import.md 一节；同步改写 cli.md 的安全声明（见 `D2`）。

#### `Q8` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/import.ts:284`、`web/src/pages/ImportPage.tsx:127-143`
- **问题**：两处"新增注释与代码不符"——① `pickMode` 注释写「CLI 目录导入视为 `'dir'`（见 src/import.ts 调用点）」，但全仓 `pruneStale|pickMode` 只有 `import.ts`（lib）与 `mcp-http-api.ts` 引用，**CLI 从未传这两个参数**（本功能实际上仅 Web 可用）；② ImportPage 里 R1 的历史 JSDoc（记录"ai-docs 从 1859 翻倍到 3741"的实测教训）被新函数 `derivePickMode` 的 JSDoc 顶到上方，`stripTopSegment` 失去文档，形成两段相邻 JSDoc。
- **业务后果**：① 让人以为 CLI 已支持并据此写文档/测试；② 误删一段高价值的事故注释归属。
- **依据**：`grep pruneStale` 全仓结果（仅 lib + http-api 两处）。
- **修复方向**：① 注释改成"CLI 不支持（未传 pickMode/pruneStale）"；② 把 `derivePickMode` 移到 `stripTopSegment` 之后，或把 R1 注释还原给 `stripTopSegment`。

#### `Q9` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/import-prune.ts:296-319`（`readPruneLibSnapshot`）→ 由 `import.ts:758` 在扫描后立刻调用
- **问题**：每次开启开关的目录导入都会 `readAllGroupCaches(scope)` 全量同步读全部分片（按 scope 根过滤发生在读完之后），且这段发生在预算预检/文件过滤**之前**——即使最终导入失败也照付。
- **业务后果**：实测 `ai-docs`（634 组 / 1882 篇）单次 **166ms** 同步 IO，在 daemon 内会阻塞同进程其他请求；`kisearch`（35 组）仅 1.6ms。属于"可接受但可优化"，不是阻塞项。
- **依据**：§1.5 T3 实测数据。
- **修复方向**：按 `groupRoot` 只读子树分片（`collectShardGroupPaths` 已能枚举）；或把 prune 计算挪到预算预检通过之后。

#### `Q10` · 🟥 本次引入 · 🟡

- **位置**：`test/`（缺 `import-prune-api.test.ts`）、`test/import-prune-e2e.test.ts:136`
- **问题**：① `handleImportPrune` 的三个关键分支（token 失配 409 / `selected` 缺失 400 / 候选超限 400）零测试，而兄弟接口早有 API 级测试范式（`test/import-incomplete-api.test.ts` 用 `createMcpHttpServer` + tmp HOME 起真实服务）——本轮 Q1/Q5 两个缺陷正是该层没测才漏的；② 新增 e2e 里 `outcome.deleted ?? …` 的 `deleted` 在 `BatchDeleteResult` 上不存在（`test/` 不在 `tsconfig.include`，所以 tsc 抓不到），该分支恒为 dead。
- **业务后果**：权限/校验类回归无保护；测试里的无效断言会给人"已覆盖"的错觉。
- **修复方向**：照 `import-incomplete-api.test.ts` 补 3 条分支测试；e2e 断言改为 `outcome.results.filter(r => r.deleted).length`。

#### `Q11` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/mcp-http-api.ts:1617-1619`、`:1695`、`web/src/api/httpApi.ts:451`
- **问题**：`preserveRels` 是一条**没有调用方**的管道——run 侧收 body 并透传，prune 侧也有一份（注释称"必须与 run 同口径，否则 token 恒失配"），但 Web 两个调用点都不传、CLI 根本不可达，只有测试在用。上传不完整时实际生效的是 `uploadIncomplete` 硬闸门。
- **业务后果**：看起来解决了"上传失败文件不能被当已删"的场景，实际 Web 路径永远走硬闸门整次关闭清理——用户会看到"本次有文件未上传成功，已跳过清理"，而代码里那条"只排除失败文件、其余照常清理"的路径从未被走过。
- **依据**：全仓 `preserveRels` 引用（lib / http-api / 前端类型 / 测试），前端无一处赋值。
- **修复方向**：二选一——① 前端从 upload 结果收集失败 rel 并同时传给 run 与 prune（兑现 R11 体验路径）；② 明确标注"仅 CLI/脚本可用"并删除前端死字段（见 `D3`）。

### 1.3 既有缺陷（非本次范围）

#### `Q12` · ⬜ 既有 · 🟡

- **位置**：`src/lib/import-budget.ts:78`、`src/lib/mcp-http.ts:605`
- **问题**：`tsc --noEmit` 两条既存错误（`DISABLED` 当类型用 / `process.getActiveResourcesCount` 不存在）。本次改动零新增。
- **建议**：另开任务清理，不并入本次。

#### `Q13` · ⬜ 既有 · 🟡

- **位置**：`test/import-prune-e2e.test.ts` 依赖的 `test/` 目录整体不在 tsc 覆盖内
- **问题**：`tsconfig.json` 的 `exclude` 含 `test`，测试文件的类型错误只能靠人工发现（Q10② 就是实例）。
- **建议**：另开任务评估是否给 `test/` 单独一份 `tsconfig`。

### 1.4 待验证项

无（原 3 项已由阶段 8 动态验证关闭，见 §1.5）。

### 1.5 动态验证（阶段 8）

| # | 验证内容 | 方式 | 结果 |
|---|---|---|---|
| `T1` | `import.extensions` 口径分叉是否产生假候选 | `.codebuddy/review/data-flow-test/prune-extensions-gap.mjs`（真实 `handleDirectImport` + 真实 group cache） | ❌ 复现：import 侧候选 0，HTTP 侧重算候选 3（`x.mdx/y.mdx/z.mdx` 仍在本地），`coordRatio=1`、`deleteRatio=0.6`，**双闸门全过 + 签发 token** |
| `T2` | 全权 Token 是否被误拒 | `.codebuddy/review/data-flow-test/prune-auth-wildcard.mjs`（同一 handler 三档对照） | ❌ 复现：① 回环 200；② 远程 + `['all']` **403**；③ 远程 + `[scope]` 200 |
| `T3` | 全量读缓存耗时 | 直接调用 `readAllGroupCaches` | `ai-docs` 634 组/1882 篇 = **166.2ms**；`kisearch` 35 组 = 1.6ms |
| `T4` | 既有单测 / 类型 | `npx jiti test/import-prune*.test.ts`、root `tsc`、web `tsc` | 23/23 · 5/5 · root tsc 仅 2 条既存错误 · web tsc 0 错 |

---

## 二 · 结论

### 2.1 合入结论

**⚠️ 修复 `Q1` / `Q2` / `Q3` 后可合入**

阻塞项：`Q1`（🟥🔴 鉴权判据致全权 Token 403）、`Q2`（🟥🔴 扩展名口径不同源，最小后果是功能恒 409、最坏是删掉本地仍在的文档）、`Q3`（🟥🔴 `group` 取表单实时值，违反设计 N-2）
既有缺陷：2 项（`Q12` `Q13`，不阻塞）
理由：三项都在 `handleImportPrune` 一个函数内、均为 1~3 行级修复，改完即满足"看到的 = 删掉的"这一整体成功判据；`Q4`~`Q11` 建议同批收口但不阻塞。

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|---|---|---|---|
| 🔑 语义一致性 | 4/10 | ❌ | `Q2` / `Q3`：脚本层面的"同源"只做到了算法同源，输入（扩展名 / group）没有同源 → token 契约在最需要它的边界上失效 |
| ⚠️ 安全性 | 6/10 | ⚠️ | `Q1` 鉴权判据破通配；`Q5` 入参校验分叉。加分项：`selected` 必填 fail-safe、路径复用 `sanitizeOnlyRelPaths`、物理删除在 UI 双重警示 |
| 🐛 Bug 风险 | 5/10 | ❌ | `Q1`~`Q4` 均为可复现的行为缺陷，其中两条已动态证明 |
| 📐 代码规范 | 6/10 | ⚠️ | 注释密度与风格很好，但 `Q8` 注释说反了、`Q6` 文档段落重复 |
| 🏗️ 架构设计 | 7/10 | ⚠️ | 纯函数 `computePrunePlan` + 薄包装 `readPruneLibSnapshot` + 组合 `planImportPrune` 分层干净，`...(prune ? {} : {})` 保证零回归；扣分在"同源"只落在函数级而非输入级 |
| ⚡ 性能 | 8/10 | ✅ | 仅开关开启时一次全量缓存读，实测 166ms（`ai-docs`）；`Q9` 有优化空间但不阻塞 |
| 🧪 测试覆盖 | 6/10 | ⚠️ | 纯函数 23 例锁定双闸门 + e2e 5 例真实链路（含 token 一致性、preserveRels 影响）很扎实；HTTP 层零测试（`Q10`） |

整体评分 **C**（6.0，存在未修复阻塞项时上限 C）。

### 2.3 需要你拍板

#### `D1` · 是否拆成 3 个提交

- **背景**：本次混了三条意图——① prune 功能（主体）；② `docs/cli.md` / `docs/configuration.md` / `delete-relation.ts` 的 delete-relation 文档纠偏（搭车，`Q6` 缺陷就在这条线里）；③ 测试文件。单次 ~1.4k 行已超"巨型"门槛。
- **为什么要你定**：拆与不拆影响回滚粒度；`Q6` 按 0.10 必须先修正确性，拆分不能替代修复。
- **选项**：拆（feat / docs / test 三提交，推荐）/ 保持单提交。

#### `D2` · 新 HTTP 批量删除通路与"仅通过 CLI 暴露"的安全声明如何取舍

- **背景**：`docs/cli.md` 一直写着"不可逆的破坏性操作，仅通过 CLI 暴露"，本次新增的 `/api/import/prune` 一次可删 ≤500 篇，任何持有该 scope 授权 Token 的远程客户端都能调用。
- **为什么要你定**：这是产品安全姿态的选择，不是代码对错。
- **选项**：① 维持现状 + 改写文档声明；② 加护栏（如仅回环可用 / 需显式配置开关）；③ 下调 `PRUNE_MAX_ITEMS`。

#### `D3` · `preserveRels` 是补完还是删掉

- **背景**：见 `Q11`——管道两端都建好了，中间没有调用方；Web 路径实际生效的是 `uploadIncomplete` 硬闸门。
- **为什么要你定**：补完需要前端收集 upload 失败清单（目前上传失败即整批重传），改动比删字段大。
- **选项**：① 本次补完（前端收集失败 rel）；② 标注"仅脚本可用"并保留；③ 删除该字段与相关注释。

### 2.4 亮点

- `computePrunePlan` 做成**零 IO 纯函数**，23 条场景用例把双闸门的边界（80%、500 上限、sourcePath 为空、路径归一）钉死——这是本轮所有 🔴 里唯一没有翻车的部分。
- 三条 return 路径统一用 `...(prune ? { prune } : {})`，未开开关时 `ImportResult` 结构完全不变，既有消费方零影响。
- `prune` 候选**刻意不进** `TaskResultSnapshot`（设计 N-3），避开了任务台账 32KB/20 条上限的坑——核对实现一致。
- e2e 里第 ④ 条用例专门锁住"漏传 `preserveRels` 就会恒 409"这个上一轮缺陷，属好的回归意识。

---

## 三 · 复检记录（2026-10-20，修复后）

> 只按 §1.2 阻塞项与约定清单逐条复检，不重跑整轮 review。

| 项 | 原结论 | 复检结论 | 证据 |
|---|---|---|---|
| `Q1` 鉴权判据 | ❌ 全权 Token 恒 403 | ✅ 已修 | `mcp-http-api.ts:1749` 改用 `scopeAllowed`；`test/import-prune-api.test.ts`「远程 + 授权 ['all'] → 200」通过 |
| `Q2` 扩展名不同源 | ❌ 假候选 / 恒 409 | ✅ 已修 | `mcp-http-api.ts:1809-1810` 传 `getScopeImportConfig(...).extensions`；`test/import-prune-api.test.ts`「scope 放宽扩展名（.mdx）→ 仍在本地的那批文件不得进候选」通过（`judicable=3`、`total=0`） |
| `Q3` group 取表单值 | ❌ 违反设计 N-2 | ✅ 已修 | run 写 `session.params.group`（`mcp-http-api.ts:1679`），prune 优先取快照（`:1813-1815`）；新增用例「group 取 run 时的会话快照」通过 |
| `Q4` 失败重试承诺 | ❌ 删成功一条即 token 失效 | ✅ 已修 | 前端新增 `refreshPrunePlan`（dryRun 重算换新 token）+ 手动「重新计算候选」兜底；`activePrune` 覆盖 `result.prune` |
| `Q5` 入参校验分叉 | 🟡 | ✅ 已修 | 补 `UPLOAD_ID_RE`（`:1786`）与 `isSafeGroupPath`（`:1816`）；两条 400 用例通过 |
| `Q6` cli.md 段落重复 | 🟡 | ✅ 已修 | 删除旧段，保留单段并补 `--scope` 说明 |
| `Q7` 文档缺口 | 🟡 | ✅ 已修 | `docs/mcp-http.md` 补 `/api/import/prune` 行 + run 新参数 + 「三条同源约束」段；`docs/import.md` 新增「目录同步清理」节；`docs/cli.md` 安全声明改为三条通路 |
| `Q8` 注释与实现不符 | 🟡 | ✅ 已修 | `import.ts:281-282` 改为"仅 Web 使用，CLI/daemon 不传"；ImportPage 的 R1 JSDoc 归位到 `stripTopSegment`，`derivePickMode` 移到其后 |
| `Q9` 全量读缓存 166ms | 🟡 | ⏳ 保留 | 已确认仅开关开启时发生、且有 precheck 短路；`group` 维度裁剪收益仅在显式 group 时存在，暂不改动共享模块 `group-cache.ts`（记入遗留） |
| `Q10` handler 零测试 | 🟡 | ✅ 已修 | 新增 `test/import-prune-api.test.ts` 12 例（鉴权 3 / 校验 6 / 同源 2 / token 语义 1）；e2e 无效断言 `outcome.deleted` 已改为按条统计 |
| `Q11` preserveRels 无调用方 | 🟡 | ✅ 已标注 | `import.ts` 文档注释写明"当前无生产调用方，脚本可用；给 run 传则 prune 必须同传"（保留字段，不删公开面） |

**验证（全绿）**

| 项 | 结果 |
|---|---|
| `test/import-prune.test.ts` | 23/23 |
| `test/import-prune-e2e.test.ts` | 5/5 |
| `test/import-prune-api.test.ts`（新） | 12/12 |
| 回归：`import-incomplete-api` / `import-preflight` / `import-path` / `task-snapshot` / `lib` | 20/20 · 7/7 · 4/4 · 13/13 · 37/37 |
| root `tsc --noEmit` | 仅 2 条既存错误（`Q12`） |
| web `tsc --noEmit` / `npm test` / `npm run build` | 0 错 / **454/454** / 成功 |
| root `npm run build` | 成功 |

**结论更新**：合入结论由「⚠️ 修复 Q1/Q2/Q3 后可合入」→ **✅ 可合入**（阻塞项已清零）。整体评分 C → **A（8.6）**：

| 维度 | 原 → 新 | 说明 |
|---|---|---|
| 语义一致性 | 4 → 9 | 三条同源约束落到代码 + 用例 |
| 安全性 | 6 → 9 | 鉴权/入参口径与全站一致，仍保留 selected 必填与路径净化 |
| Bug 风险 | 5 → 8.5 | 阻塞项清零；`Q9` 为已知可接受项 |
| 代码规范 | 6 → 9 | 文档重复消除、注释与实现对齐 |
| 架构设计 | 7 → 8.5 | 仍建议后续把「同源输入」抽成单一构造器（当前靠三处注释约束） |
| 性能 | 8 → 8 | 未变（`Q9` 保留） |
| 测试覆盖 | 6 → 9 | 三层测试齐备（纯函数 / 链路 / HTTP） |

**未做**：`D1` 拆提交、`D2` 安全姿态取舍、`D3` preserveRels 去留 —— 均待用户拍板；UI 侧本轮未做浏览器走查（改动为状态管道 + 未新增视觉元素），已由 `web tsc` 与 454 条既有用例兜底。
