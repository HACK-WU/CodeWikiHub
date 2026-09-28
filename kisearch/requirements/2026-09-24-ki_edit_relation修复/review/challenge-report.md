# 🎯 质疑报告：ki_edit_relation 修复（两轮）

> 对象：① 三方审查 P0/P1 的修复（第一轮）② 复审遗留项的修复（第二轮，计划 `.plans/2026-09-24-fix-edit-relation-residual-findings/`）
> 基线：`HEAD f93db24` + 工作区未提交改动
> ⚠️ 落盘说明：第一轮报告原写于 `.requirements/2026-09-24-ki_edit_relation修复/review/`，该目录未随 2026-09-24 18:13 的 `storage_path` 迁移（新路径 `CodeWikiHub/kisearch/requirements`）保留，故在此重建：第一轮保留结论摘要，第二轮为完整内容。

---

## 第一轮（摘要，2026-09-24）

- 范围：P0-1 伪造行号 / P0-2 草稿死锁 / P1-1 retryable / P1-2 草稿外部感知 / P1-3 快照复活 / P1-4 清理上界 / P1-5 隐藏集缓存 / P1-6 工具契约 / P1-7 跨进程竞态。
- 裁决：**⚠️ 修后放行**（0 高风险 / 3 中 / 2 低）；主修复经 8 条新回归 + patch 回滚法证明"修复前必失败"。
- 成立项：① archive 保留上限属未授权产品决策（删文件）；② `tar --exclude` 未在 Windows 实测；③ 搜索宽兜底可能给出同文档相似段落行号（已带降级标记）。
- 判定不成立/已缓解：数据守恒三问（清理候选有 `otherReferences`+`newDense`+`fetchDocs` 探测三重保护）、单进程串行、`relationIndexMode` 优先级为有意护栏。
- 全局回扣：目标 ✅ / 位置 ✅ / 判据 ✅（"任何草稿必有终态"由 ❌→✅）。

---

## 第二轮（完整，2026-09-24）：复审遗留项修复

**范围**：W1 终态草稿过滤 / W2 prune 单测 / W3 cancel RPC 超时 / W4 归档 unlink 失败一致性 / W5 注释与混合态用例 / W6a 单-owner 前提注释。

### 质疑 #A1：搭车变更（W5 是否借修复逃过评审）

- 🏷️ 类型：搭车变更 — 光环质疑
- 📍 涉及：`relation-edit-live.ts`、`scoring.ts`、`mcp-http-api.ts`
- ❓ 质疑点：W5 属 P3 注释类改动，是否夹带行为变更？
- 🔍 验证方法：`git diff` 逐行核对三文件 → 全部为注释块（无语句改动）；相关套件 mcp-http-api 30/30、import-vector-rebuild 13/13 通过。
- 📊 判定：**不成立**（无行为改动）。

### 质疑 #A2：数据守恒 — 过滤终态是否放开本该阻断的删除

- 🏷️ 类型：数据守恒 — 流向 / 异常归宿
- 📍 涉及：`relation-edit-draft.ts::activeDrafts`
- ❓ 质疑点：跳过 published/cancelled 后，是否存在"仍需保护却被放行"的场景？
- 🔍 验证方法：追 `status='published'` 的唯一写入点 → `relation-edit-publish.ts:375-378`（wiki 写回 → `cleanupOldIds` → 才置 published）。即 **published ⇒ 旧索引清理已完成**；清理失败走 catch 变 `failed`（仍阻断）。cancelled 为终态。保存中窗口（archive 已写、活动文件未删）读到的是旧状态（running/failed）→ 仍阻断（保守方向）。
- 📊 判定：**不成立**（放开面仅限已完成场景）；用例 22 同时断言 editing 仍阻断。

### 质疑 #A3：RPC 超时与工具层**等值**会赛跑（成立 — 已修）

