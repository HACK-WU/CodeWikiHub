# Code Review Report：R8 二期（`/api/tags` 超时降级 + 前端消费 `degraded`）

**日期**：2026-10-10　**关联需求**：REQ-20261009-003（R8 / A10 / N9；匹配依据：代码语义 ↔ 需求名 🟡）
**审查对象**：工作区未提交改动 —— 4 个既有文件（`mcp-http-api.ts` / `httpApi.ts` / `tasksApi.ts` / `AppShell.tsx`）+ 新文件 `web/src/lib/vectorDimensionCopy.ts`、`web/test/vector-dimension-copy.test.mjs` + 测试更新（`test/mcp-http-api.test.ts`、`test/coordinator-read-lane.test.ts`）+ e2e `temp/verify-r8-tags-timeout.ts`
**审查方式**：code-review 标准模式（波次1 三维度子 agent 并行 → 波次2 主 agent 语义/架构）；经 auto-review 链路带起（免确认通道：意图已随交付说明陈述）
**整体评分**：**B+**（首轮 2×P1 + 7×P2 → **全部修复**；修复后无阻塞项）
**证据性质**：**已验证**（6 套后端测试 + web 67/67 + 真实撞锁 e2e + tsc/lint/build 全部实跑）

---

## 🎯 功能意图（阶段 3）

| 位置 | 推测意图 | 置信度 |
|---|---|---|
| `mcp-http-api.ts::handleTags` | 引擎不响应时 `/api/tags` 在 handler 内 ≤5s 降级（`ok:false + degraded`），随 handler 返回放行该 scope 队列槽 | 🟢 |
| `AppShell.tsx` + `vectorDimensionCopy.ts` | refresh 降级时显示「刷新未完成 + 上次结果」，守 N9，不引入自动重试 | 🟢 |

**🌍 全局图景**：业务目标＝引擎收尾期页面仍可用；系统位置＝浏览器（SearchPage/ImportPage/WritePage/AppShell）→ `/api/tags`、`/vector/status/refresh` → coordinator（write 车道）→ zvec；整体成功判据＝①≤5s 返回 ②降级不冒充结果/不误报故障 ③队列槽随 handler 返回即放行 ④前端既有行为不回归。

## 📊 维度评分（首轮 → 修复后）

| 维度 | 首轮 | 修复后 | 关键发现 |
|---|---|---|---|
| 🔑 语义一致性 | 7 | 9 | M1 双 `degraded` 同名不同型；M2 `configured` 冒充"上次结果" |
| ⚠️ 安全性 | 9 | 9 | 无 P0/P1（XSS 无面；错误脱敏属既有问题 → 跟进） |
| 🐛 Bug 风险 | 7 | 9 | 显式三分支消除 `timedOut ↔ ok` 隐式依赖；无 unhandledRejection（已核） |
| 📐 代码规范 | 6 | 9 | 死字段 / NaN / 时间格式 / error 态错位 |
| 🏗️ 架构设计 | 8 | 9 | 三个 `degraded` 形状边界已注释固化 |
| ⚡ 性能 | 7 | 8 | 超时后扫描继续（single-flight 待设计）；排队段不覆盖（已登记） |
| 🧪 测试覆盖 | 5 | 9 | 首轮 CI 零覆盖 → 补 3 处 CI 用例 + e2e 加固 |

## 🔑 语义一致性分析（M1/M2，均已修复）

**M1 · `degraded` 同名不同型（boolean vs 对象）**
- 📍 `src/tag.ts:35`（`TagListResult.degraded?: boolean`）↔ 响应体 `degraded:{reason,waitedMs}` ↔ 前端两处类型
- 💻 实际：fallback 里的 `degraded: true` **从未被消费**（响应标记只由 `outcome.timedOut` 决定）；未来任何 `{...result}` 式重构会把 boolean 泄漏给按对象读的前端
- 💡 修复：删除死字段；`handleTags` 改**显式三分支**（`timedOut` → 降级；`!ok` → 既有失败且不透传 boolean；`ok` → 成功）；三处注释固化边界（含"勿混"警示）

**M2 · `persisted ?? configured` 把当前配置冒充"上次结果"（N9 相关）**
- 📍 `AppShell.tsx`（旧）↔ `src/lib/vector-dimension-snapshot.ts:98-113`（快照缺失/过期/unknown 时**只返回 `configured`，无 `persisted`**）
- 💻 实际：降级文案会显示「显示上次结果：1024 维」，而 1024 只是当前配置 → 语义不诚实（用户以为维度信息丢了 / 或误读为历史确认值）
- 💡 修复：抽出 `web/src/lib/vectorDimensionCopy.ts`（纯函数）；`persisted` 缺失时改述「本次未取到维度快照（当前配置 N 维）」；补 `waitedMs` 有限性与 `checkedAt > 0` 守卫

## 🐛 其余已修复（首轮 → 修复后）

