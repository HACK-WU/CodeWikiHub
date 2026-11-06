# 🎯 设计文档质疑报告 — REQ-20261021-003

> 质疑对象：`design/DESIGN.md` + `S01~S05`（已通过 design-review）
> 质疑时间：2026-10-21
> 质疑方式：设计文档模式（场景推演替代复现）
> 证据来源：设计文档 + 代码直读（`src/lib/datasource.ts`、`src/lib/import.ts`、`src/lib/import-prune.ts`、`src/lib/mcp-http-api.ts`、`src/scope.ts`、`web/src/pages/DataSourcePage.tsx`）

---

## 📋 设计上下文确认

### 设计目标
- **核心目标**：数据源从全量同步升级为 Git 感知的增量同步；页面可同步/添加 Git URL；类型与 commit 可见。
- **衡量标准**：真实 `/root/learning` 仓库九场景通过；页面同步限频/并发正确；Git URL 可 clone→登记→首同步。
- **目标优先级**：数据正确性（不漏同步、不误删）> 操作可用性 > 体验优化。

### 设计范围
- **覆盖**：`DataSourceRecord` v2、Git 适配、增量导入、commit 水位、页面同步/限频、类型展示、托管 clone。
- **排除**：定时同步、页面本地目录输入、一 scope 多源、submodule/LFS、私有仓库凭据 UI、页面同步取消。

### 约束与假设
- 单机、单 daemon、同 scope 串行；本机 `git` 可用；远端凭据由运行环境提供。
- 假设源目录内容即数据源真相；删除只进候选、永不自动删。
- 假设 daemon 与 CLI 同版本；旧 daemon 由能力位/前端降级处理。

### 确认状态
- ✅ 目标/范围/约束已确认
- ⚠️ 以下反对意见中 2 项涉及**数据正确性**，需在开发前处理

---

## ⚔️ 反对意见

### 意见1：`checkSourceDir` 若仍在自动更新之前执行，Git 数据源可能永久卡死在 `SOURCE_EMPTY`

- **反对理由**：现有 `syncDataSource` 在读取记录后立刻调用 `checkSourceDir`（`src/lib/datasource.ts:548`），它会在**任何 Git 操作之前**因「源目录没有可导入文件」直接返回 `SOURCE_EMPTY`。设计 S-02 的主流程把 `prepareGitSync` 放在最前，但没有显式说明要**移除/后移**这个检查。实现者若保留现有顺序，会出现：
  1. 远端删除了某个分支上的全部 Markdown，或本地工作区被切到无 md 的提交；
  2. 当前工作区为空 → `checkSourceDir` 先失败；
  3. 即使远端之后重新加入文档，下一次同步仍在 fetch/update 之前失败——**自动更新永远没有机会执行**。
  托管 clone 与本地 git 源都受影响；用户只能手工 pull/重置或重新 add。
- **功能影响**：预期「fetch + 自动更新后同步远端最新内容」→ 实际「源目录为空时永久失败，远端恢复也无法自愈」。
- **严重程度**：🔴 致命（数据源永久不可用，且无自动恢复路径）。
- **替代方案**：把校验拆成两段——
  - Git 前置：`checkSourceReachable`（不存在/不可读 fail-loud；缺失目录无法靠更新修复）；
  - 自动更新之后：`checkSourceDir`（空源、扩展名、dataDir 边界）；
  - `type=directory` 保持现有顺序；`dry-run` 不做更新，按当前工作区校验。
- **验证方法**：临时 repo 的工作区分支无 md，远端 `main` 有 `a.md`；登记为 git 数据源后同步。修复前应复现 `SOURCE_EMPTY` 且未执行 fetch；修复后应导入 `a.md`。

---

### 意见2：`state=ok` 的判据忽略 `stats.errors`，commit 水位可能越过“有错误但未判 partial”的批次

