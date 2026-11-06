# 设计评审报告 — REQ-20261021-003

> 评审对象：`design/DESIGN.md` + `S01~S05`（5 个子文档）
> 评审时间：2026-10-21
> 格式：design-craft（多文档）
> 证据说明：已直读核对 `web/src/pages/DataSourcePage.tsx:325-348`、`src/lib/import.ts:790-804`、`src/lib/import-prune.ts:175-194`、`src/lib/scope-write-lock.ts:14-22`、`src/lib/datasource.ts`；未运行产品。

---

## 阶段 1：结构完整性

| 检查项 | 结果 | 说明 |
|---|---|---|
| 父文档 4 章（背景/一览图/总体方案/风险） | ✅ | 均存在；第 2 章含 mermaid |
| 子文档必含章节（术语/AS-IS/TO-BE/数据模型或接口） | ✅ | 5 份齐全；S-04 以「展示映射」承载数据模型职责 |
| 触发章节（时序图/异常/影响/待定/迁移） | ✅ | S-02/S-03/S-05 有时序与异常；S-01 有迁移；各文档有影响与待定 |
| 子文档「不在范围内」 | ✅ | 5 份均已补 |
| 共享术语速查 | ✅ | 父文档 §4.3 |

**结构结论：通过。**

---

## 🔴 阻断（必须修复）

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 1 | 一致性 / 体验 | S-04 §3.3 + `DataSourcePage.tsx:325-348` | 现有列表行是 `<button class="ki-ds-table__row">`。设计在行内新增「同步」按钮会形成 **button 嵌套 button**：非法 HTML，点击/键盘/ARIA 语义冲突；`stopPropagation()` 只能挡住事件冒泡，挡不住嵌套交互控件的可访问性问题 | 二选一：① 行容器改为非 button（`div role="row"` + `tabIndex=0` + Enter/Space 打开抽屉），同步按钮作为独立操作单元；② 把同步按钮移到行 button 之外的操作列，行点击只覆盖前 N 列。**推荐 ①**，并在验收中加「Tab 顺序 / Enter 打开抽屉 / 同步按钮独立可达」 | 阶段3 / 阶段4 |

---

## ⚠️ 疑似阻断（需人工确认）

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 2 | 正确性 | S-01 §5 / S-02 §3.3 | **混合版本静默降级**：新记录 `version:2` + `type/git`，旧 daemon 的 `normalizeRecord` 只认 v1，读后会在下次写回时丢掉 `type/git`；设计只写「升级后必须重启 daemon」，没有运行时防降级 | 复用 daemon 版本握手能力：新 CLI/HTTP 发现 daemon 不支持 `datasource-v2` 时，对 Git 数据源 fail-loud（`DAEMON_OUTDATED`）；或在写回前检测记录 `version/type` 并拒绝旧 daemon 覆盖 | 阶段3 |
| 3 | 体验 / 可执行性 | S-05 §3.5 + §4.1 | 页面添加表单要求「scope 必须已存在」，但设计未说明 scope 列表来源。`/api/datasource/list` 只含**已登记数据源**，不能当 scope 列表；若直接让用户输入，会绕过 Q8 | 明确复用 `kiScopeList`（或 `ScopePathSelect` 的已有 scope 模式）作为下拉数据源；定义 `SCOPE_NOT_FOUND` 判据（config scopes ∪ dataDir 目录），并在表单中只允许选择 | 阶段3 |

---

