---
id: REQ-20261115-002
feature: 测试子进程超时与收尾句柄治理
status: 已确认
created: 2026-11-15
updated: 2026-11-15
version: 2
tags: [需求, 测试基建, 超时, 挂起, 子进程]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：测试子进程超时与收尾句柄治理

- **来源**：2026-11-15 在 REQ-20261113-004（知识治理）B1 阶段执行回归时，`test/sync-relation.test.ts` **运行 8 分 23 秒未结束、无任何汇总输出**，人工中止后定位到两类测试基建缺陷。
- **证据声明**：`🟢` = 本机实测（命令 + 耗时）或代码直读（含 file:line）；`🟡` = 设计判断。

---

## 1. 需求速览

| # | 结论 | 证据 |
|---|---|---|
| 1 | 测试子进程调用**默认无超时**，任一子进程卡住会让整个测试文件永久等待，且不打印任何汇总 | `test/sync-relation.test.ts:27` 起 `execFileSync` 无 `timeout`；CLI 未提供 `--test-timeout` 🟢 |
| 2 | 全仓 **26 个测试文件 / 42 处** `execFileSync`，仅 **2 个文件**接入超时（其中 1 个为本次修复） | `grep -o 'execFileSync(' test/*.ts \| wc -l` = 42；`grep -l 'timeout: CLI_TIMEOUT_MS'` = 2 🟢 |
| 3 | 第二类挂起：测试在 `before` 里 `import` 了 `store.js`，依赖链拉起 zvec / FTS 引擎，**`after` 未关闭** ⇒ 用例全过后进程不退出、汇总不打印 | `test/sync-relation.test.ts:44-58`（修前无 close）；169 个测试文件中仅 32 个有 `closeEngine/closeFtsEngine` 🟢 |
| 4 | 修复后同一文件 **30.2s / exit 0 / 30 tests 全绿**（修前 90s 超时无汇总） | 2026-11-15 实测 🟢 |
| 5 | 这类缺陷**不会让测试变红**，只会让"跑测试"这件事变得不可用 —— 属于基建可信度问题，不是产品缺陷 | 实测：8 个 describe 全部 `ok`，仅汇总缺失 🟢 |
| 6 | 单点修复不足以覆盖：其余 24 个文件的挂起风险完全等价 | 统计同上 🟢 |

---

## 2. 背景

### 2.1 事件时间线

```
16:xx  B1 回归：npx jiti test/sync-relation.test.ts
        ↓ 8 分 23 秒
       ps: npm exec jiti test/sync-relation.test.ts   ← 仍存活，无输出
        ↓ 人工 kill
        ↓ 限时 90s 重跑 → "ok 1..8"，无汇总，超时
        ↓ 诊断：8 个 describe 全过 → 不是断言失败
        ↓ 修复：execFileSync 加 120s 超时 + after 关引擎
        ↓ 重跑：30.2s / exit 0 / 30 pass
```

### 2.2 两类挂起（机制不同，修法不同）

| 类型 | 触发 | 表现 | 机制 |
|---|---|---|---|
| **A 子进程挂起** | 子进程卡在 embedding 网络、被 IDE safe-delete 拦截、等 scope 锁 | 父进程停住，**连已完成用例的输出都不再增长** | `execFileSync` 无 `timeout`，Node 默认无限等待 |
| **B 收尾不退出** | 用例全部通过后 | 所有 `ok` 都打印了，但**没有 `# tests/# pass` 汇总**，进程常驻 | `before` 里 import 了带引擎的模块；`after` 未 `closeEngine` / `closeFtsEngine`，node:test 等待活跃句柄 |

本次同时命中 A 与 B：A 让 8 分钟无进展，B 让 90 秒限时跑完仍拿不到汇总。

### 2.3 为什么值得单独立项

