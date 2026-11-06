# 二次质疑报告 · L6 + P0 修复（代码变更模式）

- 对象：`review/code-review.md` 所审的增量 diff（L6 CLI 只读展示 + `computeNextRun` 持久锚点）
- 变更类型：**混合**（新增功能 策略 + Bug 修复 策略，两套并行）
- 调用方：code-review 阶段 7（无阻塞项自动接力）
- 日期：2026-10-29

## 一、反对意见

| # | 类型 | 风险 | 位置 | 质疑 | 证据 / 推演 | 建议 |
|---|---|---|---|---|---|---|
| C1 | Bug修复·修复验证 | 🟡 中 → **已闭环** | `datasource-schedule.ts` `computeNextRun` | **修复只覆盖"保存过"的计划**：`enabledAt` 只在 `saveDataSourceSchedule` 写入。从旧快照 `ki restore` 回来的 `datasource.json`、或手工编辑得到的"已启用 + 无锚点"记录，`base===0` 分支仍返回 `now + interval` ⇒ **回到永不触发**（正是本次要修的 bug） | `restore` 只做文件还原，不经保存路径；`normalizeDataSourceSchedule` 不会凭空造锚点 | **用户拍板 D1-A 并已落地**：三基准全缺失 ⇒ `{ nextRunAt: now, due: true }`，补跑一次后 `lastAutoAt` 落定回到正常节奏；单测 2 例 + e2e 真机用例（45/45）验证 |
| C2 | 新增功能·边界 | 🟡 中 | `src/datasource.ts:282` 脚注 | **脚注只覆盖"启用中"的计划**：已关闭但**刚失败/跳过**的计划在 CLI 完全不可见（页面有「上次自动」与「连续失败」但关闭态也不显眼）。运维排查"为什么昨天没跑"时，CLI 侧看不到任何痕迹 | `model.schedules` 过滤条件为 `summary.enabled` | 若接受"关闭态不展示"，至少在 `--json` 已有全量（可查）；建议在 `docs/cli.md` 明示"关闭的计划请用 `--json` / 页面查看" |
| C3 | Bug修复·副作用 | 🟡 中 | `saveDataSourceSchedule` 锚点保留逻辑 | **改间隔沿用旧锚点**：用户把"每 30 分钟"改成"每 5 分钟"，而上次同步在 40 分钟前 ⇒ 保存后立刻 `due` ⇒ **马上跑一次**。用户预期是"从现在起每 5 分钟" | `base = max(lastSync.at, lastAutoAt, enabledAt)`，`lastSync.at` 更近且已超新间隔 | 页面文案已写「当前下次运行（保存后重算）」，但未解释"为什么会马上跑"；建议弹窗在保存前预览 `nextRunAt`（改值即算），或允许锚点随间隔变更重置。**需产品拍板** |
| C4 | 搭车变更 | 🟡 中 | 整份 diff | **范围质疑**：L6 的意图是"CLI 只读展示"，P0 锚点修复与之无关，属搭车。审查强度是否一致？ | code-review 对 P0 单独做了探针复现 + 3 条单测 + e2e 真机用例（强度高于主变更）；但两者混在一个提交里会污染回滚粒度 | 正确性已证 ⇒ **建议拆两个提交**：`feat(datasource): list 只读展示计划` + `fix(datasource): 周期计划缺持久锚点导致永不触发` |
| C5 | 体验·双轨 | 🟡 中 | 页面详情只读段 / CLI 脚注 | **锚点对用户不可见**：`enabledAt` 既不进详情只读段也不进 CLI。出现"刚开启就补跑"或"改完间隔立刻跑"时，用户没有任何可见依据判断是锚点旧了 | `dataSourceDetailModel.ts` 的行固定为 状态/下次运行/上次自动/连续失败 | 详情只读段加一行「启用时间」（或「本轮起算点」），零交互成本 |
| C6 | 新增功能·边界 | 🟢 低 | `--json` 的 `schedule.nextRunAt` | **每次调用重算**：脚本对两次 `list --json` 做 diff 会看到 `nextRunAt` 抖动（无 `lastSync` 时理论上不应再抖，但 `now` 仍参与 `base===0` 兜底） | 修复后基准固定，仅无锚点记录会抖 | 文档已写明"含服务端算出的 `nextRunAt`"；可接受 |
| C7 | Bug修复·场景 | 🟢 低 | `applyScheduleRunResult` | 仅一次计划**被取消**后 `lastAutoFor` 不推进、`enabled` 也保持 → 下次仍会补跑（符合预期）；但页面同时显示「连续失败」不受影响 | 代码路径确认 | 无需改 |

## 二、数据守恒（三问 + 贯通两问 + 异常归宿）

