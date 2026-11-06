# Code Review · `datasource list` 只读展示计划 + 修复「周期定时永不触发」

- 日期：2026-10-29
- 范围：本会话对 REQ-20261029-001 的增量改动（L6 + P0 修复），不含前序已评审的主链路
- 模式：深度（净变更 > 50 行）
- 关联需求：REQ-20261029-001（用户已确认 A5「CLI 只读展示计划」在本期范围内）

## 审查上下文

| 项 | 值 |
|---|---|
| **变更** | `src/lib/datasource-schedule.ts`、`src/lib/datasource-format.ts`、`src/lib/datasource-types.ts`、`src/lib/datasource.ts`、`src/datasource.ts`、`web/src/api/httpApi.ts` + 3 个测试文件 + 2 份 docs |
| **检查覆盖** | 14 条（✅9 / ⚠️3 / ❌0 / ➖2）· 未覆盖维度：无 |
| **既有缺陷** | 2 项（Q4 / Q5，非本次范围） |

---

## 一 · 审查过程

### 1.1 我的理解（判定前提）

- **业务目标**：运营者在页面上给数据源配一次计划，daemon 到点自动同步；CLI 侧只需**只读可见**（不新增配置入口）。
- **系统位置**：

```text
page POST /api/datasource/schedule ──► datasource.json.schedule
                                          │
   daemon 调度器 refresh() ◄──────────────┘
        │
        ├─ computeNextRun()  ← 本次改了基准（新增 enabledAt）
        │
        ├─ runScheduledSync()（未改）
        │
        └─ 页面 list/detail（未改）、CLI `datasource list`（本次新增只读脚注 + --json 字段）
```

- **整体成功判据**：① 计划开启后**一定会**在最迟一个周期内执行；② 未启用时不产生任何调度开销；③ 同步路径永不删文档；④ 旧 daemon / 旧 web 不崩。

### 1.2 问题（推演 + 清单合一）

#### `Q1` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/datasource-schedule.ts:312`（`scheduleListSummary` 的 once 分支）
- **问题**：初版把用户填的 `at` 原文直接拼进脚注，输出 `仅一次 2026-11-01T09:30` —— 带 `T`，与本项目其它时间口径（`YYYY-MM-DD HH:mm`）不一致，跨年时也无法从"仅一次"看出年份。
- **业务后果**：CLI 里出现唯一一种带 `T` 的时间写法，用户/脚本要额外解析；测试还把这种写法锁成了期望值。
- **依据**：`datasource-format.ts:formatLocalMinute` 与页面 `formatDateTime` 均为 `YYYY-MM-DD HH:mm`。
- **链路**：

```text
datasource.json.schedule.at = "2026-11-01T09:30"
  ▼
scheduleListSummary() 直接模板拼接 schedule.at
  ▼
ki datasource list 输出含 T 的时间
  ▼
与 LAST SYNC 列 / 页面详情两套口径并存，用户需辨认两种格式
```

- **修复**：新增 `formatAbsolute(ms)`（`YYYY-MM-DD HH:mm`），`parseAtLocal` 失败才回落原文；测试期望同步改为 `仅一次 2026-11-01 09:30`。**已修**。

#### `Q2` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/datasource-schedule.ts` `normalizeDataSourceSchedule`
- **问题**：`enabledAt` 的不变式「`enabled=false` ⇒ 不留锚点」只在写路径（`saveDataSourceSchedule` / 仅一次自动关闭 / 非法降级）成立，**读路径不校验**。手改或旧版本留下的"关闭 + 有锚点"记录会被原样读入，再开启时 `prev.enabledAt !== null` 分支会沿用这个陈年锚点。
- **业务后果**：用户关掉半年后再打开，`nextRunAt` 会立刻变成"已到期"，下次 daemon 启动即补跑一次 —— 与"开启后等满一个周期"的体验不一致。
- **依据**：用户决策 #6「首次开启等满一个周期」。
- **链路**：

```text
datasource.json(schedule.enabled=false, enabledAt=半年前)
  ▼
normalizeDataSourceSchedule 原样返回（只清 skip 字段）
  ▼
页面再次开启 → saveDataSourceSchedule 命中「enabledAt 非空」分支 → 沿用旧锚点
  ▼
base + interval 早已过去 ⇒ 判定 due ⇒ 立即补跑（用户以为要等一个周期）
```

- **修复**：`normalizeDataSourceSchedule` 在 `!enabled` 时一并清 `enabledAt`。**已修**。

#### `Q3` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/datasource-format.ts:179`（`buildDataSourceList` 新增 `schedules`）
- **问题**：`buildDataSourceList(entries)` 的默认 `now` 是 `Date.now()`，页面侧（HTTP list）与 CLI 各自调用一次 → 同一时刻两次读取理论上会出现 1 秒级差异。当前只影响"待补跑 / 下次时刻"的边界展示（跨分钟边界时两边可能显示相差 1 分钟）。
- **业务后果**：仅展示层面可能瞬时不一致，无数据影响；`nextRunAt` 的**计算基准**已由 `enabledAt` 固定，不再随读取滑移（这正是 P0 修复带来的副产品）。
- **依据**：e2e 断言「CLI `--json` 的 `nextRunAt` 与 HTTP 逐毫秒一致」——修复后通过，说明基准已稳定。
- **修复**：不改（可注入 `now` 的入口已存在，需要严格一致时由调用方传入）。**接受**。

#### `Q4` · ⬜ 既有 · 🟡

