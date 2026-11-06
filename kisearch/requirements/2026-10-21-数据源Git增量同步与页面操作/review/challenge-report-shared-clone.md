# Challenger 二次质疑：共享托管 clone

- 质疑对象：`review/code-review-shared-clone.md` 所覆盖的未提交改动（共享 clone + 引用计数 + 前置校验）
- 时间：2026-10-22
- 姿态：假设「已修 7 项、结论 ✅ 可合入」仍有问题，逐条找证据

## 结果

**0 阻断 / 4 中 / 3 低**。中风险均为**可解释的设计取舍或窄窗口**，不阻塞合入；已逐条给出验证方式与出路。

## 成立的质疑（中）

### Q1 复用只取首个候选 —— 多份历史副本时可能「假拒」

`findReusableManagedClone` 返回 `candidates[0]`（`readdirSync` 顺序）。共享功能落地前，同一 remote+branch 已可能存在**多份**副本（`blog-es` 等），若第一个候选缺用户要的子目录（陈旧副本未同步过该提交）就直接 `INVALID_SUBDIR`，而**另一份副本里可能就有**。

- 证据：`src/lib/datasource.ts:519-556`（收集全部候选后只 `return candidates[0]`）
- 判定：成立，但**后果可控**——用户看到的是「子目录不存在 + 顶层目录列表」，重试换一个 scope 或对 owner 触发同步即可；不会误删、不会重复 clone。
- 为何不修：逐候选校验需要在 clone 锁内循环并让「前置校验」与「任务内复用」选出不同候选（两处必须同源，否则前后端行为分叉）。属独立优化。
- 验证方式（若将来改）：造两份同 remote+branch 的副本，A 缺 `x/`、B 含 `x/`，断言 add 复用 B 且不新建 clone。

### Q2 前置校验基于**本地**副本 ⇒ 新提交里的子目录会被误报不存在

`checkManagedSubdir` 不 fetch。用户要的子目录若只在远端最新提交里出现（owner 副本陈旧），页面 add 会立刻 400，而「重 clone 一遍」反而能成功——与需求 2（提前校验）的初衷相悖。

- 证据：`cloneManagedRepo` 在 clone 后才校验（同一函数）；复用路径直接校验现存 `repoRoot`
- 判定：成立，属**功能与新鲜度的取舍**。在 add 前 fetch 会把「几百 MB 仓库、几分钟」的开销塞进一次 HTTP 请求，且会改动共享工作树（必须持 clone 锁，与正在跑的同步互斥）。
- 出路：错误文案已列出顶层目录，用户能立即分辨「拼错」与「还没同步」；对 owner scope 点一次同步即可解锁。

### Q3 owner scope 目录名被「保留的 clone」占用，形成恢复死角

共享后 clone 路径仍叫 `<cloneRoot>/<ownerScope>/repo`。owner 删除（clone 因引用计数保留）后，若用**同名 scope** 登记**另一个仓库**：`cloneManagedRepo` 见 `repo` 已存在 → `CLONE_TARGET_EXISTS`；而错误文案建议的 `remove --purge --yes` 又会算出 `refs>0` 返回 `CLONE_SHARED` 拒绝 —— 两条路都走不通，只能换 scope 名或手工 `rm`。

- 证据：`src/lib/datasource-clone.ts:308-312`（目标存在即拒）＋ `src/datasource.ts` orphan purge 分支（refs>0 拒绝）
- 判定：成立但**窄**：需要「删 owner → 保留 clone → 用同名 scope 装别的仓库」三步。
- 为何不修：引用计数拒绝是**正确行为**（另存仓库会破坏共享者），改成自动换名会让 clone 目录与 scope 的对应关系失守（`managedCloneDirForRepo` 依赖 `<owner>/repo` 布局）。属命名策略决策，需用户拍板。

### Q4 clone 级锁的持有范围是整个同步（含导入），共享者会长时间 `CLONE_BUSY`