## 🟡 警告（强烈建议修复）

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 4 | 正确性 | S-02 §3.2/§3.3 | `prepareGitSync` 返回 `branch`，但设计未在同步成功时回写 `record.git.branch`。用户切分支后，抽屉「分支」与（未来的）托管 reset 依据会漂移 | 同步成功后写 `record.git.branch = gitUpdate.branch`；`remoteBranch` 保持不变；写入与 `lastSync` 同一把 scope 锁 | 阶段3 |
| 5 | 完整性 | 父文档 §1/§4 | 缺少显式**非功能性默认假设**：单 daemon、同 scope 串行、fetch 15s / clone 10min / diff 64MB、页面 15s / 3s 轮询、单机低并发 | 在父文档增加「默认假设」小节，明确本方案不承诺多 daemon 并发与超大仓库 | 阶段2 |
| 6 | 正确性 | S-02 §3.3（空变更早退） | 空变更路径只写 `lastSync`，未明确写 `params.mode='incremental'` 与 `warnings`（untracked/fetch/update）。任务详情与页面会读不到本次模式/警告 | 补齐空变更 lastSync 的 `params.mode`、`git`、`warnings` 组成 | 阶段2 |
| 7 | 体验 | S-04 §3.2/§3.4 | 抽屉没有「同步模式（增量/全量）」行；用户无法区分本次是全量还是增量，也无法解释 `changed=fullScanned` | 在 params 增加「同步模式」行；旧快照显示 `—` | 阶段3 |
| 8 | 正确性 | S-01 §3.3 | 自动探测失败（如 git 不可用、探测超时）会**静默按目录登记**，用户可能以为已启用 Git 增量 | `add` 返回 `type='directory'` 时附 `warning: '未识别为 Git 仓库，按普通目录登记'`；页面对旧记录无 type 也显示「目录」+ 提示重新 add | 阶段3 |
| 9 | 可执行性 | S-05 §3.4/§9 | `git clone --progress` 若用 `execFile` 回调缓冲，进度只能在结束后拿到；设计只说「解析 stderr」 | 明确用 `child.stderr.on('data')` 流式解析百分比；`execFile` 的 `signal` 接 `abortSignal`；超时/取消后清理临时目录 | 阶段3 |

---

## 🟢 建议（可选优化）

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 10 | 一致性 | S-04 §3.2 | 旧快照无 `changed/fullScanned` 时回退 `scanned`，但 `scanned` 是导入基准，不一定是全量 | 在「本次变更」行加 hint「旧快照无增量字段，按导入基准显示」 | 阶段3 |
| 11 | 体验 | S-05 §3.5 | add-remote 首次同步任务 id 未返回，页面只能轮询任务列表发现 | add 任务 result 增加 `syncTaskId`；页面优先用它跳转/跟随 | 阶段3 |
| 12 | 安全 | S-05 §6.1 | 白名单未写清 `https://user@host/repo`（无密码）是否允许 | 明确：允许无密码 user（credential helper 场景），拒绝 `user:pass@` | 阶段3 |

---

## 📊 评审统计

| 维度 | 🔴 | 🟡 | 🟢 | 合计 |
|---|---|---|---|---|
| 完整性 | 0 | 1 | 0 | 1 |
| 质量 | 0 | 1 | 1 | 2 |
| 正确性 | 0 | 4 | 0 | 4 |
| 体验 | 1 | 2 | 1 | 4 |
| 一致性 | 0 | 0 | 1 | 1 |
| 合计 | 1 | 8 | 3 | 12 |

> ⚠️ 疑似阻断 2 项单独列出，不计入 🔴 列。

## 评审结论（初次）

**❌ 不通过**（1 个 🔴 阻断 + 2 个疑似阻断 + 8 个 🟡 警告）。

下一步：
1. 先修复 #1（行内按钮嵌套）——这是实现前的硬阻断。
2. #2/#3 需人工确认；#2 建议补 daemon 能力检查，#3 建议明确 scope 数据源。
3. #4~#9 可直接补文档。
4. 修复后做增量再审；再进入 `challenger` 二次质疑。

---

## 修复记录（2026-10-21，同日）