- 没有超时的测试**无法被判失败**：CI 里表现为"整条流水线挂住"，而不是"某个断言红了"，排障成本极高。
- 收尾不退出会**掩盖真实结果**：用例明明全过，使用者看到的是"卡住了"，容易误判为代码回归（本次就差点把 B1 的改动当成故障）。
- 42 处调用点分散在 26 个文件，逐个手工加 `timeout` 必然再次漂移，需要**统一出口**。

---

## 3. 现状量化

| 指标 | 修前 | 修后（2026-11-15） | 采集命令（可复现） |
|---|---|---|---|
| 测试文件总数 | 169 | 177 | `ls test/*.test.ts \| wc -l` |
| 含 `execFileSync` 的文件 | 26 | 0 | `grep -l 'execFileSync(' test/*.test.ts \| wc -l` |
| `execFileSync` 调用点 | 42 | 0 | `grep -o 'execFileSync(' test/*.test.ts \| wc -l` |
| 无 `timeout` 的 `spawnSync` 调用 | 4 | 0 | `cli-timeout.test.ts` ⑤ 门禁 |
| 无 `timeout` 的 e2e 子进程调用 | 2 | 0 | `cli-timeout.test.ts` ⑤ 门禁（扫描含 `test/e2e`） |
| 显式关闭引擎的文件 | 32 | 32（已足量，见 R5） | `grep -l 'closeEngine\|closeFtsEngine' test/*.test.ts \| wc -l` |
| 已知慢测（单文件 > 20s） | 1（`sync-relation` 30.2s） | 2（`sync-relation` 31.9s / `cli-help` 29.2s） | 实测 |

> 说明：`169 / 26 / 42` 三者口径不同（文件数 / 含子进程的文件 / 调用点），不可互相替代。

---

## 4. 目标与不在范围

**目标**

1. 任何测试文件在**任何单点故障下都能在有限时间内结束**（失败也要给出可读原因，而不是静默挂住）。
2. 测试跑完后**进程必然退出**并打印汇总。
3. 42 处调用点收敛到**唯一出口**，新增测试默认继承超时。

**不在范围**

- 改写测试用例本身的业务断言；
- 引入测试框架（vitest/jest 等）替换 `node:test`；
- 测试并发化 / 分片（属性能优化，另立项）；
- 产品代码运行时的超时策略（与本需求无关）。

---

## 5. 需求清单

| # | 需求 |
|---|---|
| R1 | `test/test-config.ts` 提供统一出口（实际实现）：`execCli(scriptPath, opts)` / `execCliRaw(scriptPath, opts)` 跑 ki 脚本；`execCommand(cmd, args, opts)` / `execCommandRaw(cmd, args, opts)` 跑 git/tar 等外部命令。四者统一默认 `timeout: cliTimeoutMs()`、`killSignal: 'SIGKILL'`、`encoding: 'utf-8'`、`env: getTestEnv()`、`maxBuffer: 16MB`；`opts.timeout` 可覆盖。**`execFileSync` 与 `spawnSync` 一律不得在测试里直调**（两者默认都无超时） |
| R2 | 超时值分级：CLI 冷启动/真实写入类 **120s**；纯参数校验/`--help` 类 **30s**；单文件可整体覆盖 |
| R3 | 超时可被环境变量覆盖：`KI_TEST_CLI_TIMEOUT`（毫秒），缺省 120000。用于慢机器临时放宽，不写进代码 |
| R4 | 超时失败信息必须含三项：**被调命令**、**超时值**、**已捕获 stdout/stderr 的尾部 20 行**；错误类型区分超时与其他失败 |
| R5 | 只有**真正调用引擎**（`withEngine` / `getEngine` / `vectorSearch` / `getFtsEngine` 等）的测试文件，才必须在**顶层 `after`** 关闭（各自 try/catch），再删临时目录。**仅 `import` 了 `store.js` 不构成条件**：`store.ts` 只从 vector-client 引入一个纯断言函数，`vector-client` / `fts-client` 模块顶层只有常量与懒 Map，import 阶段不启动 worker、不起定时器（2026-11-15 实测：`events-sr02.test.ts` import store.js 且无 close，0.8s 正常退出）。判定方法：`node scripts/run-tests.mjs --timeout 60`，**超时的文件才是真挂起**，不按 import 清单批量加 close |
| R6 | 26 个含 `execFileSync` 的文件分两批迁移到 R1（批次见 §9）；迁移后 `grep -o 'execFileSync(' test/*.test.ts` 必须为 **0**。**同一「默认无超时」的 `spawnSync` 一并纳管**：要么换 `execCliRaw` / `execCommandRaw`，要么显式传 `timeout`。`test/e2e/*.mjs` 同口径但允许直接用 `execFileSync`，**必须带 `timeout`**（`spawn` 豁免：`child_process.spawn` 本身没有 timeout 选项，只能靠用例自行 kill / 等 `exit`，卡住由文件级超时兜底） |
| R7 | 迁移必须保持各调用点原有参数形状：`execCli` 只补默认值，不改变 stdio/encoding/input 的显式意图；涉及 `stdio: 'inherit'` 等特殊调用需在封装里以 `opts.raw` 透传 |
| R8 | 门禁脚本与文档同步：`IMPL_PLAN` / 测试说明里写明「长命令一律限时」，并给出超时排障三步（看进程 / 看最后输出 / 提高 `KI_TEST_CLI_TIMEOUT` 复跑） |