- **反对理由**：现有 `syncDataSource` 的终态判据是 `cancelled ? 'cancelled' : result.partial ? 'partial' : 'ok'`（`src/lib/datasource.ts:603-606`），**不看 `result.stats.errors`**。而同一仓库的 Web 导入任务用的是 `result.partial || result.stats.errors > 0 ? 'partial' : 'succeeded'`（`src/lib/mcp-http-api.ts:2474`）。`stats.errors` 包含 tag 向量失败、附件复制失败、向量清理失败、全文索引失败等（`import.ts` 末尾 `importErrors`）。设计把「`state=ok` 才推进 commit」作为安全线，但没有重新定义 `ok`：
  - 文件正文导入成功、但 tag 向量/附件失败 ⇒ `partial=false`、`stats.errors>0` ⇒ 数据源状态 `ok` ⇒ **commit 推进**；
  - 下一轮增量 diff 为空，这些错误不会被重试；只有用户手动 `--full` 才能再遇到。
- **功能影响**：预期「有错误的批次不推进 commit，下次重试」→ 实际「错误被 commit 水位越过，静默丢失重试机会」。
- **严重程度**：🔴 致命（违反设计自己声明的 commit 安全线；错误不可自愈）。
- **替代方案**：将数据源终态判据与 Web 任务对齐：`state = cancelled ? 'cancelled' : (result.partial || result.stats.errors > 0) ? 'partial' : 'ok'`；或把 `stats.errors` 分为「文件级/会影响文档正确性」与「辅助性」两类，只有前者阻止 commit 推进（需要在 import 结果中增加可判别字段，不能靠文案/数组长度猜）。
- **验证方法**：在隔离 scope 用 `--tags` 触发 tag 向量失败（或 mock `handleDirectImport` 返回 `partial=false, stats.errors=1`），断言 `lastSync.state='partial'` 且 `git.commit` 未推进；修复前应为 `ok` 且推进。

---

### 意见3：页面同步的「查任务 → 建任务」不是原子操作，连点/多标签页可绕过 30 分钟限频

- **反对理由**：S-03 的 `POST /api/datasource/sync` 流程是「严格读任务台账 → 判断 active → 创建任务」。读与写之间没有互斥：
  - 两个并发请求（双击、两个标签页、脚本并发）都能读到「无 active」，都通过限频（此时 `lastSync` 尚未更新），各自创建一条 queued 任务；
  - coordinator 只是串行执行，不会拒绝第二条；结果是同一 scope **连续跑两次同步**，第二次可能刚好处在第一次完成后的 30 分钟冷却内，但因为它早已入队，限频没有拦住。
- **功能影响**：预期「同一数据源同时只有一个同步，且 30 分钟内页面只能触发一次」→ 实际「并发请求可创建多条任务，限频被绕过；目录型数据源会重复全量扫描/embedding」。
- **严重程度**：🟡 重要（不破坏数据，但限频失效、资源浪费，且与 S-03 的承诺不符）。
- **替代方案**：在 daemon 进程内加 per-scope `Set`/互斥锁包住「check + create」；或使用 `withScopeWriteLock(scope, 'datasource-sync-check', ...)` 只包这段（不要包整个同步）；任务台账层增加「同 scope 同 operation 只能有一个 queued/running」的原子创建语义。返回 409 时带已有 taskId。
- **验证方法**：对同一 scope 并发发 5 个 POST，断言 1 个 200 + 4 个 409，且 `/api/tasks` 只有 1 条 `datasource-sync`；修复前应出现多条 queued。

---

### 意见4：`add-remote` 的 clone 不在 scope 锁内，两个并发添加可竞态

- **反对理由**：S-05 的流程是「同步前置校验 `DATASOURCE_EXISTS` → clone 到唯一 tmp → `addDataSource`（此时才拿 scope 写锁）」。两个并发请求可以同时通过存在性检查、同时 clone；随后一个登记成功，另一个：
  - 若同 dir/group，`addDataSource` 可能直接覆盖同一记录；或
  - 若 tmp 的 `rename` 与已存在的 `repo` 冲突，留下失败/半成品；
  - 两个 tmp 目录的清理路径也没有纳入同一把锁。
  设计中的 `SYNC_ALREADY_RUNNING` 只检查 `datasource-sync`，不检查 `datasource-add-remote`。
