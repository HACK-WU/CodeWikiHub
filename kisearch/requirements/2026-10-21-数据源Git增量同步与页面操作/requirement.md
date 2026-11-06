---
id: REQ-20261021-003
feature: 数据源 Git 增量同步与页面操作
status: 草案
created: 2026-10-21
updated: 2026-10-21
version: 2
tags: [feat, datasource, git, ux]
depends_on: [REQ-20261020-001]
author: AI
document_type: requirement
---

# 需求分析：数据源 Git 增量同步与页面操作

- **来源**：用户 2026-10-21 原话（4 点）：
  1. `ki datasource add` 添加数据源时可标记目录为 git 仓库；git 仓库同步时记录 commit，与上次 commit 比较做增量同步（只同步变化文件）；同步前自动 `git fetch`，失败则跳过 fetch、给出提示后继续同步。
  2. 页面可点击同步；非 git 目录数据源有频率限制（如 30 分钟一次）；必须同步时提示使用 CLI 命令。
  3. 数据源新增类型字段（git / 普通目录）。
  4. 页面可输入 git 仓库地址作为数据源，然后执行同步。
- **分析口径**：product-manager（M1 需求定义）。本次涉及外部 `git` 依赖 + 数据模型/同步流程变更，按**严谨档**取证；确认点合并为 §8 一张拍板表（避免逐条打断）。
- **证据声明**：最高 `🟢` = **代码直读 + 真实仓库只读探测**（读取了当前数据源记录、`/root/learning` 仓库的 git 状态）。**未运行产品、未做界面实测**；涉及体验/视觉的判断标 `🟡`，不写成界面实测结论。
- **前置记忆**：`AGENTS.md` 已记载 `REQ-20261020-001`（数据源登记与同步，CLI 为主 + 页面只读）已完成并上线；本需求是对它的增强，**其中第 2、4 点会反转该需求的「页面只读」决策**（见 §3 影响面）。
- **已拍板结论（2026-10-21 第二轮，用户确认）**：
  - **Q1 自动更新**：本地 Git 数据源 fetch 后自动快进（`merge --ff-only`）；无法快进则警告并继续用本地内容。**本地仓库绝不 reset、不丢弃本地提交或未提交修改**。工具托管的 clone 用 `fetch + reset --hard origin/<branch>`。
  - **Q2 增量不包含 untracked**：只同步「已跟踪文件的提交/工作区变更」；未跟踪文件不参与增量。必须把它做成**可感知的警告**（显示未跟踪且可导入的文件数）+ 提供 `--full` 全量同步出口。
  - **Q3 支持子目录数据源**：用 `repoRoot + relativeRoot` 过滤变更路径（用户当前 `langchain` 就是 `/root/learning` 的子目录）。
  - **Q4 接受 30 分钟频率限制**（非 Git 目录的页面同步；CLI 可强制）。
  - **Q5 页面不允许输入本地目录路径**：本地目录仍通过 CLI 登记。
  - 其余 **Q6~Q10** 暂按 §8 的「推荐」默认，设计阶段确认。

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | **Git 增量同步是新能力，不是重复建设；但「增量」在现有实现里已有一半**。现有导入按内容哈希判断「内容未变」后跳过重算（不重切分、不重算 embedding）——但它仍会扫描、清洗、切分、哈希**每一个**文件；Git diff 的价值是把这层也省掉，并额外提供 commit 追踪与远端 fetch。 | `src/lib/import.ts:1171-1186`、`src/lib/import.ts:1231-1233`；`src/lib/import.ts:273`（`onlyRelPaths`） |
| 2 | **用户当前的 `langchain` 数据源不是仓库根，而是 `/root/learning` 仓库的 `langchain/` 子目录**。因此「目录 = git 仓库」的直觉不成立，必须支持「数据源目录是仓库子目录」：用 `repoRoot + relativeRoot` 过滤 git 变更路径。否则用户自己的第一个数据源就无法使用该功能。 | `git -C /root/learning/langchain rev-parse --show-toplevel` → `/root/learning`；HEAD `6e6a8d7`（2026-10-19），remote `git@github.com:HACK-WU/learning.git` |
| 3 | **需求分析时该数据源 241 篇已同步文档中有 46 篇是未跟踪文件（untracked）**（`langchain/deepagents/**`；197 篇 tracked + 46 篇 untracked）。**用户已拍板：增量不包含 untracked** ⇒ 未跟踪文件在变化后不会自动同步。必须把「未跟踪文件不参与增量」做成**可感知的警告**（页面/CLI 显示未跟踪且可导入的文件数）+ 提供 `--full` 全量同步出口，否则会造成文档静默停更。**注：该仓库已于 2026-10-21 15:55 提交这批文件（当前 untracked=0）**，设计不依赖固定数字，警告按每次同步实测计数。 | `git ls-files --others --exclude-standard` 实测（分析时 46 篇，设计时 0 篇）；`~/.ki-data/langchain/datasource.json` 的 `lastSync.seenRels` 实测 241 条；用户 Q2 裁决 |
| 4 | **`git fetch` 不会更新工作区；用户已拍板「自动更新」**。因此同步流程必须是 fetch → 自动快进/重置 → 再算 diff：本地仓库用 `merge --ff-only`（**绝不 reset、不丢弃本地提交与未提交修改**；无法快进时警告并继续用本地内容），工具托管 clone 用 `reset --hard origin/<branch>`。 | git 基本语义 + 当前 `learning` 仓库 `master...origin/master` 已配置；用户 Q1 裁决 |
| 5 | **页面同步/添加会反转既有产品决策**：`REQ-20261020-001` 明确「CLI 是登记与同步的唯一入口；页面只读」。新需求要做页面写操作，必须同步改页面 callout、空态、`docs/cli.md`、`docs/mcp-http.md`，并明确「本地目录仍只能 CLI 登记」（浏览器无法访问服务器文件系统）。 | `web/src/pages/DataSourcePage.tsx:250-257`；`docs/cli.md:106-108`；`docs/mcp-http.md:119-121` |
| 6 | **一个隐藏的破坏点：`onlyRelPaths` 会让待删候选停算**。`handleDirectImport` 只要收到非空 `onlyRelPaths` 就把 `subsetRetry=true`，而 prune 前置校验遇到 `SUBSET_RETRY` 直接跳过候选计算——结果是「Git 增量开了，删除提醒没了」。必须新增「子集导入但全量扫描」的语义，不能直接把 git 变更列表塞给 `onlyRelPaths`。 | `src/lib/import.ts:797`、`src/lib/import-prune.ts:185`、`src/lib/import-prune.ts:9-13` |
| 7 | **Git 记录必须只在「完整成功」时推进**。若 `partial`/`cancelled`/`failed` 也把 commit 推到最新，失败文件下一次 diff 不会再出现，等于永久漏同步。做法：捕获**自动更新完成后、扫描开始前**的 HEAD，`ok` 才写入；其余状态保留旧 commit。 | `src/lib/datasource.ts:603-633`（现有 success/partial 分支） |
| 8 | **无变化时必须区分「没有变更」与「未指定清单」**。`handleDirectImport` 把空数组当「未指定」（全量处理），直接把空 git diff 传进去会触发一次全量重跑。需要在数据源编排层早退（算候选但不导入），或新增显式“严格白名单”语义。 | `src/lib/import.ts:954-968` |
| 9 | **页面触发同步需要服务端能力，不只是按钮**：新增 `POST /api/datasource/sync`（鉴权 + 并发闸门 + 任务台账 + coordinator），否则页面无法知道排队/运行/结果；`datasource-sync` 已登记为 `engine-only`，可复用。 | `src/lib/mcp-http-api.ts:729-732`（当前无 sync/add 路由）；`src/lib/operation-coordinator.ts:97`；`src/lib/daemon-dispatch.ts:60` |
| 10 | **远程仓库数据源（第 4 点）是独立的大能力**：clone 目标管理、私有仓库凭据、分支/子目录、clone 超时与清理、URL 注入防护，均不是「加一个输入框」的量级。建议与第 1~3 点拆分交付。 | 见 §4 R7、§5 N10/N11 |

