# Code Review：共享托管 clone（同一仓库多 scope 复用一份工作副本）

- 审查对象：工作区未提交改动（`git diff` 10 改 + 1 新增测试，+571/−124）
- 基线：`master` @ `8c45478`（工作区 dirty，结论仅对当前工作区有效）
- 审查时间：2026-10-22
- 声称意图（用户 /debug 报障 + 拍板「共享托管 clone」）：
  1. 同一 Git 仓库换子目录 / 新 scope 时**不再重复 clone**；
  2. **不存在的子目录在 clone 前就报错**，不再等 clone 完成才失败。

## 结论

**✅ 可合入**（P0 0 / P1 0 / P2 4 已修 / P3 2 已修）。意图 1、2 均由运行时证据证明达成。

## 意图达成证据

| 判据 | 证据 |
|------|------|
| 换子目录不重 clone | 隔离 CLI 实测：`s1 --subdir docs` clone → `s2 --subdir docs` 输出「复用已有托管 clone（…/s1/repo），未重复下载」，`ls <cloneRoot>` 仍只有 `s1` 一个目录 |
| 非法子目录即时报错 | 同一 CLI 实测 `--subdir nope` → `code=INVALID_SUBDIR` + `hint=仓库顶层目录：docs、notes`，**未创建 scope**（`ls kb` 只有 alpha/beta）；生产 `POST /api/datasource/add-remote`（`blog-git` + `sasa`）返回 **400** 且**未建任务** |
| 复用后各 scope 用自己的子目录 | `test/mcp-http-api.test.ts`：`repoRoot` 与 owner 相同、`relativeRoot=''`、`dir=<repoRoot>`、`<cloneRoot>/<reuseScope>` 不存在 |
| 引用计数保护共享副本 | 隔离 CLI：删 owner（`alpha`）→ `cloneRemoveSkipped:true` + 「其他 1 个 scope 仍在使用」，clone 目录仍在；删最后一个（`beta`）→ `cloneRemoved:true`，clone 根清空。`test/scope-doc.test.ts` 同口径 21/21 |

## 本轮修复

| # | 级别 | 问题 | 修复 | 验证 |
|---|------|------|------|------|
| 1 | P2 | **复用判据未校验托管布局**：只要 `git.managed=true` 就复用，记录被手工编辑成 clone 根外的路径时也会被当共享副本；且 `managedCloneDirOf` 对该路径返回 `null` ⇒ 引用计数/`scope delete` 永远不会清理它 | `findReusableManagedClone` 增加 `managedCloneDirForRepo(repoRoot)` 过滤（只认 `<cloneRoot>/<owner>/repo`） | `datasource-shared-clone` 新增「outside-layout 不复用」断言，3/3 |
| 2 | P2 | **分支匹配把 `git.branch` 也算身份**：共享工作树的真实身份是 `remoteBranch`（同步按它 `reset --hard`），若一条记录的 checkout 分支恰与请求分支同名而 `remoteBranch` 不同，会跨分支复用同一工作树 | 只按 `git.remoteBranch === branch` 匹配 | 新增「`dev` 不复用 main 副本」「同 URL 两分支且未指定分支 ⇒ 不猜默认分支」断言 |
| 3 | P2 | **remote 锁键与复用判据不同源**：锁用 `sanitizeRemoteUrl(url)`，复用用「去尾 `/` 与 `.git`」的 key ⇒ `repo` 与 `repo.git` 走两把锁，两个并发 add 都看不到对方而各自 clone | `remoteAddLockScope` 改用同一 `remoteUrlKey` | `datasource-clone-url` 12/12 无回归；锁语义由既有并发用例覆盖 |
| 4 | P2 | `checkManagedSubdir` 用 `lstat` 后**先判 `isDirectory()`**：符号链接的 `isDirectory()` 恒 false，于是 symlink 子目录被报成「不存在或不是目录」，专写的「不能是符号链接」分支不可达（诊断误导） | 先判 `isSymbolicLink`，越出仓库/不能是链接两类不再重复列顶层目录 | `datasource-clone` 14/14（symlink 用例仍 `INVALID_SUBDIR`，`repo` 不残留） |
| 5 | P3 | 同函数内 `topLevelDirsHint(repoRoot)` 在三处各调一次（重复 `readdirSync`） | 收口为一个 `fail()` 闭包，按错误类型决定是否带提示 | 同上 |
| 6 | P3 | `removeDataSource` 注释仍是共享前的「repoRoot 必须精确等于 `<cloneRoot>/<scope>/repo`」，与新语义相反 | 更正为「托管目录可能属于另一个 scope，能否删由引用计数决定」 | 静态 |
| 7 | 测试口径 | mcp-http-api 的复用用例**用了同一个子目录**，只证明「同 dir 复用」，没覆盖用户报障的「换子目录」 | 复用 scope 改为根子目录（`subdir: ''`），断言 `relativeRoot=''`、`dir=repoRoot`、无第二 clone 目录 | `mcp-http-api` 58/58 |

## 回归证据（全部实跑）

- `tsc --noEmit -p tsconfig.json`：仅既有 2 条基线（`import-budget.ts` / `mcp-http.ts`）
- `npm run build`：通过
- 后端定向套件全绿：clone **14** · clone-url **12** · shared-clone **3**（新增复用判据） · git-probe **10** · model-v2 **5** · policy **7** · runtime **4** · sync-incremental **11** · sync-managed **2** · task-registry **6** · scope-doc **21** · mcp-http-api **58**
- 隔离 CLI 端到端：clone → 复用 → 非法子目录 → 删 owner 保留 → 删末位清理（5 步全对）
- `git diff --check`：干净
- 生产 7423（pid 3318776）只读/接口验证：`add-remote` 非法子目录 400 + 顶层目录提示 + 零任务；数据源列表仍为 `langchain` / `blog-es` / `scope`

## 未修（登记为已知限制，见 `challenge-report-shared-clone.md`）

复用只取首个候选、陈旧副本的前置校验假拒、owner 目录名被保留 clone 占用、并发 add 返回 `CLONE_BUSY` 而非排队、clone 锁覆盖整个导入、`remove` 不带 `--purge` 留下的无引用孤儿、corrupt 记录不计入引用。