- **位置**：`src/lib/scheduler`（`datasource-scheduler.ts` `fire()` → `refresh()`）
- **问题**：跳过（`active-task` / `clone-busy`）不推进 `lastAutoAt`，`refresh()` 重算仍 `due` ⇒ 每 ≤10s（`JITTER_DUE_MS`）重试一次；`SKIP_RETRY_MS`(5min) 目前只用于并发守卫。
- **引入版本**：主链路实现时（本会话之前，未提交）。
- **建议**：skip 后按 5 分钟退避（已登记 `plan.md` L9，待拍板）。

#### `Q5` · ⬜ 既有 · 🟢

- **位置**：`src/lib/datasource.ts` `saveDataSourceSchedule`
- **问题**：页面把已完成的「仅一次」计划重新开启（不改时间）时，`lastAutoFor` 不清空 ⇒ `computeNextRun` 判 `lastAutoFor === atMs` 返回无下次，页面显示「已执行 · 仅一次」，计划挂着但永不执行。
- **引入版本**：主链路实现时。
- **建议**：若产品上允许"同一时刻重新跑一次"，可在开启时清 `lastAutoFor`；当前先记为已知边界（需产品拍板，未擅自改）。

### 1.3 覆盖表结论（内部记录，摘要）

| 维度 | 结论 |
|---|---|
| 语义一致性 | ✅ 脚注语义（只读/模式/下次）与页面 `scheduleNextLine` 同源口径；`computeNextRun` 注释与实际基准一致（Q1/Q2 已修） |
| 安全 | ✅ 脚注对 scope/text 均过 `sanitizeTerminalText`（OSC/CSI 注入面）；`--json` 为 JSON 转义，无新增注入面 |
| Bug 风险 | ✅ 锚点三处写路径（保存 / 仅一次关闭 / 非法降级）齐全；读路径已加不变式（Q2） |
| 规范 | ✅ 新增公开函数有 docstring；`formatAbsolute` 与既有 `formatLocalMinute` 口径一致 |
| 架构 | ✅ `format → schedule` 单向依赖、无环；`schedule` 不反向依赖展示层 |
| 性能 | ✅ 每行一次纯计算，无 I/O |
| 测试 | ✅ 后端 73/73、e2e 41/41、走查 24/24；新增用例覆盖锚点稳定/到点 due/优先序/脚注格式 |

### 1.4 待验证项

- `T1` · 多条目脚注缩进对齐 → **已动态验证**：两源输出
  `定时：a …` / `        bb …`（续行按 `displayWidth('定时：')=6` 对齐）✅
- `T2` · 恢复旧快照（无 `enabledAt`）后计划是否会重新永不触发 → 静态可知：会。已列为待拍板 D1。

---

## 二 · 结论

### 2.1 合入结论

**✅ 可直接合入**（阻塞项：无；Q1/Q2 已修并复验；Q4/Q5 为既有，不阻塞）

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|---|---|---|---|
| 🔑 语义一致性 | 9/10 | ✅ | 脚注与页面口径同源；ONCE 时间格式已统一 |
| ⚠️ 安全性 | 9.5/10 | ✅ | 终端注入面已消毒 |
| 🐛 Bug 风险 | 9/10 | ✅ | 锚点三写路径 + 读路径不变式 |
| 📐 代码规范 | 9/10 | ✅ | docstring / 命名清晰 |
| 🏗️ 架构设计 | 9/10 | ✅ | 单向依赖，纯函数可测 |
| ⚡ 性能 | 9.5/10 | ✅ | 无 I/O、无循环内重算 |
| 🧪 测试覆盖 | 9/10 | ✅ | 单测 + e2e + 走查三层，含回归对应用例 |

整体：**A（9.1）**

### 2.3 需要你拍板

#### `D1` · 存量 / 恢复场景下没有 `enabledAt` 的计划

- **背景**：锚点只在保存时写入。从**旧备份恢复**（restore 会带回旧 `datasource.json`）或手工改 JSON 得到的"已启用 + 无锚点"记录，仍会回到"永不触发"。
- **为什么要你定**：三种修法语义不同——A 让这类记录"立即补跑一次"（自愈，改动 1 行）；B 在调度器启动时补写锚点（不立即跑，但引入启动期写盘）；C 只写文档。都不属于"纯 bug 修复"范畴。
- **选项**：A / B / C（我倾向 A：把"无锚点"当作历史遗留 ⇒ 视为已到期待补跑，符合 D6 的补跑语义）

### 2.4 亮点

- 用「接口与 CLI 的 `nextRunAt` 逐毫秒一致」这条断言反查出 P0（修复前两侧必然差一个读取间隔），把展示测试变成了时间基准的探测器。
- 脚注设计让"默认关闭用户"的输出与旧版**逐字符一致**，既有 22 条表格断言零改动通过。

---

## 复检记录（2026-10-29，D1 拍板后）

| 项 | 处置 | 证据 |
|---|---|---|
| `D1`（无锚点存量/恢复记录） | **用户选 A 并已实施**：`computeNextRun` 三基准全缺失 ⇒ `{ nextRunAt: now, due: true }`（补跑一次，`lastAutoAt` 落定后回正常节奏） | 单测 `datasource-schedule` **32/32**（含「无基准 ⇒ due」「跑完回正常」）· e2e **45/45** 新增真机用例 · `docs/cli.md` / `docs/mcp-http.md` 已同步 |
| `Q1` / `Q2` | 已在出报告前修复 | `formatAbsolute` / `normalizeDataSourceSchedule` 清锚点 |
| `Q4` / `Q5` | 维持既有，不阻塞 | `plan.md` L9 / 已知边界（仅一次重开不清 `lastAutoFor`，待产品拍板） |

复检结论：**维持 ✅ 可直接合入**（0 阻塞）。