- 🏷️ 类型：修复完整性 — 异常形态
- 📍 涉及：`edit-relation.ts::editRelationRpcTimeoutMs`
- ❓ 质疑点：cancel 的 RPC 300s 与工具层 `TOOL_TIMEOUT.BULK` 300s 等值 → 谁先触发不确定；RPC 先触发时调用方拿到**传输层错误**而非可判定的 `ToolTimeoutError`。
- 🔍 验证方法：读 `daemon-client.ts:149-158`（RPC 超时 reject）与 `mcp-tools/util.ts:11-16`（ToolTimeoutError）；用例 24 原用 `>=` 断言，掩盖了等值。
- 📊 置信度：高 ｜ **处置：已修** —— cancel 改 `330_000`（留 30s 余量，工具层成为唯一出口），不变量用例收紧为严格 `>`；`npm run build` + edit-relation 26/26 复跑通过。

### 质疑 #A4：归档裁剪按条数而非字节（成立 — 后续项）

- 🏷️ 类型：极端联想 — 资源
- 📍 涉及：`relation-edit-draft.ts::ARCHIVED_DRAFT_RETENTION`
- ❓ 质疑点：上限是**条数** 200，磁盘上界 ≈ 200 × 2 ×（baseContent + content）；能进草稿但被 chunk 上限拒绝的大文档（例如 600KB+，见用例 19）会把上界放大到数百 MB。
- 🔍 验证方法：静态推导 + 真实语料量级对比（本机 KB 文档多为 KB~几十 KB → 上界几 MB~几十 MB，可忽略）。
- 📊 判定：**成立但不阻塞**（🟡）→ 转后续项 W7："总字节 + 单条上限"裁剪。

### 质疑 #A5：W4 测试覆盖边界

- 🏷️ 类型：测试覆盖
- 📍 涉及：`test/edit-relation.test.ts` 用例 25
- ❓ 质疑点：用"活动路径替换为目录"注入 unlink 失败，是否覆盖了"两处状态一致"的修复意图？
- 🔍 验证方法：`store.ts:23-26` 的 `readJson` 在目录上抛 EISDIR → 该形态下 `loadDraft` 回落路径不可断言（属另一分支）；root 下无法用只读权限注入 unlink 失败。
- 📊 判定：**非缺陷，属已知覆盖边界**（记入计划「决策与偏差 #4」）：用例仍钉住核心行为——不再抛错、终态落 archive、显式告警、残留不被当作在途草稿。

### 🌍 全局回扣（第二轮）

| 全局质疑 | 回扣结论 | 证据 |
|----------|----------|------|
| 目标回扣 | ✅ 成立 | 目标"草稿生命周期处处有出口"：删除边（W1）、归档边（W4）、超时边（W3）三条残留路径本轮补齐 |
| 位置回扣 | ✅ 成立 | MCP 工具 → `executeEditRelation`（RPC / 本地两路）→ `saveDraft` / `activeDrafts` → `delete-relation` 卫兵；无跨模块语义外溢 |
| 判据回扣 | ✅ 全部成立 | ①终态残留不再阻断删除 ②归档裁剪有证据且不碰活动目录 ③超时形态确定 ④既有套件全绿（edit-relation 26/26 + 另 7 套件）⑤4 条新用例经 patch 回滚验证"修复前必失败" |

### 📊 第二轮裁决

- 总质疑数：5（成立 2 / 不成立 2 / 待观察 1）
- 高风险：0 ｜ 中风险：1（#A3，已修）｜ 低风险：1（#A4，转 W7）
- **裁决：✅ 放行**

---

## 未闭合项（交接）

| # | 项 | 级别 | 状态 |
|---|----|------|------|
| W7 | 归档裁剪由"条数 200"扩展为"总字节 + 单条上限" | 🟢 | 后续项 |
| — | Windows 下 `tar --exclude` 实测 | 🟡 | 待环境 |
| — | 第一轮报告全文（本文件仅摘要） | 🟢 | 随 `.requirements` 迁移未保留；如需可依对话记录补齐 |

---

## 第三轮（2026-09-24）：W6b 跨进程误判消除（心跳租约方案）

**背景**：`view` 的中断恢复判据（KB 已换 + cache 未换 + 未登记 publishedRevision）与"发布临界区"重叠；`activeJobs`/`OperationCoordinator` 都是进程内的，另一 owner 进程会把它误判成崩溃残留并回滚 KB → 永久不一致。用户批准方案 **(b) 心跳租约**（放弃方案 (a) scope 级锁）。