---

## 2. 现状与能力盘点

| 事项 | 现状 | 证据 |
|---|---|---|
| 数据源模型 | `DataSourceRecord` 只有 `dir / group / conflictMode / vector / chunkSize / chunkOverlap / lastSync`，**没有类型、没有 git 字段** | `src/lib/datasource-types.ts:95-113` |
| 数据源读写 | `normalizeRecord` 逐字段归一，旧记录缺字段有默认值；`writeDataSource` 原子写 0600 | `src/lib/datasource.ts:100-139` |
| 同步编排 | `syncDataSource` = 目录校验 → `handleDirectImport`（不写 source 块）→ 用 `onScannedFiles` 的全量文件写 `seenRels` → 落 `lastSync`；**永不删除** | `src/lib/datasource.ts:533-650` |
| 全量扫描 | `handleDirectImport` 先 `collectMarkdownFiles` 全量扫描，再按 `onlyRelPaths` 过滤待处理集；`onScannedFiles(files)` 在过滤前回调 | `src/lib/import.ts:781`；`src/lib/import.ts:954-968` |
| 内容级增量 | 每个文件计算 chunk 条目后与 relation 的 `memoryIds` 比对，内容未变则跳过重算；仍会清洗/切分/哈希所有文件 | `src/lib/import.ts:1171-1186` |
| 清理候选 | `planImportPrune` 的 `scannedRels` 必须是**全量扫描**；`onlyRelPaths` 非空 → `SUBSET_RETRY` → 不算候选 | `src/lib/import-prune.ts:9-13`、`:185` |
| 页面 | 全宽列表 + 右侧抽屉；**页面只读**，唯一写操作是删除待删候选；同步只能在 CLI | `web/src/pages/DataSourcePage.tsx:1-12`、`:250-257` |
| HTTP API | 只有 `GET /api/datasource/list|detail` 与 `POST /api/datasource/prune`；无 sync/add 路由 | `src/lib/mcp-http-api.ts:729-732` |
| 任务与队列 | `datasource-sync` 已登记为 `engine-only`；CLI daemon 路径会创建 `datasource-sync` 任务；页面通过台账识别 `queued/running` | `src/lib/operation-coordinator.ts:97`；`src/lib/daemon-dispatch.ts:60`；`src/lib/datasource-runtime.ts:24-40` |
| 任务参数快照 | `toParamSnapshot` 已支持 `datasource-sync`，但只记录 sourceDir/group/vector/conflict/chunk 等 | `src/lib/task-snapshot.ts:51` |
| 详情展示 | 抽屉「同步参数」显示源目录/落点/策略/切分；「执行结果」显示扫描/完成/跳过/失败/向量/全文条目 | `web/src/lib/dataSourceDetailModel.ts:263-281` |
| Git 依赖 | 系统已安装 git；当前数据源目录处于 git 仓库子目录；仓库有 remote（SSH） | 真实环境探测（`git --version` / `rev-parse` / `remote -v`） |
| 现有真实数据 | `langchain`：241 篇、状态 ok、29 篇内容未变、0 待删；`scope`：同一目录、从未同步 | `~/.ki-data/{langchain,scope}/datasource.json` |