- **功能影响**：预期「一 scope 一数据源、一次 clone」→ 实际「并发时可产生重复 clone/覆盖登记/TMP 残留」，托管目录与登记可能不一致。
- **严重程度**：🟡 重要（涉及磁盘与登记一致性，恢复需要人工清理）。
- **替代方案**：为 add-remote 增加 per-scope 互斥（与同步共用 scope 锁或单独的 add 锁），覆盖「存在性检查 + clone + rename + 登记」全链路；任务台账把 `datasource-add-remote` 也纳入 active 检查；clone 前清理该 scope 下超过阈值的 `.tmp-repo-*`。
- **验证方法**：对同一 scope 并发发 2 个 add-remote，断言 1 成功 + 1 409，且 `~/.ki/datasources/<scope>` 下只有一个 `repo`、无 `tmp-repo-*`。

---

### 意见5：托管 clone 的 `reset --hard` 不清理 untracked，副本会漂移并被全量同步导入

- **反对理由**：S-05 的托管同步是 `fetch + reset --hard origin/<branch>`。`reset --hard` 不会删除工作区中未被跟踪的文件。托管 clone 一旦出现未跟踪 md（用户手工放入、旧版本残留、构建产物），：
  - 全量同步（首次/`--full`）会把它当数据源内容导入，KB 与远端仓库不一致；
  - 增量同步按 Q2 不收 untracked，但页面只给计数警告，不会删除/清理它；
  - clone 不再是远端镜像，后续排查「为什么库里有这篇」会非常困难。
- **功能影响**：预期「托管 clone = 远端分支镜像」→ 实际「未跟踪文件长期存在并被全量导入，KB 内容漂移」。
- **严重程度**：🟡 重要（数据内容错误，且难以归因）。
- **替代方案**：
  - 托管 clone 同步后执行 `git clean -fdx`（工具拥有副本，明确文档化；`-x` 会删除 ignored 文件，符合镜像语义）；
  - 或每次 clone 到新 tmp、reset 后整体 swap；
  - 至少在 add/同步时检测 `git status --porcelain` 非空并 fail-loud/warn。
- **验证方法**：在托管 clone 内放一个未跟踪 `x.md`，执行同步，断言 `x.md` 被 clean 或同步明确失败；修复前会被全量导入。

---

### 意见6：`ki scope delete` 不清理托管 clone，留下孤儿目录

- **反对理由**：托管 clone 位于 `~/.ki/datasources/<scope>`，不在 dataDir 内；现有 `executeScopeDelete`（`src/scope.ts`）删除 KB/向量，不会触碰该目录。设计只增加了 `ki datasource remove --purge`，但用户完全可能直接 `ki scope delete --yes`：
  - 克隆目录残留，磁盘泄漏；
  - 将来重建同名 scope 再添加 Git 数据源时，会遇到 `CLONE_TARGET_EXISTS`，且旧 clone 可能指向旧远端/旧分支。
- **功能影响**：预期「删除 scope 即清理该 scope 的派生资源」→ 实际「clone 目录成为孤儿，后续同名 scope 受阻」。
- **严重程度**：🟡 重要（资源泄漏 + 后续操作阻塞）。
- **替代方案**：在 `executeScopeDelete` 的预览与执行中读取 `datasource.json`：若 `git.managed`，把 clone 目录纳入删除清单（二次确认）；或明确拒绝并提示先 `ki datasource remove --purge`。另可增加启动时孤儿目录扫描（只报告，不自动删）。
- **验证方法**：创建托管数据源 → `ki scope delete <scope> --yes` → 检查 `<cloneRoot>/<scope>` 是否存在；修复前应存在。