| # | 严重度 | 状态 | 修复位置 | 说明 |
|---|---|---|---|---|
| 1 | 🔴 | ✅ 已修复 | S-04 §3.3 | 行容器改为 `div role="row"` + `tabIndex` + Enter/Space；同步按钮作为独立 button；补 3 项键盘验收 |
| 2 | ⚠️ | ✅ 已补设计 | S-01 §5、S-02 §6 | 增加 daemon 能力位 `datasource-git-v2` 与 `DAEMON_OUTDATED`；旧 daemon 不写回 v2 记录。**实现时需确认现有握手可扩展能力位** |
| 3 | ⚠️ | ✅ 已修复 | S-05 §3.5 | 明确 scope 下拉复用 `kiScopeList`；`SCOPE_NOT_FOUND` 同判据；表单不提供新建 scope |
| 4 | 🟡 | ✅ 已修复 | S-02 §3.3 | 同步成功后回写 `record.git.branch`；`remoteBranch` 不变 |
| 5 | 🟡 | ✅ 已修复 | 父文档 §4.4 | 新增默认非功能性假设（单 daemon、串行、超时、轮询、安全边界） |
| 6 | 🟡 | ✅ 已修复 | S-02 §3.3 | 空变更路径补 `params.mode`、`git`、`warnings` |
| 7 | 🟡 | ✅ 已修复 | S-04 §3.2 | 抽屉新增「同步模式」行；旧快照显示 `—` |
| 8 | 🟡 | ✅ 已修复 | S-01 §3.3 | 自动探测回退目录时返回 `warnings`，CLI stderr 提示 |
| 9 | 🟡 | ✅ 已修复 | S-05 §3.4 | 明确 `child.stderr.on('data')` 流式解析 + `signal` 取消 + 清理 |
| 10 | 🟢 | ✅ 已修复 | S-04 §3.2 | 旧快照回退 `scanned` 时加 hint |
| 11 | 🟢 | ✅ 已修复 | S-05 §3.5/§4.1 | add 任务 result 下发 `syncTaskId`，页面优先使用 |
| 12 | 🟢 | ✅ 已修复 | S-05 §3.3 | 明确 `https://user@host` 允许（无密码），`user:pass@` 拒绝 |

## 增量复审结论

- 🔴 阻断：0
- ⚠️ 疑似阻断：0（#2 已补设计，保留 1 项实现前确认）
- 🟡 警告：0
- 🟢 建议：0

**结论：✅ 通过（文档层）**。实现前需确认：daemon 握手是否能扩展能力位 `datasource-git-v2`；若不能，退化为「CLI 在启动时打印版本警告 + 文档要求重启」，并在实现计划中登记为风险。

---

## 二次复审（challenger 修复后，2026-10-21）

| 质疑 | 修订位置 | 复审结果 |
|---|---|---|
| 1 🔴 `checkSourceDir` 先于自动更新 | S-02 §3.3 | ✅ 已补「校验顺序」表；git 源先可达性、更新后判空；directory 保持原序；dry-run 单列 |
| 2 🔴 `state=ok` 忽略 `stats.errors` | S-02 §3.3 | ✅ 终态与 CLI 任务同口径；明确只有 ok 推进 commit |
| 3 🟡 页面同步 check+create 竞态 | S-03 §3.3 | ✅ per-scope `syncGates` + 并发验收 + submit 失败释放 |
| 4 🟡 add-remote clone 未串行化 | S-05 §3.5 | ✅ scope 锁包住全链路 + active 检查 |
| 5 🟡 托管 clone 未清理 untracked | S-05 §3.6 | ✅ `git clean -fdx` + `GIT_CLEAN_FAILED` |
| 6 🟡 scope delete 留孤儿 clone | S-05 §3.7 | ✅ scope delete 纳入托管 clone 清理 |
| 7 🟡 symlink 未 canonicalize | S-01 §3.2 | ✅ realpath 后计算 relativeRoot |
| 8 🟡 Git 阶段无进度 | S-02 §3.3 / S-03 §3.3 | ✅ `onPhase` 三阶段写入任务 phase |
| 补充：stale tmp / tag branch | S-05 §3.4/§3.3 | ✅ 已补 |

**二次复审结论：✅ 通过**（0 🔴 / 0 🟡；2 项 ⏳ UI/文档细节留给实现期，不阻塞设计）。实现前仍需确认 daemon 握手能力位。