---

## 3. 影响面（关联功能与影响评估）

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需用户拍板 |
|---|---|---|---|---|---|
| `datasource.json` 模型与全部读写方（CLI add/list/sync/remove、HTTP list/detail、页面） | 数据/契约 | 降级（新增可选字段，旧记录可兼容） | `datasource-types.ts:95`、`datasource.ts:100` | 新增 `type` / `git` 字段；旧记录缺 `type` 按「目录」处理；`list --json` 增字段；页面兼容旧 daemon | 否 |
| 待删候选（prune） | 流程 | **破坏**：直接把 Git 变更塞进 `onlyRelPaths` 会让候选停算 | `import-prune.ts:185`、`import.ts:797` | 新增「子集导入 + 全量扫描」标志，保持 Web 导入的 `SUBSET_RETRY` 语义不变 | 否（必须配套） |
| `seenRels` 基线 | 数据 | 无感（全量扫描回调仍在过滤前） | `import.ts:781`、`datasource.ts:600` | 增量同步仍以全量扫描结果作为基线，**不得**用变更子集 | 否 |
| 同步统计口径（页面「扫描/完成/跳过」） | 展示 | 降级（只显示变更数会让人误以为源目录变小/大量跳过） | `import.ts:1014`、`dataSourceDetailModel.ts:272-281` | 快照增 `fullScanned` / `changed`；页面分「全量扫描 N / 本次变更 M」展示 | 是（口径） |
| 任务中心 / 任务台账 | 流程 | 无感（复用 `datasource-sync`） | `operation-coordinator.ts:97` | 页面同步创建同 operation 任务，写 params（含 type/commit） | 否 |
| 页面「只读」定位与文档 | 产品契约 | **破坏**（与 REQ-20261020-001 Q13 相反） | `DataSourcePage.tsx:250`、`docs/cli.md:108`、`docs/mcp-http.md:119-121` | 更新 callout/空态/文档；明确本地目录仍走 CLI | 是（反转确认） |
| `/api/*` 鉴权 | 权限 | 破坏（新增写接口若不校验可越权） | 既有 `scopeAllowed` | 每个新接口按 scope 校验；`all` token 通配 | 否 |
| daemon 的 git 凭据环境 | 外部依赖 | 降级（daemon 可能没有 SSH agent / credential helper） | 当前 remote 为 `git@github.com:...` | clone/fetch 失败给出「凭据/网络」可执行指引；页面显示 warning | 是（私有仓库支持范围） |
| `datasource.json` 并发写 | 数据 | 降级（现有读改写未持 scope 写锁；页面 add/sync 并发会放大） | `writeDataSource`；AGENTS.md 已登记该风险 | 用 scope 写锁包住 add/sync/remove 的读改写 | 否（必须） |
| Git URL 安全 | 安全 | 破坏（`ext::` 可执行命令；URL 中的凭据会落盘） | 需新增校验 | 白名单 scheme + `execFile` 参数数组 + 拒绝 `user:pass@` + `GIT_TERMINAL_PROMPT=0` + 超时 | 是（URL 范围） |
| 同步耗时/磁盘 | 性能 | 降级（clone 可能数分钟；全量扫描仍在） | — | 任务化 + 进度 + clone 超时/清理 + 复用导入预算预检 | 否 |
| 同一目录登记给两个 scope（现状 `langchain` 与 `scope`） | 数据 | 无感（各自维护 lastCommit） | `~/.ki-data/*/datasource.json` | 文档说明：commit 状态按 scope 独立；两份同步互不影响 | 否 |
| `.git` 目录被扫描 | 数据 | 无感（扫描器跳过隐藏目录） | `import.ts:396-399` | 保持；无需额外排除 | 否 |
| 其他外部消费方（webhook、报表、订阅） | — | **未发现（需确认）** | 仓库内无相关订阅 | 如外部有消费 `datasource.json` 的脚本需自查 | 是 |

---

## 4. 需求清单

> 优先级：P0 = 本需求成立所必需；P1 = 强烈建议同批交付；P2 = 可后续迭代。
> 验收标准均为**可操作、可观测**的行为，不写“体验良好”这类不可判定项。

### R1 数据源类型字段与 Git 识别（P0）

**需求**
- `DataSourceRecord` 增 `type: 'directory' | 'git'`；增 `git` 元信息：
  - `repoRoot`（仓库根绝对路径，可能是 `dir` 的祖先）
  - `relativeRoot`（`dir` 相对 `repoRoot` 的前缀，posix；仓库根时为 `''`）
  - `branch`（当前分支）
  - `remoteUrl`（仅记录，**不得含凭据**）
  - `managed`（是否为工具托管的 clone；本地目录为 false）