---

### 意见7：符号链接形式的数据源目录未 canonicalize，`relativeRoot` 会被判成越界

- **反对理由**：S-01 的 `probeGit` 用 `path.relative(repoRoot, dir)` 计算 `relativeRoot`；`resolveSourceDirInput` 只做 `path.resolve`（不解析符号链接）。当数据源目录是指向仓库内子目录的 symlink 时：
  - `git rev-parse --show-toplevel` 返回**真实路径**的 repoRoot；
  - `dir` 是 symlink 路径，`path.relative` 可能得到 `..` 开头 → `GIT_SUBDIR_INVALID`，或得到错误的相对前缀；
  - 现有 `checkSourceDir` 已处理 symlink（`lstat` + `stat`），但探测层没有。
- **功能影响**：预期「symlink 指向仓库子目录也能登记为 git 源」→ 实际「被拒绝或按错误前缀过滤，增量永远为空」。
- **严重程度**：🟡 重要（一类合法输入无法使用，且错误信息会误导）。
- **替代方案**：`probeGit` 内先对 `dir` 与 `repoRoot` 做 `fs.realpathSync`，再计算 `relativeRoot`；记录 `dir` 可保留用户输入（展示）但过滤必须用 canonical 路径；在 `add` 结果中标注 canonical 路径。
- **验证方法**：`ln -s /root/learning/langchain /tmp/lc-link`，`ki datasource add --source /tmp/lc-link`，断言 `type=git`、`relativeRoot=langchain`；修复前应为 `GIT_SUBDIR_INVALID` 或目录。

---

### 意见8：Git fetch/update/diff 阶段没有任务进度，长操作看起来像卡死

- **反对理由**：S-02 的 `onProgress` 只转发导入管线的阶段；`prepareGitSync`（fetch 15s + merge/reset 30s）与 `collectGitChanges`（diff 60s）在导入之前执行，但任务台账的 `phase/progress` 在导入开始前一直是空的。S-03 的页面在 active 时只显示「同步中」。
  - 大仓库 fetch/diff 可能接近超时；
  - 用户看不到任何阶段，容易重复点击（然后命中 409/429）或以为卡死。
- **功能影响**：预期「同步中能看到 fetch/update/diff 进度」→ 实际「最长 1 分钟以上的无反馈等待」。
- **严重程度**：🟡 重要（体验与可用性；会诱发重复触发）。
- **替代方案**：为 `syncDataSource` 增加 `onPhase`/`reportProgress`：`git-fetch`、`git-update`、`git-diff` 三个阶段，至少更新任务 `phase` 与 heartbeat；页面沿用现有任务详情展示。
- **验证方法**：mock 一个慢 fetch/diff（或大仓库），观察任务详情的 phase；修复前 phase 为空。

---

## ✅ 认可点

- **`commit` 与 `runCommit` 分离**、仅成功推进水位，是对「partial 不得越过失败文件」的正确抽象；比单字段水位稳健。
- **`pruneSubsetFullScan` 不改 `onlyRelPaths` 语义**，把「子集导入」与「全量扫描算候选」解耦，避免了 Web「重试未完成」行为回归。
- **本地自动更新只允许 `merge --ff-only`**、托管 clone 才 `reset --hard`，清楚区分了「用户工作区」与「工具副本」的破坏边界。
- **30 分钟冷却以 `state=ok` 为基准、partial 不冷却**，给「修好 embedding 后重试」留了出口。
- **Git URL 白名单 + `execFile` + `--` + 禁交互**，把 clone 的主要注入面收敛得比较干净。

---

## ➕ 补充场景与情况

