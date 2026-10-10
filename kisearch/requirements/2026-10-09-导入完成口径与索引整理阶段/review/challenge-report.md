# 质疑报告：S-01 读解耦 + S-02 索引可观测（challenger 二次质疑）

> 质疑对象：**代码变更**（新增功能 + 优化混合）→ 采用 feature/optimization 策略，并叠加三项通用加压（数据守恒 / 全局回扣 / 搭车变更）
> 调用方：`auto-review`（code-review 结论 ✅ 且属复杂场景 → 自动接力）
> 关联需求：REQ-20261009-003（子需求 S-01 / S-02）

---

## 一、成立质疑

### C1｜🔴 阻塞（**已修复并复验**）回滚路径的元数据写不在提交窗口内

- 📍 位置：`import.ts` `restoreLocalKb()`（内部 `removeFromLocalKb` 会**删 KB**）与失败回滚点的 `persistTouchedGroups()`；`operation-coordinator.ts` 窗口只覆盖导入 Phase 4。
- 🔍 质疑推理：P0-1 修复后，读已可**旁路** engine-only 长任务（导入）。导入失败时的回滚（删 KB / 重落分片）发生在窗口之外 → 读可与回滚并发 → 正是选项 b 排除的形态：**"列表里在、点开 404"**。
- 💡 修法：把窗口**下沉到 helper**（`persistTouchedGroups` / `restoreLocalKb` 各自包一层），并让窗口**可重入**（`committing` 由 `Set` 改为**深度计数** `Map`，内层退出不提前放开）；新增同步版 `withMetadataCommitSync()`（回滚是同步代码，不能用 async 窗口）。
- ✅ 复验：新增测试 **⑧（可重入：内层同步窗口退出后仍保持）**；协调器测试 **8/8**；`import-*` 10 套件 + `mcp-http*` 2 套件 notok=0；e2e 对照收益保持（导入 2095ms 期间 **read 排队 0ms**、write 1593ms）。

### C2｜🟡 中 `doc/edit` GET（read）与 POST（write）的 revision 语义

- `/doc/edit` GET 是 read → 可与导入并发，可能读到"正文已新、元数据仍旧"，其 `expectedRevision` 也因此来自旧快照；
- 而 `/doc/edit` POST 是 write → 会等导入结束才执行 → 届时 revision 已变，**大概率返回 `DOC_EDIT_CONFLICT`**。
- 影响：导入期间编辑文档可能被"冲突"拒绝（**无数据损坏**，可解释）。建议 UI 在导入期提示"编辑可能冲突"，或 GET 也纳入提交窗口（牺牲读即时性）。**登记待产品确认**。

### C3｜🟡 中 其他长引擎操作仍阻塞同 scope 读

- `rebuild-vector` / `restore-snapshot` / `sync-relation` 仍是 `write` → 期间读仍等待。与 S-01 属同类问题，但**各自必须先把元数据写包进提交窗口**才可标 `engine-only`。**登记 P1**（已在 code-review 报告中同列）。

### C4｜🟡 低 TTL 过期后快照不返回 `indexCompleteness`

- `readVectorDimensionSnapshot` 在过期/stale 分支返回 `unknown` 形态（不含完成度）——既有语义（"过期即未知"）。消费方需重新 refresh 才可见。**登记 P2**。

### C5｜🟡 低 `globalRunning`（全局独占任务）仍阻塞 read

- 一致性快照等全局任务期间读仍等待——设计如此（全局任务语义为独占全部 scope）。**登记 P2**，如需旁路须单独评估。

---

## 二、不成立 / 认可点（反证）

| 质疑 | 反证结论 |
|---|---|
| 「`vector-dimension-snapshot` 的字段修复与 `health-check` 展示属搭车变更」 | **不成立**：二者是 S-02 的必要组成——不修则新字段在 **GET 快照路径静默不可见**、在 **doctor 路径不可读**。已在 review 报告单独立案并验证（测试 ③/⑤ + e2e） |
| 「读解耦绕过了原子写假设」 | **不成立**：写路径未改，`walWrite`（`.tmp` + `rename`）仍是唯一入口；读探针在导入进行中实读到完整 347B 清单 |
| 「窗口会在取消/中断时被撕裂」 | **不成立**：窗口体是同步语句（`writeJson` / `migrate` / `persistCacheShape`），无 `await` 中断点；`finally` 保证计数复位 |
| 「读会与导入的 KB flush 并发 → 必现不一致」 | **部分成立但已授权**：覆盖导入期可能出现"正文新、元数据旧"，这是用户拍板**选项 b 时明确接受**的形态，且已在 `import.ts` KB flush 处注释留痕 |

---

## 三、数据守恒（三问 + 贯通两问 + 异常归宿）

| 检查 | 结论 |
|---|---|
| 流向 | `/doc/list` 读源（relations 分片 + 清单）未变 ✓ |
| 数量 | 未改动任何过滤/去重；协调器只改"何时可执行" ✓ |
| 内容 | 读到的仍是 `walWrite` 原子替换后的完整文件 ✓ |
| 异常归宿 | 导入失败回滚：新增窗口覆盖（C1 修复后）→ 不再有"KB 已删但分片仍在"的可见窗口 ✓ |
| 贯通（新增 `indexCompleteness`）| 正向：native `stats` → worker → `InfoResultPayload` → `engine.info()` → `vectorCollectionDiagnostics` → `getVectorDimensionStatus` → 快照（写/读）→ doctor/HTTP，**全链贯通** ✓；反向：有生产（native）与消费（doctor + HTTP），非死字段 ✓ |

---

## 四、全局回扣

- **目标回扣**：现场痛点"导入期间该 scope 页面打不开（25s 超时）"→ e2e 实测读排队 **0ms**；失败导入回滚期的一致性由 **C1 修复**覆盖 ✓
- **位置回扣**：`/doc/list`、`/doc/edit` GET → 协调器 → 元数据文件；引擎与导入语义未被改动 ✓
- **判据回扣**：① 读不等整段导入 ✓ ② 无"列表里在、点开 404" ✓（短写互斥 + 窗口含回滚）③ import/daemon 对外语义不变 ✓（10+2 套件全绿 + e2e 字段正常）④ 索引是否已建可观测 ✓（doctor/HTTP 5 项断言）

---

## 五、结论

- 成立质疑 **5 条**：其中 **C1 为阻塞级、已修复并复验**；C2/C3 为 P1 登记；C4/C5 为 P2 登记
- 复验后**合入结论：✅ 可直接合入**（与 `code-review.md` 结论一致）