- `ki datasource add` 自动探测：`git -C <dir> rev-parse --show-toplevel` 成功 → `type=git`；支持 `--type git|directory` 显式覆盖（用于探测失败/用户不想走 git 的场景）。
- 旧记录（无 `type`）读取时按 `directory` 处理，不阻塞列表；下次 `add` 或首次同步时可升级并持久化。
- `type=git` 但目录已不再是仓库 / git 不可用 → **fail-loud**，提示改用 `--type directory`，不静默降级。

**验收**
- `add --source /root/learning/langchain` → `type=git`、`repoRoot=/root/learning`、`relativeRoot=langchain`（子目录数据源，Q3 已拍板）。
- `add --source <普通目录>` → `type=directory`。
- 旧 `datasource.json`（无 type）读取/列表正常；重新 add 后落 `type`。
- 删除/重命名仓库根后同步 → 明确错误码 + 可执行下一步。

### R2 Git 增量同步（P0）

**需求**
- 首次同步（无 `git.lastCommit`）：全量导入（**含 untracked**，与现有导入口径一致），成功后记录**自动更新完成后、扫描开始前**的 HEAD。
- 后续同步：计算变更集 =
  - `git -C <repoRoot> diff --name-status -z <lastCommit> -- <relativeRoot>`（工作区 vs 上次 commit，包含已提交与未提交的 **tracked** 变更）
  - **不包含 untracked**（Q2 已拍板）；`git ls-files --others --exclude-standard` 只用于**统计并提示**「N 个未跟踪文件不参与增量」，不进入 `onlyRelPaths`
  - 过滤到 `relativeRoot` 前缀并剥离；只保留导入扩展名白名单。
- 变更文件通过 `onlyRelPaths` 只做导入；**全量扫描仍执行**（用于 `seenRels` 与 prune 候选）。
- 删除/重命名文件：由全量扫描自然发现 → 进入待删候选（仍永不自动删除）。
- 无变更：不调用导入；仍重算候选、更新 `lastSync`（`changed=0`、`state=ok`），并推进到当前 HEAD（Q6 默认）。不把空数组传给 `onlyRelPaths`（会被当作未指定 → 全量）。
- 只有 `state=ok` 时推进 `git.lastCommit`；`partial` / `cancelled` / `failed` 保留旧 commit，下次重试。
- `--full`（CLI）/ 页面「全量同步」入口：忽略 commit diff，全量处理（**包含 untracked**）并推进 commit。
- 每次同步计算「未跟踪且可导入的文件数」（排除隐藏目录/node_modules，与扫描器同口径）；>0 时写入 `lastSync.git.untrackedMarkdown` 并在页面/CLI 显示警告。
- 记录 `lastSync.git = { commit, shortCommit, subject, authorTime, changedCount, fullScanned, untrackedMarkdown, updateWarning?, fetchWarning? }`。

**验收**
- 修改 1 篇 tracked + 新增 1 篇已 `git add` → 仅这 2 篇进入处理；其余文章内容未变；`seenRels` 仍为全量。
- 新增 1 篇但未 `git add`（untracked）→ 不进入本次增量；页面显示「N 个未跟踪文件不参与增量，需全量同步」。
- 删除 1 篇 → 下次同步的待删候选包含它（不自动删）。
- 无变化再同步 → 处理 0 篇、不产生 embedding 请求、commit 推进到当前 HEAD（若 HEAD 变了）。
- 部分失败后再同步 → 失败文件仍出现在变更集里（旧 commit 未被推进）。
- 子目录数据源：只同步 `langchain/` 下的变更，仓库其他目录的变更不进入清单。
- `--full` → untracked 文件被导入/更新。

### R3 git fetch 前置与远端语义（P0）

**需求**
- `type=git` 且有 remote：同步前执行 `git fetch`；超时（建议 15s）、`GIT_TERMINAL_PROMPT=0`；失败时记录 `fetchWarning` 并**继续同步本地内容**。
- **Q1 已拍板「自动更新」**：
  - 本地 Git 数据源：fetch 后执行 `git merge --ff-only @{u}`（无 upstream 时用 `origin/<branch>`）。**只允许快进**：绝不 `reset`、不产生合并提交、不覆盖本地未提交修改。无法快进（分叉 / 本地有提交 / 工作区冲突）→ 记录 `updateWarning`，**不中断同步**，本次同步本地工作区内容。
  - 工具托管 clone（R7）：fetch 后 `git reset --hard origin/<branch>`（工具拥有副本）。
- **顺序固定**：fetch → 自动更新 → 捕获 HEAD → 计算 diff → 导入。成功后记录更新后的 HEAD；更新失败时记录当前本地 HEAD，并在 `lastSync` 标 warning。
- 无 remote / detached HEAD / 无 upstream：跳过自动更新，给出信息级提示，不报错。
- ⚠️ **子目录数据源的自动更新作用于整个仓库工作树**（git 没有「只更新一个子目录」的能力）：本数据源仍只导入 `relativeRoot` 下的变更，但仓库其他目录的文件也会被更新。需在文档/页面提示；若不可接受，用户可改用 `--type directory` 关闭 git 能力。
- fetch/update 失败原因（网络/凭据/分叉/工作区冲突）在页面与 `lastSync` 中给出可执行提示，不伪装成「已是最新」。