| # | 问题 | 级别 | 修复 |
|---|---|---|---|
| C2 | 手动「重新检查」丢弃响应 → 降级信息丢失；若 GET 命中旧快照，banner 直接**误消失**（失败显示成正常） | P1 | `refreshDimension` 改为 `setQueryData(本次响应)`；请求失败时 invalidate 进入 error 态 |
| 性能② | 注释声称覆盖"引擎长任务"，实际 `tag-list` 按 write 入队，**排队段不计入 5s** | P1 | 注释修正覆盖面 + 登记 `design-input.md` §5-7（供 R9 定案） |
| F7/F1/F8 | 降级约定无 CI 守护（删超时、改 `ok:true` 跑 CI 全绿）；`/api/tags` 零用例 | P1 | 新增 `test/mcp-http-api.test.ts` 的 `/api/tags` describe（形状 + 无 degraded + 保留 tag 过滤 + scope 回显）；`coordinator-read-lane` 加 `tag-list → write` 锚点 |
| F2/F9 | 前端文案 0 覆盖且结构上不可测（内联 IIFE 无导出点） | P1 | 抽纯函数 + `web/test/vector-dimension-copy.test.mjs`（6 例，含"不得冒充上次结果"） |
| C3/C4 | `reason: string` 过宽；`waitedMs` 缺守卫可渲染 "NaNs"；`toLocaleTimeString` 跨天误导 | P2 | 收窄为 `'timeout'`；NaN/`checkedAt=0` 兜底；改用 `Intl.DateTimeFormat`（对齐 `TasksPage.timeLabel`） |
| C6/(e)④ | query error + 缓存旧 data → 把「本次请求失败」显示成「刷新未完成」 | P2 | `dimensionDegraded` 加 `dimensionQuery.error` 守卫 |
| F6/F10/F11/F13 | e2e 无下界断言（常量被误设小仍通过）、holder 失败路径泄漏、占锁无前提反证、无 scope 回显 | P2 | 全部加固：`waitedMs ≥ 4.5s`、`finally` 无条件回收、`flock -n` 反证、`scope` 断言 |

## 🟢 亮点

1. 关键约定（必须 `ok:false`）在实现、注释、前端类型、e2e 断言四处一致，且修复后由 **CI 用例 + e2e 双重锁定**；
2. R8 一期/二期"降级形态相反"的设计差异被显式注释固化（防后人"统一"）；
3. e2e 用 flock 真实撞锁 + 队列槽放行断言，是「超时包在 handler 内」的直接证据（非静态推断）。

## 🧪 实跑证据（修复后第 2 轮复核，全部通过）

| 检查 | 结果 |
|---|---|
| `temp/verify-r8-tags-timeout.ts`（加固后） | ✅ 对照 863ms → 撞锁 **5003ms** 降级（`ok:false + degraded:{reason:'timeout',waitedMs:5001}`）→ `/api/doc/list` **2ms** |
| `test/mcp-http-api.test.ts` | **40/40**（+1 tags 用例） |
| `test/coordinator-read-lane.test.ts` | **9/9**（+`tag-list → write` 锚点） |
| `test/timeout.test.ts` / `test/daemon-concurrency.test.ts` | 6/6 / 10/10 |
| `web`: `npm run test` | **67/67**（+6 文案用例） |
| `web npm run build`（tsc --noEmit && vite build）；后端 `tsc`；lint | OK；新增 **0**（仅 2 个既有基线错误）；0 诊断 |

## 📌 合入后跟进（不阻塞）

| 优先级 | 行动项 | 备注 |
|---|---|---|
| P2 | `/api/tags` 错误原文未脱敏（未复用 refresh 的 `safeError`） | 属既有行为；建议与 refresh 统一下沉共享工具 |
| P2 | 超时后底层扫描继续：daemon 分支 `callDaemon` 默认 120s；无 single-flight | 已登记 `design-input.md` §5，随 R9 一并决策 |
| P2 | 迟到失败/迟到成功无旁路日志（"仍在后台继续"的结果不可见） | 观测性增强，可选 |
| P2 | 超时后被放弃的扫描经引擎租约（`activeUses`）阻塞 LRU 淘汰 | 需运行时量化后再决定 |

## 🎯 合入结论

**✅ 可直接合入** —— 首轮 2 个 P1（M2 诚实性、C2 手动路径）与全部 P2 已修复并复验，无未决 P0/P1。因 diff 已随修复变化，按 code-review 阶段 7 规则**自动接力 challenger 二次质疑**（结论见 `review/challenge-report-r8-phase2.md`）。

### 🧨 质疑回写（challenger，2026-10-10）

质疑 5 条（**0 阻塞**）：

- **#1「5s 上限对倍增取全扫描是否过短」→ 经现网 10 个 scope 只读实测证伪**（最慢 k8s 0.476s，余量 ~10×；且现网所有 scope 的 tags 均为空）；
- #2 迟到失败/成功无日志（🟡 跟进：观测性）；
- #3 tags 侧 `degraded` 当前无消费方 → 确认**契约预留**并登记 `design-input.md` §5-8；
- #4 降级时无"标签可能过时"提示（🟢 可选，产品决策）；
- #5 zombie 扫描与后续写任务并发（🟡 待确认，有 `serializeEngineOp`/租约兜底）。

⇒ **维持 ✅ 可直接合入**（本报告与 `review/challenge-report-r8-phase2.md` 结论一致，无推翻记录）。