| 质疑 | 结论 |
|---|---|
| 流向 | `enabledAt` 生产：`saveDataSourceSchedule`；消费：`computeNextRun`（计算）、`toScheduleView`（下发 HTTP / CLI `--json`）、`normalizeDataSourceSchedule`（读入）。web 侧类型为 optional 且未消费 ⇒ 无断链 |
| 数量 | 无集合规模变化（未改任何列表过滤/去重） |
| 内容 | `writeDataSource` 原样序列化 `schedule`；`normalizeRecord` 的白名单已含 `enabledAt`（否则会被丢弃）—— **已验证**（save 单测断言读回非 null） |
| 贯通（新增字段） | 接口 → 校验（客户端不提交该字段）→ service 写入 → 落盘 → 读回 → 计算/展示，**逐跳接住**；无"生产无人消费"的死字段 |
| 异常归宿 | `readDataSource` 失败：`applyScheduleRunResult` 直接 return（锚点保持原值，不写半成品）；`saveDataSourceSchedule` 失败：写锁/校验失败均不落盘；调度跳过：不写 `lastAutoAt`（因此仍 `due`，见 C2/Q4 的退避问题） |

## 三、全局回扣

| 质疑 | 结论 |
|---|---|
| 目标回扣 | 目标「配一次计划就自动同步」：新开的计划已成立（真机验证）；**旧备份恢复 / 手工编辑**的记录未覆盖（C1），局部成立、整体有缺口 |
| 位置回扣 | 锚点 → `nextRunAt` → ① 页面列表/详情显示 ② 调度器 arm 时刻 ③ CLI 脚注。三者同源，改动一处即全同步，无放大风险；CLI 只读不参与调度 |
| 判据回扣 | ① 最迟一个周期内执行：新计划 ✅ / 无锚点记录 ❌（C1）② 未启用零开销 ✅（e2e `armed=false`）③ 同步不删文档 ✅（e2e 文档数 2→2）④ 旧 daemon/旧 web 不崩 ✅（走查 route 剥离字段后降级正常） |

## 四、认可点

- 用「CLI 与接口的 `nextRunAt` 逐毫秒一致」把展示断言变成时间基准探测器，这是发现 P0 的关键线索，**不是**靠通读代码。
- 不变式（`enabled=false ⇒ enabledAt=null`）在三条写路径（保存 / 仅一次自动关闭 / 非法降级）与一条读路径（normalize）都落实，而不是只在主路径打补丁。
- 脚注"无启用计划时不打印"，让默认用户的输出逐字符不变 —— 既有多条表格对齐断言零改动通过，回归风险被压到最低。
- 缺陷修复带了"修复前探针输出"作为可复核证据（`now=+0/+30/+60/+300min` 全 `due=false`），而不是只声称已修。

## 五、结论

- 🔴 高风险（阻断）：**0**
- 🟡 中风险：4（C1 存量/恢复无锚点、C2 关闭态不可见、C3 改间隔立刻补跑、C5 锚点不可见）
- 🟢 低风险：3（C4 搭车拆分、C6 抖动、C7）
- **结论：⚠️ 有条件通过** —— 主链路与修复结论成立，不推翻 code-review 的 ✅；但 **C1 需用户拍板**（三选一），C4 建议拆提交，C2/C3/C5 建议进后续小改。

## 六、后续（2026-10-29 用户拍板后复检）

> **精度更正**：C1 的适用范围比本条标题更窄 —— 只有「已启用 + 无锚点」**且 `lastSync.at` / `lastAutoAt` 也为空**（即该源从未同步过）的记录才会永不触发。曾同步过的记录靠 `lastSync.at` 就能正常计算，不受影响；`restore` 回来的旧快照通常带 `lastSync.at`，故实际受影响面仅限于"开了计划但从未真正跑过"的记录。D1-A 覆盖的正是这一子集，且新开启路径一定写锚点，不会产生新记录。

| 项 | 处置 | 证据 |
|---|---|---|
| C1 | **用户选 A 并已落地**：三基准（`lastSync.at` / `lastAutoAt` / `enabledAt`）全缺失 ⇒ `computeNextRun` 返回 `{ nextRunAt: now, due: true }`，调度器补跑一次后 `lastAutoAt` 落定回到正常节奏 | `test/datasource-schedule.test.ts` 32/32（新增「无基准 ⇒ due」+「跑完回正常」）· e2e **45/45**（清空 `enabledAt`+`lastSync` 模拟旧快照 → 补跑 1 次 → `lastAutoAt` 落定 → healthz 仍 `armed`）· `docs/cli.md` / `docs/mcp-http.md` 已写该语义 |
| C2/C3/C5 | 进 `plan.md` 跟进项（关闭态不可见 / 改间隔立刻补跑 / 锚点不可见），未改 | `plan.md` 遗留问题 |
| C4 | 仍建议拆两个提交（`feat(datasource): list 只读展示` + `fix(datasource): 周期计划缺持久锚点`），正确性已证 | — |
| 结论 | 复核后维持 **0 高风险**；C1 闭环，剩余为体验类跟进 | — |