**验收**
- 本地仓库远端有新提交 → 自动快进后同步新内容；页面显示「已自动更新到 <commit>」。
- 本地有分叉提交/未提交修改导致无法快进 → 警告 + 继续用本地内容同步，本地工作区零改动。
- 断网/无权限 fetch → 同步仍完成，页面显示「远端更新失败：…（本次同步的是本地内容）」。
- 托管 clone 同步 → `reset --hard` 后同步最新内容。

### R4 页面同步（P0）

**需求**
- 列表行与抽屉头部提供「同步」按钮；`running/queued` 时禁用并显示状态；同步中可看到任务进度。
- 新增 `POST /api/datasource/sync`：
  - body `{ scope, full?: boolean }`
  - scope 鉴权（同 `/api/datasource/prune`）
  - 同 scope 已有 `datasource-sync` 的 queued/running → `409 SYNC_ALREADY_RUNNING`
  - 创建任务台账 `operation='datasource-sync'`、`source='web'`，提交 coordinator（`engine-only`）
  - 返回 `{ ok:true, taskId }`
- 前端点击后轮询列表/详情（现有 15s/3s 轮询可复用），完成后自动刷新候选；失败/部分成功复用现有详情展示。
- 页面触发与 CLI 触发共用同一同步实现与结果快照，不允许两套逻辑。

**验收**
- 点击同步 → 任务中心出现任务 → 列表状态「排队中/同步中」→ 完成后 `lastSync` 更新、待删候选刷新。
- 连续点击/两个标签页同时点 → 只产生一个任务，第二个请求 409 或按钮禁用。
- 无该 scope 权限的 token → 403。

### R5 非 Git 目录的页面同步频率限制（P0）

**需求**
- 仅对 `type=directory` 的页面触发同步生效：同一数据源「上次成功同步」距今 < 30 分钟 → `429 SYNC_RATE_LIMITED`，返回 `nextAvailableAt`。
- 只统计 `state in (ok, partial)` 的成功同步；失败/取消不占冷却，允许立即重试。
- CLI 不受限制（`ki datasource sync --scope <s>` 始终可执行）——这是明确的强制同步出口。
- 页面按钮在冷却期禁用，显示剩余时间与可复制命令；服务端必须强制（不能只靠前端）。
- 30 分钟常量（Q4 已拍板接受；可配置化后置）。

**验收**
- 页面同步成功后立即再点 → 服务端 429，UI 显示「X 分钟后可再次同步；如需立即同步：`ki datasource sync --scope <s>`」。
- CLI 同步成功后再点页面 → 同样受剩余冷却约束（口径是数据源，不是入口）。
- 上一次同步失败 → 页面可立即重试。

### R6 类型与 Git 信息展示（P1）

**需求**
- 列表新增「类型」列或 Scope 旁徽标：`Git` / `目录`（旧记录未知时显示 `目录`）。
- 抽屉「同步参数」增：数据源类型、仓库（`repoRoot`）、分支、最近 commit（短 hash + subject + 提交时间）。
- 「执行结果」增：全量扫描 N / 本次变更 M / 内容未变 K；fetch 警告单独一行。
- `ki datasource list` 人类可读输出增类型与短 commit；`--json` 增字段（向后兼容）。

**验收**
- 截图/走查：两行数据源分别显示 Git 与目录；Git 抽屉能看到 commit 与增量数；旧 daemon 缺字段时页面不崩、显示 `—`。

### R7 页面用 Git URL 登记数据源（P1，建议单独一批）

**需求**
- 页面新增「添加 Git 数据源」入口；表单：scope（已有或新建，见 §8 Q8）、仓库 URL（必填）、分支（可选，默认远端 HEAD）、子目录（可选，默认仓库根）、落点 Group（可选）。
- 后端新增 `POST /api/datasource/add-remote`：
  - 校验 scope 合法/授权；URL 白名单（https/ssh/git/scp-like），**拒绝** `ext::`、`file::`、`user:pass@`、以 `-` 开头的参数
  - clone 到 `~/.ki/datasources/<scope>/repo`（由 scope 派生，防穿越；不得位于 dataDir 内）
  - `GIT_TERMINAL_PROMPT=0`、超时、异步任务 + 进度；失败清理半成品目录，不落登记
  - clone 成功后写 `type=git`、`git.managed=true`、branch/subdir/remoteUrl，并自动触发首次同步
- 托管 clone 的同步：fetch + reset 到远端分支（见 R3），再走 R2 增量。
- 私有仓库：依赖运行进程的 git 凭据（SSH agent / credential helper）；页面不收集凭据；失败给出明确指引。
- `ki datasource remove --purge` 删除托管 clone（两次确认）；页面移除入口本次可不做（§8 Q7）。

**验收**
- 公开仓库 URL → clone 成功 → 登记 → 首次同步完成；列表类型 Git、源目录为托管路径。
- 无凭据的私有仓库 → 明确「认证失败」提示，不产生登记、不留半成品目录。
- `remove --purge` → 登记与 clone 均删除；普通目录数据源的 remove 行为不变。