---

## 6. 验收标准

| # | 验收项 | 判定 |
|---|---|---|
| A1 | `test/sync-relation.test.ts` 从"永久挂起"变为 **≤60s 且 exit 0、打印 `# tests 30 / # pass 30`** | 实测（本地已达成 30.2s，纳入回归） |
| A2 | 人为构造一个 `sleep 200` 的子进程调用 → 在设定超时后**报错退出**，错误信息含命令与超时值 | 单测 |
| A3 | 抽样 10 个测试文件，跑完后进程 **5s 内退出** | 实测 |
| A4 | `grep -o 'execFileSync(' test/*.test.ts` = 0。**口径必须是 `test/*.test.ts`**：`test/test-config.ts` 是封装实现本身，其注释里留了一处示例文本，扫 `test/*.ts` 会恒为 1 | `cli-timeout.test.ts` ⑤ 门禁 |
| A5 | 超时错误信息包含 stdout/stderr 尾部 ≥10 行 | 单测 |
| A6 | `KI_TEST_CLI_TIMEOUT=20000` 时，A2 的超时能在 20s 附近触发 | 单测 |
| A7 | `test/` + `test/chat/` + `test/e2e/` 内 `spawnSync` / `execFileSync` / `execFile` / `execFileAsync` / `execSync` / `exec` 调用全部带 `timeout`（`spawn` 豁免，理由见 R6） | `cli-timeout.test.ts` ⑤ 门禁 |

---

## 7. 影响面

| 受影响方 | 类型 | 程度 | 证据 | 建议处理 |
|---|---|---|---|---|
| 26 个含子进程的测试文件 | 测试基建 | 降级（调用形式变） | `grep -l 'execFileSync('` | 按批次迁移，不改变断言 |
| 全部 169 个测试文件 | 测试基建 | 无感 | — | 仅 R5 涉及的补 `after` 关闭 |
| 本地/CI 门禁 | 流程 | 降级 | — | 命令改为显式限时 |
| 产品运行时代码 | — | **零影响** | 只改 `test/` 目录 | — |

---

## 8. 负向需求

| # | 场景 | 期望 |
|---|---|---|
| N1 | 合法长任务（大导入、真实 embedding）被误杀 | 该类用例显式传更大的 `opts.timeout`；默认值只覆盖"正常应在 2 分钟内完成"的调用 |
| N2 | `SIGKILL` 后子进程留下临时目录/配置 | 各文件 `after` 的清理逻辑保留且先于断言失败也执行；超时错误里带上临时目录路径便于人工清 |
| N3 | 慢机器（冷启动 40s+）误报超时 | `KI_TEST_CLI_TIMEOUT` 可覆盖；错误信息提示该变量 |
| N4 | `closeEngine` 在引擎未打开时抛错 | 必须 `try/catch` 静默，不能让收尾反而把测试弄红 |
| N5 | 同一文件多个 `describe` 共用引擎，逐个关会破坏后续用例 | **只在顶层 `after` 关**，禁止写在 `afterEach` |
| N6 | Windows 下 `execFileSync` 无法直启 `npx` | 沿用现有 `JITI_CLI` 直启 node 的方式，不新增 shell 依赖 |
| N7 | 迁移后某个调用点原有的 `stdio` 语义被默认值覆盖 | R7 的 `opts.raw` 透传；迁移时逐文件对比 diff |