1. **空变更页面的统计呈现**：空 diff 早退时 `files.scanned/completed/unchanged` 均为 0，只有 `fullScanned=N`；页面若不额外提示「本次无变更」，用户会以为没扫描。建议加一行 info 提示，而不是只靠数字。
2. **rename 的展示**：`--no-renames` 让重命名表现为「旧路径进待删 + 新路径导入」；数据正确，但用户会看到一条待删候选。建议在待删段或同步结果里提示「N 个重命名按删除+新增处理」。
3. **daemon 重启/进程崩溃后的 clone 临时目录**：`.tmp-repo-*` 只在 clone 失败时清理；进程被 kill 时会残留。建议 add-remote 启动时清理同 scope 下过期的临时目录。
4. **`fetch/update` 失败但 commit 推进**：设计会继续本地同步并推进到本地 HEAD；页面虽显示 warning，但用户可能把「同步成功」理解为「已更新到远端」。建议在同步结果摘要中明确「本次未更新到远端」。
5. **tag 作为 `--branch`**：`git clone --branch <tag>` 会得到 detached HEAD，后续 `reset --hard origin/<tag>` 不可用。建议明确只支持远端分支，或在 clone 后校验 `remoteBranch` 是 branch。
6. **备份/恢复**：托管 clone 不在 KB 备份内；恢复 KB 后数据源记录仍指向 clone。需要文档说明「恢复后若 clone 缺失，请重新 add/同步」，或把 clone 路径纳入 restore 校验。

---

## 🔄 整体替代方案

不认为整体方向需要重做。上述问题均可通过流程重排、原子化、清理与可观测性补齐解决；不建议改用「每次全量」或「完全依赖用户手动 git」的替代方向——那会背离本需求的核心价值。

---

## 📊 风险评估与建议

### 🎯 裁决结论

**⚠️ 修改 🔴/🟡 意见后进入开发**（不建议按当前设计直接开工）。

### 识别的风险

- **风险1（意见1）**：Git 源在空工作区状态下永久失败，远端恢复也无法自愈 —— 可能性：中 —— 功能影响：预期自动更新恢复同步 → 实际数据源长期不可用。
- **风险2（意见2）**：commit 水位越过有错误的批次 —— 可能性：中高 —— 功能影响：预期失败项下次重试 → 实际静默丢失重试，直到手工全量。
- **风险3（意见3）**：并发 POST 绕过限频、重复同步 —— 可能性：中 —— 功能影响：预期一次同步 → 实际重复全量扫描/embedding，资源翻倍。
- **风险4（意见4）**：并发 add-remote 产生重复 clone/覆盖登记 —— 可能性：低中 —— 功能影响：预期一 scope 一源 → 实际磁盘/登记不一致。
- **风险5（意见5）**：托管 clone 未跟踪文件漂移并进入 KB —— 可能性：中 —— 功能影响：预期镜像远端 → 实际 KB 内容漂移。
- **风险6（意见6）**：scope delete 留下孤儿 clone —— 可能性：中 —— 功能影响：磁盘泄漏、同名 scope 重建受阻。
- **风险7（意见7）**：symlink 数据源不可用 —— 可能性：低 —— 功能影响：一类合法输入被误拒。
- **风险8（意见8）**：Git 阶段无进度 —— 可能性：高 —— 功能影响：长等待无反馈，诱发重复触发。

### 风险等级

- **总体风险**：🔴 高风险（2 项数据正确性/可用性缺陷）
- **风险分布**：高风险 2 个，中风险 6 个，低风险 0 个（另 6 条补充场景）

### 行动建议

#### 必须处理（对应 🔴 功能影响）

1. **重排 `checkSourceDir`**：Git 源先做可达性检查，自动更新后再做空源/扩展名校验；`type=directory` 保持原序。验证场景见意见1。
2. **统一 `state=ok` 判据**：`result.partial || stats.errors > 0 || cancelled` 均不得推进 commit；或者把辅助错误分类并在结果中结构化，避免靠 `stats.errors` 长度猜。验证场景见意见2。

#### 建议处理（对应 🟡 功能影响）