### R8 文案与文档同步（P0 配套）

**需求**
- 页面 callout/空态从「只能通过命令行登记与同步、本页只读」改为：
  - 「本地目录数据源仍通过 CLI 登记；Git 仓库可在本页添加；同步可在本页触发（普通目录 30 分钟一次，CLI 可强制）」
- `docs/cli.md` 的 datasource 章节、`docs/mcp-http.md` 的接口表同步新增参数/接口/语义。
- 明确「本地目录不能从页面选服务器路径」。

**验收**
- 文档与页面文案一致；不存在「页面只读」与「页面可同步」并存的描述。

### R9 并发安全（P1 配套）

**需求**
- `datasource.json` 的读改写（add / sync 落 lastSync / remove）持 scope 写锁，避免页面同步与 CLI add/remove 并发导致字段丢失。
- 同 scope 的 sync 由 coordinator 串行；add 与 sync 之间的登记状态变更也要互斥（或 add 时检测运行中任务并拒绝）。

**验收**
- 并发测试：一边 sync 写 lastSync、一边 add 改 group，最终记录两份修改都在，无丢失更新。

### R10 同步结果快照扩展（P1，配合 R2/R6）

**需求**
- `DataSourceResultSnapshot.files` 增 `fullScanned` / `changed`（或新增 `git` 块），确保「全量扫描」与「本次处理」可区分。
- `lastSync.git` 记录 commit 与 fetch 结果（成功/失败原因）。
- 任务参数快照增 type / commit / changedCount（`toParamSnapshot` 白名单扩展）。

**验收**
- 任务详情与数据源详情都能回答「这次同步处理了哪些文件、基于哪个 commit」。

---

## 5. 负向需求（只列本需求真实相关）

| ID | 场景 | 期望行为 |
|---|---|---|
| N1 | 目录不是 git 仓库，却被 `--type git` 标记；或曾是仓库后来 `.git` 被删 | `add` 时 fail-loud；同步时给出「不再是 git 仓库，请改用 --type directory 或恢复仓库」；不静默当普通目录继续 |
| N2 | 数据源是仓库子目录（用户现状 `langchain`） | 必须按 `relativeRoot` 过滤；路径前缀错误会导致漏同步或把仓库其他目录导入；用真实子目录做回归 |
| N3 | 上次 commit 不存在（force push / rebase / shallow clone / GC） | `git diff` 失败 → 自动降级为全量同步 + 明确警告，成功后记录新 commit；不得静默跳过或把旧 commit 当最新 |
| N4 | fetch 失败 / 自动更新失败（分叉、工作区冲突）/ 超时 / 无 remote / daemon 无 SSH 凭据 | fetch 或 update 失败都**不中断同步**：记录 warning、继续用本地工作区；页面明确「本次未自动更新到远端」；区分「无 remote」与「有 remote 但失败」 |
| N5 | 工作区有未提交修改、untracked 文件、`.gitignore` 文件 | tracked 工作区变更纳入增量；**untracked 不纳入**（Q2 拍板）→ 必须显示「N 个未跟踪文件不参与增量」并用 `--full` 兜底；`.gitignore` 文件同样不进入 git 增量。实测用户 46/241 篇是 untracked，静默会让约 19% 文档停更 |
| N6 | 同步过程中用户切分支 / 提交 / 修改文件 | 捕获**自动更新完成后、扫描开始前**的 HEAD 作为本次 commit；成功后只推进到它，不推进到结束时的 HEAD；下次 diff 会覆盖期间的新变更 |
| N7 | 部分成功 / 取消 / 失败时推进 commit | **禁止推进**；保留旧 commit，下次重试仍能看到失败文件；只有 ok 才推进 |
| N8 | 本次无变更 | 不要把空数组传给 `onlyRelPaths`（会被当作未指定 → 全量）；数据源编排层早退：算候选、写 lastSync、不导入 |
| N9 | 页面连点 / 多标签页 / CLI 与页面同时同步 | 服务端并发闸门（409），不能只靠前端禁用；频率限制服务端强制 |
| N10 | Git URL 注入（`ext::sh -c ...`、`--upload-pack`、`user:pass@`、以 `-` 开头） | URL 白名单 + `execFile` 参数数组 + `--` 分隔 + 拒绝凭据 URL；不拼 shell 字符串 |
| N11 | clone 超大仓库 / 超时 / 磁盘不足 / 超过导入预算 | 任务级超时与取消；失败清理半成品；clone 后复用导入预算预检（20k 文件/4GiB/300k chunks），超限 fail-loud |
| N12 | 私有仓库凭据缺失 | 明确「认证失败/凭据不可用」，不报「仓库不存在」；CLI 与 daemon 的凭据环境差异要在文档中说明 |
| N13 | 同一目录登记给两个 scope（现状） | 各自维护 commit 与 seenRels；互不干扰；同步会分别导入两份（预期） |
| N14 | 仓库无提交 / 空仓库 / HEAD detached | 按无 `lastCommit` 处理 → 全量同步；不记录不存在的 commit；detached HEAD 记录实际 commit 并在页面提示 |
| N15 | 数据源目录本身被删除或改名 | 沿用现有 `SOURCE_MISSING` 处理；不要因为 git fetch 成功而掩盖工作区缺失 |

