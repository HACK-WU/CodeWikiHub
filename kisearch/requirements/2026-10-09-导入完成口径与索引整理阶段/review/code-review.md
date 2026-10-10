# Code Review Report：S-01 读解耦 + S-02 索引状态可观测

**审查对象**：工作区未提交改动（本轮）——10 个源文件 +104/−11（另新增 `test/coordinator-read-lane.test.ts` 与 3 个验证脚本）
**关联需求**：REQ-20261009-003《导入完成口径两级化与索引整理阶段》（用户指定，命中子需求 S-01 / S-02）
**整体评分**：**B**（发现 1 个 P0，**已修复并复验**；修复后结论 ✅ 可合入）
**结论性质**：**已验证**（实跑 `tsc --noEmit`、13 个测试套件、2 个端到端脚本）

---

## 🎯 功能意图（阶段 3）

**🌍 全局图景**：业务目标＝导入期间该 scope 页面仍可浏览（现场 25s 超时 → <1s）；系统位置＝`/doc/list` 读请求 → 协调器队列 → 元数据文件；整体成功判据＝① 读不再等整段导入 ② 不出现"列表里在、点开 404" ③ 既有 import/daemon 对外语义不变 ④ 索引是否已建可被观测。

| 代码位置 | 推测意图 | 确认状态 | 置信度 |
|---|---|---|---|
| `operation-coordinator.ts:submit/conflicts` | 让纯元数据读旁路引擎长任务、但仍与元数据写互斥 | ✅ 已确认（用户"按建议来"＝选项 b） | 🟢 |
| `import.ts:1542-1553` | 把真实落盘收进"元数据提交窗口" | ✅ 已确认 | 🟢 |
| `mcp-http-api.ts:488-517` | `/doc/list`、`/doc/edit` GET 走 read 通道 | ✅ 已确认 | 🟢 |
| `worker.ts / engine.ts / vector-client.ts / snapshot / health-check` | 暴露 `indexCompleteness` | ✅ 已确认 | 🟢 |

## 📊 维度评分

| 维度 | 评分 | 状态 |
|---|---|---|
| 🔑 语义一致性 | 9/10 | ✅ |
| ⚠️ 安全性 | 10/10 | ✅ |
| 🐛 Bug 风险 | 9/10 | ✅（P0 修复后） |
| 📐 代码规范 | 9/10 | ✅ |
| 🏗️ 架构设计 | 8/10 | ✅ |
| ⚡ 性能 | 9/10 | ✅ |
| 🧪 测试覆盖 | 8/10 | ✅ |

---

## 🔴 严重问题（已修复）

### P0-1｜read 通道会与"短写"任务并发 → 可能读到"列表里在、点开 404"

- 📍 位置：`src/lib/operation-coordinator.ts` `conflicts()`（初版实现）
- 🔍 问题：初版规则是「`read` 只与元数据提交窗口互斥」。但**只有导入的元数据写被包进了窗口**；`doc/edit` POST、delete 流程、`sync-relation` 等短写任务仍在窗口之外写 KB/分片 → 读会与它们并发，正是选项 b 要排除的形态。
- 💡 修复：引入任务类型 **`engine-only`**（长引擎任务，其元数据写全在窗口内）与 `runningEngineOnly` 计数；
  - `read` 冲突条件改为：`committing.has(scope) || (running − runningEngineOnly) > 0`
  - 即：读**只**旁路 engine-only 长任务，与任何非 engine-only 写仍串行
  - 导入在 `daemon-rpc.ts:459-489` 标记为 `engine-only`（其余操作保持 `write`）
- ✅ 验证：新增测试 ⑥（read 必须等短写）、⑦（read 旁路 engine-only / write 仍与 engine-only 互斥）；全部 7/7 通过；e2e 对照复跑仍为 **read 0ms vs write 1631ms**。

## 🟡 建议改进

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| 1 | `health-check.ts:445-455` | `indexCompleteness` 为 `{}` 时会渲染出「；索引完成度 」空尾巴 | 已修（加 `Number.isFinite` 过滤 + 非空判定） |
| 2 | `operation-coordinator.ts:conflicts` | `globalRunning`（全局独占任务，如一致性快照）仍会阻塞 read | 设计如此，**未改**（保守：全局任务语义是独占全部 scope） |
| 3 | `daemon-rpc.ts:459` | `rebuild-vector` / `restore-snapshot` / `sync-relation` 仍是 `write`，期间同 scope 读仍等待 | 范围外，登记为后续（需先各自把元数据写包进提交窗口才可标 engine-only） |
| 4 | `operation-coordinator.ts:runMetadataCommit` | 该窗口不占 `maxWorkers` 配额（它是"窗口"而非任务） | 已注释说明；语义正确（窗口必须与占用它的任务同生命周期） |

## 🟢 亮点

- 复用既有「只读通道」与 manifest/revision 缓存机制，改动面小（+104 行）而收益明确
- 顺带修掉 `readVectorDimensionSnapshot` **重建返回对象时丢新字段**的真 Bug（GET 路径原本静默失效）
- 证据链完整：确定性单测（7 例）+ e2e 新旧对照 + S-02 三形态读数，全部可复跑

## 📝 总结与行动项

**🎯 合入结论**：✅ 可直接合入（P0-1 已修复并复验）

**🚧 合入前必须完成**：无（P0-1 已闭环）

**📌 合入后跟进**：P1＝把 `rebuild-vector`/`sync` 也纳入提交窗口后标 engine-only（可解除其期间读阻塞）；P2＝`ki doctor --dimensions` 输出人眼走查一次。

**测试验证建议（阶段 8）**：无需新增——审查中所有不确定项已由既有测试与 e2e 脚本覆盖并实跑。

---

## 阶段 7：challenger 二次质疑

结论为 ✅ 且属复杂场景（10 文件 / 并发逻辑），已自动接力 `challenger`；完整质疑见同目录 `challenge-report.md`。

**质疑回写（结论一致性）**：

| 质疑 | 级别 | 处置 | 对合入结论的影响 |
|---|---|---|---|
| **C1** 回滚路径的元数据写不在提交窗口内 → 失败导入回滚期可能"列表里在、点开 404" | 🔴 阻塞 | **已修复**：窗口下沉到 `persistTouchedGroups` / `restoreLocalKb`，`committing` 改为可重入计数 + 新增同步版 `withMetadataCommitSync()` | 修复后复验通过（测试 8/8、套件 notok=0、e2e read 0ms）→ 维持 ✅ |
| C2 `doc/edit` GET(read) 与 POST(write) 的 revision 语义 → 导入期编辑可能冲突提示 | 🟡 | 登记待产品确认（无数据损坏） | 不阻塞 |
| C3 `rebuild-vector` / `sync` 等长操作仍阻塞读 | 🟡 | 登记 P1（需各自把元数据写纳入窗口后才能标 engine-only） | 不阻塞 |
| C4 TTL 过期后快照不含完成度 | 🟡 | 登记 P2（既有"过期即未知"语义） | 不阻塞 |
| C5 `globalRunning` 期间读仍等待 | 🟡 | 登记 P2（全局独占语义） | 不阻塞 |

**最终合入结论**：✅ **可直接合入**（P0-1 与质疑 C1 均已修复并复验）。