1. **页面同步 check+create 原子化**：per-scope 互斥/原子任务创建，返回 409 带 taskId。验证并发 5 请求。
2. **add-remote 全链路 per-scope 互斥**，并把 `datasource-add-remote` 纳入 active 检查；清理过期 `.tmp-repo-*`。
3. **托管 clone reset 后 `git clean -fdx`**（或同步前检测 dirty 并 fail-loud/warn）。
4. **`ki scope delete` 处理托管 clone**：预览+删除，或拒绝并提示 `remove --purge`。
5. **`probeGit` 用 `realpath` 计算 `relativeRoot`**，覆盖 symlink 数据源。
6. **补 Git 阶段进度**：`git-fetch` / `git-update` / `git-diff` 写入任务 phase。

#### 可选处理

1. 空变更/重命名/远端未更新的结果摘要补显式提示。
2. 备份/恢复文档补「托管 clone 不在备份内」。
3. 明确 `--branch` 只支持远端分支，tag 场景给出错误。

---

## 处置记录（2026-10-21，用户选择「按质疑修订设计」）

| 意见 | 状态 | 修订位置 | 摘要 |
|---|---|---|---|
| 1 🔴 `checkSourceDir` 先于自动更新 | ✅ 已修复 | S-02 §3.3 | 新增「校验顺序」表：git 源先可达性 → 自动更新 → 再 `checkSourceDir`；directory 保持原序；dry-run 用当前工作区；伪代码同步更新 |
| 2 🔴 `state=ok` 忽略 `stats.errors` | ✅ 已修复 | S-02 §3.3 | 终态改为 `cancelled / (partial \|\| stats.errors>0) / ok`；明确只有 ok 推进 commit，与 CLI 任务态同口径 |
| 3 🟡 页面同步 check+create 竞态 | ✅ 已修复 | S-03 §3.3 | 新增 daemon 进程内 per-scope `syncGates` Map，同步 check+set 后再建任务；finish 与 submit 失败都释放；补并发 5 请求验收 |
| 4 🟡 add-remote clone 不在锁内 | ✅ 已修复 | S-05 §3.5 | `withScopeWriteLock(scope, 'datasource-add-remote')` 包住「锁内存在性检查 + clone + rename + 登记」；`datasource-add-remote` 纳入 active 检查 |
| 5 🟡 托管 clone reset 不清 untracked | ✅ 已修复 | S-05 §3.6 | reset 后 `git clean -fdx`（仅托管副本）；失败 `GIT_CLEAN_FAILED`，不导入脏副本；本地 Git 源绝不 clean |
| 6 🟡 scope delete 留孤儿 clone | ✅ 已修复 | S-05 §3.7 | `executeScopeDelete` 预览/执行读取 `datasource.json`，托管 clone 纳入删除清单；`scope.ts` 动态 import 避免循环依赖 |
| 7 🟡 symlink 未 canonicalize | ✅ 已修复 | S-01 §3.2 | `probeGit` 对 `dir` 与 `repoRoot` 先 `fs.realpathSync` 再算 `relativeRoot` |
| 8 🟡 Git 阶段无进度 | ✅ 已修复 | S-02 §3.3、S-03 §3.3 | 新增 `onPhase('git-fetch'/'git-update'/'git-diff')`，页面任务 phase 随阶段更新 |
| 补充：stale `.tmp-repo-*` | ✅ 已补 | S-05 §3.4 | add 前清理该 scope 超过 1h 的临时目录 |
| 补充：tag 作为 branch | ✅ 已补 | S-05 §3.3 | 明确只支持远端分支，tag 不支持 |
| 补充：空变更/重命名/远端未更新提示 | ⏳ 待实现 | S-04/S-02 | 作为实现期 UI 细节；不阻塞设计 |
| 补充：备份不含托管 clone | ⏳ 待实现 | S-05 | 文档说明；不阻塞设计 |

**处置结论**：2 项 🔴 与 6 项 🟡 均已修订设计；建议进入下一轮增量评审确认无回归。