---

## 6. 优先级（Kano + 价值×成本）

| 优先级 | 条目 | 来源 | Kano | 价值 | 成本 | 证据 | 建议方向 |
|---|---|---|---|---|---|---|---|
| P0 | R1 类型字段与 Git 识别 | M1 | 必备 | 高 | 中 | `datasource-types.ts:95` | 先落模型与探测，后续能力都依赖它 |
| P0 | R2 Git 增量同步 | M1 | 期望 | 高 | 中高 | `import.ts:273`、`:1171` | 复用 `onlyRelPaths`，但必须处理 prune 停算与空 diff |
| P0 | R3 fetch 前置 + 自动更新 | M1 | 期望 | 中高 | 中高 | git 语义；Q1 已拍板 | 本地 `merge --ff-only`（失败则警告继续）；托管 clone `reset --hard` |
| P0 | R4 页面同步 | M1 | 期望 | 高 | 中 | `mcp-http-api.ts:729` | 新 POST 接口 + 任务台账，复用现有轮询 |
| P0 | R5 非 Git 频率限制 | M1 | 期望 | 中 | 低 | — | 服务端按 lastSync 成功时间强制 |
| P0 | R8 文案/文档反转 | M1 | 必备 | 中 | 低 | `DataSourcePage.tsx:250` | 与 R4/R7 同批，避免自相矛盾 |
| P1 | R6 类型/Git 展示 | M1 | 期望 | 中高 | 低 | `dataSourceDetailModel.ts:263` | 类型列 + 抽屉 commit 段 |
| P1 | R7 页面 Git URL 数据源 | M1 | 兴奋（用户点名） | 高 | **高** | 无现成 clone 能力 | 单独一批，先做公开仓库 + 环境凭据 |
| P1 | R9 并发写锁 | 影响面 | 必备 | 高 | 低 | `writeDataSource` | 页面写入口前必须完成 |
| P1 | R10 快照扩展 | M1 | 期望 | 中 | 低 | `task-snapshot.ts:51` | 与 R2 同批 |
| P2 | 页面移除/`--purge`、同步取消、频率可配置、fetch 超时可配置 | M1 | 期望/兴奋 | 中 | 中 | — | 后续迭代 |
| P2 | `.gitignore` 文件的精确增量、untracked mtime 优化 | 负向 | 无差异 | 低 | 中 | 实测无业务影响（忽略 md 均在 node_modules/.venv） | 先用 `--full` 兜底，不做复杂 mtime 水位 |

**排序理由**：P0 全部是「不做则需求不成立或会引入数据错误」的项——R1 是模型底座；R2/R3 是核心价值；R4/R5 是用户明确要的页面能力；R8 是避免产品自相矛盾。R7 虽然用户点名，但 clone/凭据/安全成本远高于其余项，单独交付风险更低。

---

## 7. 建议的页面形态（预期，非实测）

```
┌ 数据源                                          [+ 添加 Git 数据源] ┐
│ 共 2 个数据源 · 1 个 Git · 1 个目录 · 1 个从未同步                  │
├────────────────────────────────────────────────────────────────────┤
│ Scope      类型     源目录                    上次同步      状态   操作 │
│ langchain  [Git]    /root/learning/langchain  10-21 14:30   成功  [同步] │
│ scope      [目录]   /root/learning/langchain  —             从未  [同步] │
│                    （30 分钟后可同步 / CLI 强制）                       │
└────────────────────────────────────────────────────────────────────┘

抽屉（Git）：
类型      Git · learning@master
最近提交   6e6a8d7  feat(langgraph): 全教程 Python/TS 双语言化
本次增量   变更 3 篇 / 全量 241 篇 / 内容未变 238 篇
远端检查   ⚠ fetch 失败：authentication failed（本次同步基于本地内容）
```

> `🟡` 以上为信息架构建议，未做视觉走查；类型列与「操作」列会增加表格宽度，窄屏需要降级方案（建议类型放 Scope 徽标、操作放抽屉）。

---

## 8. 决策记录

> Q1~Q5 已于 2026-10-21 由用户拍板（见文首「已拍板结论」）；下表保留原始选项供追溯。Q6~Q10 待定，设计阶段按「推荐」默认确认。