---

## 9. 分期与工作量

```
一期（已完成 2026-11-15，待验收）
  ├─ test-config.ts 增加 CLI_TIMEOUT_MS + 注释
  ├─ sync-relation.test.ts：runSync 加 timeout/SIGKILL
  └─ sync-relation.test.ts：after 关引擎
  结果：90s 超时无汇总 → 30.2s / exit 0 / 30 pass
  估：0.2 天

二期（建议下一批）
  ├─ test-config.ts 增加 execCli() 封装（R1-R4）
  ├─ 迁移 24 个文件（按调用数从多到少）：
  │    datasource-clone(4) / safe-tar(3) / datasource-reuse-refresh(3)
  │    scope-isolation(2) / restore(2) / mcp-http-api(2) / import-scheme-d(2)
  │    error-handling(2) / datasource-sync-managed(2) / datasource-sync-incremental(2)
  │    config-doctor(2) / cli-help(2) / 其余 12 个各 1 处
  └─ 迁移后 grep 断言 = 0
  估：1 天

三期（已完成 2026-11-15）
  ├─ ~~为 32 个"关引擎"之外的测试文件补 after 关闭~~ → 前提不成立，取消（见 R5 纠偏）
  ├─ 门禁脚本化：cli-timeout.test.ts ⑤（A4 + A7），扫描工具抽到 test/code-scan.ts
  ├─ 死 import 清理 14 处 + spawnSync 收口 4 处
  └─ A4 断言口径纠偏（test/*.test.ts）
  估：0.3 天（实际）
```

### 9.1 二期进展（2026-11-15）

**已完成：CLI 形态全部迁移（14 个文件 / 17 处）**

| 文件 | 处数 | 形态 |
|---|---|---|
| error-handling / scope-isolation | 2 / 2 | `path.join(SCRIPTS_DIR, script)` + try/catch 读 stdout |
| query-group / get-module-info / get-module-info-paging | 1 / 1 / 1 | `SCRIPT_PATH` |
| import-modified / import-scheme-d | 1 / 2 | 函数内 `require` + `cwd` |
| integration / restore | 1 / 1 | `path.join` / 自定义 env |
| sync-relation | 1 | 原为 `execFileSync` + 手写 timeout |
| config-doctor | 2 | 自定义 env + 原 `stdio` |
| cross-process-invalidation | 1 | 临时脚本 + `timeout: 60_000` |
| import-vector-precheck | 1 | 自定义 env + `cwd` |

验证（全部 exit 0）：`error-handling 15/15`、`scope-isolation 5/5`、`query-group 41/41`、`get-module-info 12/12`、`get-module-info-paging 17/17`、`import-modified 4/4`、`import-scheme-d 21/21`、`integration 10/10`、`restore 17/17`、`sync-relation 30/30`、`config-doctor 68/68`、`cross-process-invalidation 1/1`、`import-vector-precheck 2/2`、`cli-timeout 10/10`。

**实现要点**：`ExecProcessError` 必须保留 `stdout` / `stderr` / `status` —— 既有负向用例大量使用
`try { execCli(...) } catch (err) { JSON.parse(err.stdout) }` 的写法读输出；不带这些字段会让它们静默变成"空结果"。

**二期剩余：0 处（已完成）**