`syncDataSource` 把 `execute`（fetch/reset/diff/**导入**）整体包进 `withManagedCloneLock`。共享同一仓库的两个 scope，A 导入 20 分钟期间 B 同步必然拿不到锁 → 任务失败 `CLONE_BUSY`，而不是排队等待。

- 证据：`src/lib/datasource.ts:1590-1598`；锁实现 `withScopeWriteLock` 为 **fail-fast**（非阻塞）
- 判定：成立，但方向正确——工作树在导入期间仍被读取，若只锁 fetch/reset，B 的 `reset --hard` 会在 A 读取中途换掉文件内容（比漏同步更糟：读到半新半旧）。
- 代价（须让用户知晓）：共享仓库的多个数据源**同步不能并行**，页面表现为「该 Git 仓库正在被另一个数据源同步，请稍后重试」。

## 成立但低风险

| # | 质疑 | 判定 |
|---|------|------|
| L1 | `remove` 不带 `--purge` 取消全部登记后，clone 成为**无引用孤儿**：下次 add 同仓库扫不到记录 ⇒ 重新 clone 一份（旧孤儿仍占磁盘） | 成立；孤儿清理依赖 `remove --purge` / `scope delete`，与共享前同类。文案已提示保留路径 |
| L2 | `listRegisteredDataSourceRecords` 跳过损坏记录 ⇒ 极端情况下引用计数**少算**，可能误删仍被损坏记录引用的 clone | 成立但可接受：损坏记录本身无法同步，且 `scope delete`/`remove` 前已要求 `--yes`；不修是为了不让「一条坏 JSON」永久锁死磁盘回收 |
| L3 | 并发 add 同一 remote：第二个请求拿到 `CLONE_BUSY` 而非 409「正在添加」，语义偏「失败」 | 成立；`remoteAddLockScope` 是 fail-fast 锁。文案含「请稍后重试」，且重试时前一个已登记 ⇒ 走复用。属体验优化 |

## 不成立的质疑（已核实）

| 质疑 | 反证 |
|------|------|
| 引用计数在锁外算，与并发 add 复用竞态会误删 | 三处（CLI `remove --purge`、orphan purge、`scope delete`）均已把 `countManagedRepoRefs` **移进** `withManagedCloneLock`；add 复用也走同一把锁 ⇒ 「计数 + 删除」与「校验 + 登记」互斥 |
| `syncDataSource` 用 scope 锁即可保护共享工作树 | 正是不成立才加 clone 锁：`withScopeWriteLock` 键 = 单个 scope，两个 scope 各自持锁可同时 `reset/clean` 同一工作树 |
| 锁键用 `\u0000` 前缀会拼进文件路径导致 `ERR_INVALID_ARG_VALUE` | `scope-write-lock.ts:20` 对 scope 键做 **sha256 后再拼路径**，NUL 只参与哈希；`scope-doc` 21/21 实跑走的就是这条锁 |
| 复用会把别人的工作树当自己目录读，属越权 | 复用与首次 clone 都在**同一 daemon 进程/同一用户**下读同一份 `~/.ki/datasources`，鉴权面在 scope 层（`authScopes`）未变；新 scope 能读到的内容与它自己 clone 一份完全相同 |
| 共享后 commit 水位会串（A 的同步把 B 的水位推进） | 水位存在各 scope 自己的 `datasource.json.lastSync.git.commit`，clone 只提供工作树；`test/mcp-http-api.test.ts` 复用链路同步后断言两个 scope 各自终态 |
| 陈旧注释「repoRoot 必须精确等于 `<cloneRoot>/<scope>/repo`」说明实现仍按 scope 判断 | 是注释未同步（本轮 P3 #5 已改），`managedCloneDirOf` 实际已按 `repoRoot` 推导（`managedCloneDirForRepo`），并有 `shared-clone` 用例锁定「owner 是别的 scope」 |
| `topLevelDirsHint` 泄露仓库结构属信息暴露 | 提示只在**该调用方自己有权登记的新 scope** 的错误里出现，且内容就是它给出的 URL 对应仓库的顶层目录名；不含凭据（`sanitizeRemoteUrl` 落盘） |

## 全局回扣

- **目标回扣**：用户的两个诉求（不重 clone / clone 前报错）都有运行时证据；但「不重 clone」只覆盖**同 remote + 同远端分支**，换分支仍会各存一份 —— 这是共享工作树语义的必然（不能一份工作树同时 checkout 两个分支），与目标不冲突。
- **位置回扣**：改动落在 `datasource-clone` / `datasource` / `mcp-http-api` / `scope` 四处，消费方（页面 add、CLI add/remove、`scope delete`、同步任务、任务台账错误归类）已全部对齐；`web/` 零改动（本轮 diff 内无前端文件）。
- **判据回扣**：批次 A/B 既有不变量未被削弱 —— commit 水位只在 `state=ok` 推进、待删候选仍基于全量扫描、本地非托管仓库仍只 `merge --ff-only`、URL/分支/子目录白名单与凭据脱敏口径不变（`clone-url` 12/12 复跑）。