| ID | 决策 | 选项 | 结论 | 影响 |
|---|---|---|---|---|
| Q1 | fetch 后是否自动更新工作区 | A 只 fetch + 提示远端领先（不改工作区）；B `merge --ff-only`；C `reset --hard`（仅托管 clone） | **已定：自动更新（本地 B / 托管 C）** | 本地只允许快进，绝不 reset/丢本地提交或未提交修改；无法快进则警告并继续用本地内容 |
| Q2 | 增量集合是否包含 untracked | A 包含；B 不包含 | **已定：不包含**（必须警告 + `--full` 出口） | 实测 46/241 篇是 untracked，变化后不会自动同步 |
| Q3 | 是否支持「数据源 = 仓库子目录」 | A 支持（按 relativeRoot 过滤）；B 只允许仓库根 | **已定：支持** | 用户当前 `langchain` 就是子目录 |
| Q4 | 30 分钟频率限制的口径 | A 按 `lastSync` 成功时间、所有入口共享；B 只限制页面入口；C 可配置 | **已定：接受 A（30 分钟、成功时间、CLI 不受限）** | 频率限制是数据源口径，不是入口口径 |
| Q5 | 页面是否也允许输入本地目录路径 | A 否，本地目录仍走 CLI；B 是，输入服务器路径 | **已定：不允许（A）** | 本地目录登记仍走 CLI |
| Q6 | 无变更时是否推进 commit | A 推进到当前 HEAD（即使无文件变化）；B 保持旧 commit | **A** | 影响空提交/仅改无关目录时的重复 diff；A 更自然 |
| Q7 | 托管 clone 的移除 | A `remove --purge` 删除 clone；B 只删登记保留 clone | **A（带二次确认）** | 磁盘清理与误删风险 |
| Q8 | 页面添加是否允许新建 scope | A 允许（表单校验）；B 只选已存在 scope | **A（2026-10-22 用户修正；原首版 B）** | 用户要求页面直接新建 scope 并支持搜索；复用 `ScopePathSelect`（已有/新建双模式），名称校验与 CLI 一致；新建 scope 由登记流程初始化 |
| Q9 | 私有仓库凭据 | A 仅依赖进程环境（SSH agent/credential helper）；B 页面输入 token 并存储 | **A** | B 会引入密钥存储与泄漏面；A 需要在错误文案中给出指引 |
| Q10 | 页面同步是否需要取消按钮 | A P0；B P1/P2 | **B** | 长同步体验；首版可先有进度、无取消 |

---

## 9. 关键假设

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| A1 | ~~用户会自行 pull；工具只 fetch~~ → **已拍板：工具自动更新**（本地 `merge --ff-only`、托管 clone `reset --hard`） | 若后续希望本地也 reset/强制更新，需要显式新增危险模式 | 用真实分叉仓库验证「无法快进时不丢本地内容」 |
| A2 | 数据源目录可能位于仓库子目录 | 若不支持，用户现有 `langchain` 数据源不可用 | `rev-parse` 实测已证明 |
| A3 | ~~untracked 属于数据源内容~~ → **已拍板：不参与增量**；首次同步/`--full` 仍会导入它们 | 若用户之后把文档转为 tracked，需在 `--full` 或重新 add 后才进入增量 | 页面显示未跟踪数量；用 `--full` 验证 |
| A4 | 页面只支持 Git URL 登记，本地目录仍走 CLI | 若用户要页面选本地目录，需新增服务器路径输入与权限模型 | Q5 |
| A5 | 私有仓库的凭据由运行进程环境提供 | 若 daemon 无 SSH agent，私有仓库功能不可用 | 用当前 `git@github.com` remote 实测 fetch |
| A6 | 「一次同步」的 commit 以**自动更新完成后、扫描开始前**的 HEAD 为准 | 若用结束时 HEAD，期间提交会被跳过 | 设计评审 + 并发提交测试 |
| A7 | Git 增量不改变「永不自动删除」语义 | 若把 git 删除直接执行删除，会破坏既有安全模型 | 保持 R2 的删除只进候选 |

---

## 10. 建议下一步

1. ~~先拍板 Q1~Q5~~ → **已完成**（见文首「已拍板结论」）。Q6~Q10 在设计阶段按推荐默认确认。
2. 进入 `design-craft`：产出
   - `DataSourceRecord` v2 模型与迁移（type/git/lastCommit）
   - 同步状态机（fetch → diff → import → 候选 → commit 推进）
   - `POST /api/datasource/sync` / `add-remote` 契约与错误码
   - 页面交互（`interaction-design`：列表操作列、添加表单、频率限制态）
3. 实施建议拆两批：
   - **批次 A（R1~R6、R8~R10）**：本地 Git 增量 + 页面同步 + 类型展示 + 频率限制（用户当前 `langchain` 场景即可验证）。
   - **批次 B（R7）**：页面 Git URL 数据源（clone/凭据/安全/清理）。
4. 验证锚点：用 `/root/learning` 真实仓库做子目录增量回归——改 1 篇 tracked、删 1 篇、新增 untracked（验证不入增量且出现警告）、`--full` 纳入、无变化、部分失败、远端自动更新成功/无法快进、force push，共九场景；再用公开 GitHub 小仓库验证 clone。

---

## 11. 与既有需求的关系

- **依赖**：`REQ-20261020-001`（数据源登记与同步）——本需求在其 `datasource.json` / `syncDataSource` / 页面详情之上扩展。
- **反转**：`REQ-20261020-001` 的 Q13「页面不触发同步」与「页面只读」被本需求的 R4/R7 反转；需在该需求文档或本需求 §3 中明确记录，避免后续维护者按旧决策回退。
- **不重叠**：`REQ-20261019-003`（本地文档自动同步源）已作废，本需求**不引入定时/后台自动同步**；所有同步仍由用户显式触发（页面或 CLI）。

---

## 12. 变更记录

- **v2（2026-10-21）**：用户拍板 Q1~Q5 —— 自动更新（本地 `merge --ff-only` / 托管 clone `reset --hard`）、增量不含 untracked（新增未跟踪文件警告与 `--full` 出口）、支持子目录数据源、接受 30 分钟频率限制、页面不提供本地目录输入。据此修订 R2/R3/R5、负向场景 N4~N6、关键假设 A1/A3/A6。