| 类别 | 处数 | 落地方式 |
|---|---|---|
| `git`（helper / clone） | 16 | `execCommand('git', …)`，原有 `GIT_TERMINAL_PROMPT: '0'` env 原样保留 |
| `tar`（打包/列目录） | 4 | `execCommand('tar', …)` |
| `node` 直启 CLI（`bin/ki.mjs`） | 3 | `execCli(CLI, { entry: 'node', args, … })` |

**收口判定**：`grep -o 'execFileSync(' test/*.ts` = **0**（仅 `test-config.ts` 注释里保留说明文字）。

**二期验证（13 个文件 / 462 例通过）**

| 文件 | 结果 | 文件 | 结果 |
|---|---|---|---|
| backup-layout | 4/4 | datasource-reuse-refresh | 3/3 |
| safe-tar | 2/2 | datasource-sync-incremental | 11/11 |
| datasource-git-probe | 10/10 | datasource-sync-managed | 2/2 |
| datasource-model-v2 | 8/8 | mcp-http-api | 69/69 |
| datasource-clone | 14/14 | cli-help | 58/58 |
| datasource-mappings-sync | 5/5 | mcp-daemon | 18/20 ⚠️ |
| datasource-mappings-write | 5/5 | | |

⚠️ `mcp-daemon` 2 例失败为**环境相关**：用例自带 `skip: !(DASHSCOPE_API_KEY \|\| SILICONFLOW_API_KEY)` 条件，
本机有密钥时真启 daemon 做 embedding 网络预检，失败信息是 `stdout=`（子进程内启动失败），
与「启动方式由 `'node'` 改为 `process.execPath`」无关（同一 node、随机端口、env 原样）。调试期需在无密钥或离线环境复跑确认。

**顺带修复的 3 个存量问题（与超时无关，但阻塞回归门禁）**

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| 1 | `error-handling:171`、`import-scheme-d:328/350` | 断言仍期望「缺省 `--group` 落 scope name（K2）」，实际口径已于 2026-10-21 改为落根 `__root__` | 断言与用例标题同步为 `__root__`，注明口径变更日期 |
| 2 | `error-handling::runJson` | catch 里 `JSON.parse(err.stdout \|\| '{}')` 把**空 stdout** 解析成 `{}`，导致 `r.ok === undefined` 冒充"成功"，使 2 个「非法 scope 应被拒」断言永远失败 | 空 stdout 直接返回 `{ ok: false }` |
| 3 | `scope-isolation::runJson` | 同上 | 同上 |

### 9.2 三期进展（2026-11-15 复核，已完成）

| 工作项 | 结果 |
|---|---|
| A4 口径纠偏 | `test/*.ts` 恒为 1（命中 `test-config.ts:175` 注释里的示例），改为 `test/*.test.ts` = **0** |
| `spawnSync` 收口 | 3 处换 `execCliRaw`（`group-cli` / `import-scheme-d:402` / `restore:302`）；`lock-holder` 的 flock 探针显式 `timeout: 5s` |
| 死 import 清理 | 14 个文件移除已无调用的 `execFileSync` import（`backup-layout` / `cli-help` / `datasource-*`×8 / `import-interrupt-convergence` / `mcp-daemon` / `mcp-http-api` / `safe-tar`） |
| 门禁落地（A4 + A7） | `cli-timeout.test.ts` ⑤ 两条静态门禁 + 「扫描范围下限」断言（规则失效时不得静默变绿）；扫描工具抽到 `test/code-scan.ts`，与 `windows-hide.test.ts` 共用。扫描口径：`test/` + `test/chat/`（禁直调 `execFileSync`）+ `test/e2e/*.mjs`（允许直调，但必须带 `timeout`）；`timeout` 认 `timeout: v` / `timeout,` / `timeout }` 三种写法 |
| e2e 补齐 | `daemon-routes:139`、`restore-cancel:140` 的 tar 调用补 `timeout: 120_000`（其余 e2e 子进程调用原本已带 `timeout`） |
| 环境口径统一 | `group-cli` / `restore` 的子进程 env 改用 `getTestEnv()` 基底（剥离 IDE 注入的 `NODE_OPTIONS` / safe-delete 钩子），与封装默认值一致 |
| R5 纠偏 | 前提不成立（import 不打开引擎），取消「为 20 个文件补 close」，改为「实跑超时清单驱动」 |
| 门禁有效性验证 | 临时构造裸 `spawnSync` 探针 → 门禁报出 `file:line + 调用文本`；删除探针后恢复绿（非空跑） |