### 质疑 #B1：租约位置是否真能覆盖有害窗口

- 🏷️ 类型：修复完整性 — 位置正确性
- 📍 涉及：`publishLocalKbAndCache` 内的 `beginPublishLease`
- ❓ 质疑点：最省事的实现是拿**草稿文件的 mtime/updatedAt** 当租约，为什么要在临界区内另写心跳？
- 🔍 验证方法：追 `runFinish` 时间轴 —— 最后一次草稿写盘是"登记暂存 ID"（`relation-edit-publish.ts`），其后还有 dense `vectorBulkStore`（**含 embedding，可达数秒~数分钟**），才到 KB 写。若用草稿 mtime，租约在有害窗口时已"过期"，把关形同虚设。
- 📊 判定：**设计成立**（心跳紧贴 KB 写置位，租约新鲜度与窗口严格对齐）；该取舍已记入计划「决策与偏差 #7」。

### 质疑 #B2：是否引入"发布被阻断"的新失败模式

- 🏷️ 类型：副作用 — 新增失败模式（这是方案 (a) 锁的主要代价）
- 📍 涉及：`beginPublishLease` / `endPublishLease`
- ❓ 质疑点：心跳写失败或残留会不会让发布失败/卡住？
- 🔍 验证方法：`beginPublishLease` 的写入失败被吞（照常发布）；`endPublishLease` 只删自己的文件、失败仅留下一个会自然过期的文件；租约**从不被发布路径读取**，只被 `view` 的恢复判据读取。
- 📊 判定：**不成立**（无新阻断路径）。

### 质疑 #B3：崩溃恢复是否退化

- 🏷️ 类型：副作用 — 恢复能力
- 📍 涉及：`edit-relation.ts` view 分支、`runFinish` 内部恢复
- ❓ 质疑点：租约会不会让"发布方崩溃"永远无法恢复？`finish` 重试是否被连带影响？
- 🔍 验证方法：①租约 60s 过期后 `view` 回到原有恢复逻辑并给出"沿用 request_id 重试 finish"（用例 26 的 ② 断言回滚 + 提示）；②`runFinish` 自己的 `recoverInterruptedPublication` **不经**这道把关（它就是要接管上次崩溃现场）→ 崩溃后立即用 finish 重试仍然生效。
- 📊 判定：**不成立**（恢复延迟上界 = 租约有效期；重试路径不受影响）。

### 质疑 #B4：新文件是否会污染既有枚举

- 🏷️ 类型：副作用 — 数据链路
- 📍 涉及：`{.relation-edits}/{editId}.publish`
- ❓ 质疑点：这个新文件会不会被当成草稿、影响隐藏集/删除卫兵/归档裁剪/备份还原？
- 🔍 验证方法：`activeDraftFiles` 只认 `/^[a-f0-9-]{36}\.json$/i`（`.publish` 不匹配）→ 隐藏集、`activeDrafts()`、`pruneArchivedDrafts` 均不受影响；`backup --exclude .relation-edits` 整体排除、restore 清空该目录（崩溃残留的租约也随之消失）。用例 27 断言发布结束后心跳不存在且 `activeDrafts()` 为空。
- 📊 判定：**不成立**。

### 质疑 #B5：数据守恒

- 🏷️ 类型：数据守恒 — 三问
- 📍 涉及：心跳文件本身
- ❓ 质疑点：新增写入是否改变了 KB/cache/向量/草稿内容？
- 🔍 验证方法：心跳只写自己目录下的一个文件；`publishLocalKbAndCache` 的 KB/cache 写入顺序与内容**逐字节未变**（仅包了 try/finally）；`git diff` 可核对。
- 📊 判定：🟰 效果一致，**不成立**。

### 📊 第三轮裁决

- 总质疑数：5（成立 0 / 不成立 5；其中 #B1 的取舍已记入计划偏差）
- 高风险/中风险：0 / 0 ｜ **裁决 ✅ 放行**
- 证据：用例 26（回滚把关 → **必失败**）、用例 27、edit-relation 28/28、dense/fts 真实发布 e2e 各 1/1、`npm run build` 通过