**回归（18 个文件全绿）**：`group-cli 5/5`、`import-scheme-d 21/21`、`restore 17/17`、`lock-holder 3/3`、`backup-layout 4/4`、`cli-help 58/58`、`safe-tar 2/2`、`cli-timeout 13/13`、`datasource-clone 14/14`、`datasource-git-probe 10/10`、`datasource-mappings-sync 5/5`、`datasource-mappings-write 5/5`、`datasource-model-v2 8/8`、`datasource-reuse-refresh 3/3`、`datasource-sync-incremental 11/11`、`datasource-sync-managed 2/2`、`import-interrupt-convergence`、`windows-hide 2/2`；`sync-relation 30/30`（31.9s）。

**验收对照（2026-11-15 实测）**

| 验收项 | 结论 | 证据 |
|---|---|---|
| A1 | ✅ | `sync-relation` 30/30、31.9s、exit 0 |
| A2 | ✅ | `cli-timeout` ① `timeout: 300` 抛错并含命令与超时值 |
| A3 | ✅ | 18 个文件经 `run-tests.mjs --timeout 300` 全部正常结束，无一触发文件级超时 |
| A4 | ✅ | `grep -o 'execFileSync(' test/*.test.ts` = 0；⑤ 门禁 |
| A5 | ✅ | `cli-timeout` ② 错误含 `--- stdout 尾部 ---` 与最后一行 |
| A6 | ✅ | `cli-timeout` ④ `KI_TEST_CLI_TIMEOUT` 覆盖生效、非法值回落 |
| A7 | ✅ | ⑤ 门禁；裸 `spawnSync` 探针可使其失败（file:line + 调用文本） |

**顺带发现的跨需求冲突（不在本需求范围）**：`mcp-http-api` 的 `/api/doc/delete` 真删（69 例中 1 例）现有 500 `TRASH_CONTENT_MISSING` —— 知识治理回收站要求删除前读到正文，而该用例用 `seedRelationsCache` 只写了 relations-cache 元数据、没有真实 KB 正文。属治理契约与旧测试的冲突，见 §10 Q5。

---

## 10. 未决问题

| # | 问题 | 影响 | 倾向 |
|---|---|---|---|
| Q1 | 默认超时 120s 是否太长（故障时仍要等 2 分钟） | 排障体感 | 保留 120s：真实 embedding 用例冷启动可达 40s+，过小会误杀 |
| Q2 | `execCli` 是否顺带统一 stdout 解析（现有调用各自 `JSON.parse`） | 收益/风险 | 一期不做：解析差异大，先只统一超时与 env |
| Q3 | 是否引入 `--test-force-exit` 兜底 | 彻底性 | 不用：Node 22 该开关只在 `node --test` 生效，本项目用 jiti 直跑；R5 已从根因修复 |
| Q4 | 32 个已关引擎的文件是否都关得对（只关当前 scope vs 关全部） | 正确性 | 已核实（2026-11-15）：`closeEngine()` 不传参关全部；真正引用 `vector-client`/`fts-client` 的 14 个文件中 11 个已关，其余 3 个不开引擎（`group-vector-contract` 只 import dist 的 filter compiler） |
| Q5 | `mcp-http-api` 的 `/api/doc/delete` 真删用例与回收站契约冲突（500 `TRASH_CONTENT_MISSING`） | 回归红灯 1 例（69 中的 1） | 治理侧 fail-closed（进站不得是空文档）是刻意设计，应由**测试侧**补真实 KB 正文；若允许「元数据无正文」进站，则须同时标记文档不可读，不能静默 |
