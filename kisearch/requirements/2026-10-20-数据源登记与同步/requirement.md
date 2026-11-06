---
id: REQ-20261020-001
feature: 数据源登记与同步（CLI 为主 + 页面只读）
status: 已确认
created: 2026-10-20
updated: 2026-10-21
version: 7
tags: [feat, sync, cli]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：数据源登记与同步（CLI 为主 + 页面只读）

- **来源**：用户 2026-10-20 原话「当前项目没有数据源的配置。导致每次都要手动同步很麻烦。打算给 cli 增加一个添加数据源命令。必须要指定 scope，--group 可选。然后就是可以选择同名文档策略，以及是否同步删除文档这些参数。添加数据源只能由 cli 增加。然后再增加一个同步数据源的命令，可以同步指定数据源，或者所有的数据源。同时页面有展示数据源的页面……总览那里打算把总览改为所有数据源的数量。然后又单独的页面展示数据源的详情信息，包括上一次同步的时间，以及同步详情。但是注意页面不能执行同步数据源的操作。」（附总览「注册 4」截图）
- **分析口径**：product-manager（M1 需求定义 · 一次成型档），1 个确认点 + 1 轮 9 问修订
- **证据声明**：`🟢` 最高等级 = **代码直读**（未运行实测）；界面为描述生成的 ASCII 草图，非实测画面
- **已拍板结论**（用户 2026-10-20 第二轮）：
  - Q1 **一个 scope 只能有一个数据源**（数据源唯一键 = scope）
  - Q2 多源下的 primary 语义 → **不存在该问题**
  - Q3 CLI 标识 → **`datasource`**（用 `--scope` 定位，不再引入 name）
  - Q4 总览「注册」卡 → **替换**为数据源数
  - Q5 ~~数据源默认执行同步删除~~ → **2026-10-21 反转（见 Q12）**：同步**永不删除**，只计算并记录待删候选
  - Q6 页面可**复制**同步命令
  - Q7 清单落 `<kbDir>` 下的 JSON → **可以**
  - Q8 `ki datasource remove` → **纳入**
  - Q9 `add` 时**强制校验**目录
  - Q10（2026-10-20 追加）**同步不支持 `--all`**：一次只能同步一个数据源，必须显式 `--scope`（为安全收紧，不做批量）
  - Q12（2026-10-21 追加）**同步与删除解耦**：`sync` 只导入 + 计算待删候选（存 `lastSync.pendingDelete` + token），**不删除**；删除是页面详情里的一次显式动作（勾选 → 就地确认 → `POST /api/datasource/prune`），CLI 保留 `ki datasource prune` 作为无页面环境的兜底
  - Q13（2026-10-21）**页面能力边界**：仍不能触发同步；`add` 的 `--sync-delete` 移除（语义消失）；页面不提供任何命令复制（R9 作废）
  - Q11（2026-10-20 推演后追加）**按推演阻断项修订**：① ~~remove 同时清空 `group-index.json.source`（R10）~~ → **2026-10-21 被 Q-C 反转**；② `--yes` 仅同一次调用内有效、不保留跨调用删除授权（R4/§5/§8）；③ 删除候选必须基于全量扫描 `rel` 集合（R4）；④ R15 迁移由"自动登记"降级为"提示 + 可复制命令"（不自动写入）
  - **Q-C 关闭（2026-10-21，设计评审后用户拍板）**：**数据源同步不写 `group-index.json.source`**——数据源与「一次性导入源」在存储上隔离，wiki 写回不再指向用户源目录。**代价**：`rebuild-vector` / `fts-rebuild` 拿不到数据源的切分参数（回退 1000/150），`wiki-sync` / `group-delete` / `delete-relation` / `document-editor` / `relation-edit-publish` 拿不到源目录。`remove` 也不再清空 `source` 块（数据源从未拥有它）
  - Q14（2026-10-21，设计评审后追加）**候选所有权**：候选只在「上一次成功同步见过的 rel 集合」（`lastSync.seenRels`）里找，**不再是全 scope 差集**。否则 `--group` 留空时，其他通道（Web 上传 / 一次性 `ki import`）导入的文档会被列为待删，且双闸门拦不住（实测反例：数据源 100 篇 + 其他通道 100 篇 ⇒ 重合率 1.0、删除占比 0.5，双双过闸门）
  - Q15（2026-10-21，设计评审后追加）**超限 = 分批删除**：候选 >500 时不再"不可删"（现状后端既不生成 token 又直接 400，CLI/页面/按组三条路全不通），改为页面/CLI 每次删 ≤500、删完刷新继续；R17 原「按 Group 分别删除」作废

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | **`REQ-20261019-003`（本地文档自动同步源）已于 2026-10-20 由用户决定放弃并删除**（原方案：后台全自动 + 定时 30min + 网页登记 + 网页立即同步）。本需求独立成立：只做「CLI 登记 + CLI 手动同步 + 页面只读」，**不规划定时/自动同步**，schema 不预留 `schedule`/`watermark`；原需求的界面主张（导入页内「同步源」区块）一并作废 | 用户 2026-10-20 决定；原需求目录与 `meta.json` 条目已删除 |
| 2 | **底层能力已有 ~80%**：导入管线（`handleDirectImport`）、同名策略 4 值、同步删除（双闸门 + token + 500 上限）、跨进程写锁、任务台账全部现成 | `src/lib/import.ts`、`import-conflict.ts:21-30`、`import-prune.ts:22-28`、`scope-write-lock.ts:13-22`、`task-registry.ts` |
| 3 | **唯一真实能力缺口：同步删除没有 CLI 入口**。能力完整但应用端只有 `POST /api/import/prune`；`ki import` 无任何相关参数，且 `lib/import.ts:282-291` 注释明确「CLI 与 daemon RPC 都不传 `pickMode`/`pruneStale`，因而恒不产候选」 | `src/lib/mcp-http-api.ts:1752`、`src/lib/import.ts:282-291` |
| 4 | **单源决议大幅简化**：`primary` 语义取消；7 处按 scope 取源目录的消费方（wiki-sync / group-delete / delete-relation / document-editor / fts-rebuild / rebuild-vector / relation-edit-publish）**代码零改动**——代价是 Q-C 后它们看不到数据源（见第 7 行） | `src/lib/scope.ts:135-155` + 各文件 `getSource()` 调用 |
| 5 | **「上一次同步时间」不能只靠任务台账**：任务记录 TTL = 1 小时，过期即读不到；必须写入数据源自身的 `lastSync` 快照 | `src/lib/task-registry.ts:160` |
| 6 | **同步与删除解耦后，破坏性动作不再有任何默认路径**：`sync` 只算候选；删除必须用户在页面勾选后显式发起（§8） | 用户 2026-10-21 决策（Q12） |
| 7 | **数据源同步不写 `group-index.json.source`**（2026-10-21 Q-C 裁决）：数据源与「一次性导入源」存储隔离 ⇒ `sync_relation` 的 wiki 写回不再指向用户源目录。代价是 7 处 `getSource()` 消费方看不到数据源（重建类回退默认切分参数）；`remove` 也不清空历史 source 块 | `src/lib/wiki-sync.ts:45-59`、`src/lib/scope.ts:135-155`；设计 `DESIGN.md` §4 |
| 8 | **候选必须限定"本数据源拥有的文档"**：`eligibleRels = 上一版 lastSync.seenRels`。全 scope 差集会在 `--group` 留空时把其他通道导入的文档列为待删，双闸门拦不住（演算见设计 S-02 D6） | 设计 `S02_同步与候选_DESIGN.md` §3.3/D6 |
| 9 | **超限（>500）可删**（分批）：现状代码在 `overLimit` 时既不生成 token 又直接 400，CLI/页面/按组三条路径全不通 | `src/lib/import-prune.ts:274-276`、`src/lib/mcp-http-api.ts:1881-1888` |

---

## 2. 现状与能力盘点

| 事项 | 现状 | 证据 |
|---|---|---|
| CLI 注册 | 扁平映射 `COMMANDS`，新增命令 = 表加一行 + 新建 `src/xxx.ts` + 手写帮助文本加一行 | `bin/ki.mjs:30-51`、`:77-136` |
| `ki import` 参数 | `-s/--scope`、`--source`、`--group`(可选)、`--conflict-mode`(4 值)、`--no-vector`、切分/预算等 | `src/import.ts:45-67` |
| 同名策略 | `incremental`(默认) / `overwrite` / `skip` / `suffix`(`_{n}`) | `src/lib/import-conflict.ts:21-30` |
| 同步删除 | 纯计算 + token + 双闸门(路径重合 ≥0.8、删除占比 ≤0.8) + 单次 500 上限；`>0.2` 为警示阈值 | `src/lib/import-prune.ts:22-28, 161-180, 222-361` |
| 底层删除原语 | `executeBatchDelete`，已有 daemon handler `batch-delete` | `src/delete-relation.ts:481-484`、`daemon-dispatch.ts:51` |
| 源目录记忆 | `group-index.json.source = { dir, chunkSize, chunkOverlap }`，**只由一次性 `ki import` 写入**；数据源不写它（Q-C） | `src/lib/scope.ts:135-155, 266-297` |
| 写互斥 | 跨进程 scope 写锁，冲突 `SCOPE_OPERATION_BUSY` | `src/lib/scope-write-lock.ts:13-22` |
| 任务台账 | `<dataDir>/.ki-tasks/<id>.json`，7 态，TTL 1h | `src/lib/task-registry.ts:7,110-179,160` |
| 总览「注册」卡 | `list.filter(x => x.registered).length`；`registered` = 「scope 在 config.scopes 有显式条目」 | `web/src/pages/DashboardPage.tsx:328-331`、`src/scope.ts:69,215` |
| 前端路由/导航 | `routes.tsx` 7 路由；`NAV_MAIN` 5 项；图标表无 database 类图标 | `web/src/router/routes.tsx:12-23`、`AppShell.tsx:61-70`、`components/icons.tsx:9-84` |
| HTTP 路由 | 顺序 `if` 链；带 scope 的 GET 必须登记只读白名单，否则远程 token 越权 | `src/lib/mcp-http-api.ts:700-731`、`:501-503` |

---

## 3. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| `group-index.json.source` 的 7 处消费方 | 数据/流程 | **看不到数据源**（Q-C 的直接代价） | `scope.ts:135-155` + 各 `getSource()` | 数据源**不写** `source` 块；`rebuild-vector`/`fts-rebuild` 回退默认切分参数 1000/150（若数据源配了自定义参数会与导入不一致，需在 `add` 帮助与页面明示） | ✅ Q-C（已定） |
| **Wiki 写回**（`sync_relation` / `wiki-backfill`） | 数据 | **改善（但仍受既有配置影响）** | `wiki-sync.ts:45-59`：优先级 1 = `source.dir`，优先级 2 = `wikiSync.sourceDir` | 数据源不再把目录塞进 `source.dir` ⇒ 常规路径不会写进用户源目录；若 scope 配了 `wikiSync.sourceDir` 或残留历史 `source` 块，仍会按既有优先级写回（属用户既有配置，本需求不改） | ✅ Q-C（已定） |
| **删除时的源文件硬删** | 数据 | **潜在 P0** | `delete-relation.ts:183-229`（`sourcePath` 优先 + `wikiSync.sourceDir` 兜底） | 数据源 prune 强制 `wikiDelete:false`（设计 S-03 D6）；注意设计初稿"候选必走 `findWikiFile` 回退"的论证**已被代码核对推翻**（候选必有 `sourcePath`；`source-mismatch` 分支明确拒绝删除），真实残余风险是 `<dir>/<sourcePath>` 确实存在时被硬删 | — |
| 总览「注册」卡 | 展示 | 无感（信息替换） | `DashboardPage.tsx:328-331` | 换成「数据源」；`registered` 不再有页面呈现处（`ScopeSelect.tsx:18` 仅作默认值兜底） | — |
| Web 导入页「目录同步清理」 | 流程 | 无感（同源同模式） | 两处均走 `planImportPrune` + token + `executeBatchDelete` | 数据源 prune 与导入页 prune 共用同一套安全规则；同一目录不建议两处混用 | — |
| 备份/导出/恢复 | 数据 | 无感 | 清单落 `<kbDir>` 随子树走 | 跨机恢复后路径失效 → 全量标 `missing` 汇总提示 | — |
| `/api/*` 鉴权白名单 | 权限 | 无感 | `mcp-http-api.ts:501-503` | 新 GET 登记白名单 | — |
| 任务台账 | 数据 | 无感 | TTL 1h | 只用于同步进行中的实时进度；`lastSync` 落数据源 | — |
| 外部脚本/CI 调 `ki import` | 外部契约 | 无感 | — | 命令不删不改 | ⚪ 未发现（需确认） |
| 前端导航与页面 | 展示 | 新增 | `routes.tsx` / `NAV_MAIN` / 图标表 | 加「数据源」页 + 详情；需新增 database 图标 | — |
| ~~`REQ-20261019-003`~~ | — | **已作废** | 用户 2026-10-20 决定放弃并删除 | 无影响；原「导入页同步源区块」界面主张不再实施 | — |

---

## 4. 需求清单

| ID | 需求 | 优先级 | Kano | 价值 | 成本 | 验收标准 |
|---|---|---|---|---|---|---|
| R1 | `ki datasource add --scope <s> --source <dir> [--group <g>] [--conflict-mode <m>] [--chunk-size N] [--chunk-overlap N] [--force]`：登记/更新该 scope 的唯一数据源（**不写** `group-index.json.source`） | P0 | 必备 | 高 | 中 | 目录不存在/不可读/无 1 个可导入文件 → 非 0 退出、零写入、给出原因；同 scope 重复登记见 R12 |
| R2 | `ki datasource sync --scope <s> [--dry-run]`：**必须显式指定**，一次只同步一个数据源（**不支持 `--all`**） | P0 | 必备 | 高 | 中 | 漏写 `--scope` → 非 0 退出并列出可选 scope（标明各自上次同步时间）；**退出码：成功 0 / 失败 1**（同步永不删除，不存在"护栏降级未删"的 2） |
| R3 | `ki datasource sync --dry-run`：只算不写（含待删候选摘要） | P0 | 期望 | 中 | 低 | 零写入，输出与真实执行同结构 |
| R4 | `sync` **只导入 + 计算待删候选，永不删除**；候选连同指纹（token）写入 `lastSync.pendingDelete`；成功同步后把本次**全量扫描**的 rel 写入 `lastSync.seenRels` | P0 | 必备 | 高 | 中 | ① 候选必须基于本次**全量扫描**的可导入文件 `rel` 集合（`collectMarkdownFiles` 结果），**禁止**用成功导入清单 / 预算剔除 / 去重剔除后清单（`import.ts:765-771` 已记录该坑）；② **候选只在上一版 `seenRels` 内查找**（Q14），首次同步零候选；③ 同步后库内文档数**只增不减**（可用测试断言）；④ 命中硬闸门时不产候选并记录 `blocked` 原因；⑤ 只在 `state ∈ {ok, partial}` 时更新 `seenRels`，失败/取消保留上一版并标 `stale` |
| R5 | 数据源持久化 `<kbDir>/datasource.json`（单对象），含配置 + `lastSync` 快照 | P0 | 必备 | 高 | 中 | 原子写；`ki scope delete` 级联；`lastSync` 1h 后仍可读 |
| R6 | 只读接口 `GET /api/datasource/list`（可选 `?scope=`）+ `GET /api/datasource/detail?scope=` + **唯一写接口** `POST /api/datasource/prune` | P0 | 必备 | 高 | 中 | ① list 无副作用；② prune 必须带 `token` 且 `selected ≤ 500`，服务端**重算**候选，失配 409 `PRUNE_TOKEN_STALE`；③ 带 scope 的请求走 `scopeAllowed` + 只读白名单；④ **无 scope 的 list 必须在 handler 内按 `authScopes` 过滤** `sources/missing/migrationHints`（白名单无 scope 时回落 `'default'`，不限制返回范围） |
| R7 | 前端：侧边栏「数据源」+ 列表页 + 详情页（与任务详情同构，复用 `ki-task-detail__*`）；详情页唯一动作是「删除所选」 | P0 | 期望 | 高 | 中 | 列表无任何动作列；空态只说明「只能通过命令行登记」，不给可复制命令 |
| R8 | 总览「注册」卡 → 「数据源」数（= 有数据源的 scope 数） | P0 | 期望 | 中 | 低 | 加载态不显示假 0；`useScopeList` 仍保留（HealthList 消费 `ftsDocCount`） |
| ~~R9~~ | ~~页面「复制同步命令」~~ | — | — | — | — | **已作废（2026-10-21）**：页面不提供任何命令复制（列表行也不保留） |
| R10 | `ki datasource remove --scope <s> [--yes]`：默认预览；只取消登记，**不删库内文档**；**不触碰** `group-index.json.source` | P1 | 必备 | 中 | 低 | ① 文案明确「库内 N 篇文档保留」；② remove 后 R15 迁移提示可能重新出现——属预期（历史一次性导入目录仍在），不是"删了又活"；③ 若该 scope 配了 `wikiSync.sourceDir`，wiki 写回仍按既有优先级指向它（数据源不改变该行为） |
| R11 | `ki datasource list`（人类可读 + JSON 双档） | P1 | 期望 | 低 | 低 | 输出与页面数据同源 |
| R12 | 同 scope 重复 `add`：参数等价时幂等更新；**改 `--source` 或 `--group` 需 `--force`** | P1 | 必备 | 高 | 低 | 无 `--force` → 拒绝并说明后果：改 `--source` 时旧路径文档会全部进入待删候选（本次不会自动删）；改 `--group` 时旧 group 文档会**保留并重复**（`sourcePath` 相同、prune 不覆盖），须手动清理 |
| R13 | 状态标记 `never / ok / partial / failed / missing`；另由 `lastSync.pendingDelete.stale` 表达"候选来自上次同步" | P1 | 期望 | 中 | 低 | `missing`（路径不可读）与 `failed` 分开展示；`stale` 与 `blocked` 不可混为一谈 |
| R14 | 同源并发同步互斥（复用 scope 写锁） | P1 | 必备 | 中 | 低 | 第二次触发返回明确 busy 文案 |
| R15 | **提示式迁移（不自动登记）**：检测到 `group-index.json.source.dir` 且该 scope 无数据源时，`ki datasource list` 与数据源页给出「检测到历史导入目录」提示 + 已预填 `--source` 的可复制 `add` 命令 | P1 | 兴奋 | 中 | 低 | ① **不自动写入** `datasource.json` —— `source` 块只有 `dir/chunkSize/chunkOverlap`，**无法还原 `--group`**（`scope.ts:135-141`），自动登记会让页面显示"落点=自动"而文档实际在别的 group；② `--group` 留空由用户填写；③ `remove` 后该提示**可能重新出现**（Q-C 后 `remove` 不清空 source 块）——这是预期行为，不是登记复活；④ **只提示目录仍存在且可读、且不是 Web 上传暂存目录（`~/.ki/import-uploads/*`）/数据目录内部**的项；页面收进一个默认可折叠块（摘要带数量），CLI 打印数量 + 前 5 条 |
| R16 | 同步历史保留最近 N 次 | P2 | 兴奋 | 低 | 中 | 详情页可展开 |
| R17 | 数据源详情「待删除」段：按 Group 分组勾选（**默认全不勾**）+「删除所选 N 篇」就地二次确认 + 回执 | P0 | 期望 | 高 | 中 | ① 确认前零请求；② 409 时就地提示「源目录已变化，请重新同步」；③ **候选 >500 时分批删除**（每次 ≤500，删完刷新继续，顶部常显「已显示 500 / 共 N」）；按 Group 仅用于分组展示，不提供"按组删全部"按钮 |
| R18 | `ki datasource prune --scope <s> [--group <g>] [--yes]`：无页面环境的删除入口，与页面共用同一后端逻辑 | P1 | 期望 | 中 | 低 | 默认只预览；`--yes` 才执行（每次 ≤500，打印剩余数）；`--group` 只在客户端筛选 `selected`，**不传给服务端**；token 与服务端重算规则与页面一致 |
**不做**：页面创建/编辑/触发**同步**（删除是唯一例外，见 R17）；页面命令复制；多源（一 scope 一源）；远程/git/url 源；删除数据源时级联删文档；**`--all` / 一次性同步所有数据源**（2026-10-20 安全收紧）；**同步时自动删除**（2026-10-21 反转）；**定时/自动同步**（原 `REQ-20261019-003`，已放弃）。

---

## 5. CLI 契约

```
ki datasource add     --scope <s> --source <dir> [--group <g>]
                      [--conflict-mode incremental|overwrite|skip|suffix]
                      [--conflict-suffix "_{n}"] [--chunk-size N] [--chunk-overlap N] [--force]
ki datasource sync    --scope <s> [--dry-run]                # 导入 + 算候选，不删除；单源，无 --all
ki datasource prune   --scope <s> [--group <g>] [--yes]      # 删除入口；每次 ≤500，打印剩余
ki datasource list    [--json]
ki datasource remove  --scope <s> [--yes]
```

- stdout = `JSON.stringify(result, null, 2)`（与 `ki group` 一致），人类可读信息走 stderr
- 失败不抛栈：`{ ok:false, error, code }` + `process.exitCode = 1`
- 走 daemon 判据沿用 `shouldUseDaemonClient()`；同步属写操作 → 需在 `daemon-dispatch.ts` 注册 handler
- 参数语义：`sync` **没有任何删除开关**（Q12）；`conflictMode` 默认 `incremental`
- **`sync` 与 `prune` 是两个动作**：前者只写库（导入），后者只删库；不存在"一条命令既导又删"
- **`prune` 的 `--yes`**：默认只预览；执行时服务端按**当前源目录重算**候选并与 `token` 比对，失配即 409（不留跨调用授权）；`--group` 只在客户端筛选，不传给服务端
- **`--dry-run` 只对 `sync` 有意义**：输出导入计划 + 候选摘要，零写入
- **`remove` 不触碰 `group-index.json.source`**（Q-C）：数据源从未写它，清空属于越界修改别人的状态

---

## 6. 存储 schema

```jsonc
// <kbDir>/datasource.json —— 每 scope 一个文件（单源）
{
  "version": 1,
  "scope": "default",
  "dir": "/Users/me/docs/wiki",     // add 时 resolve 为绝对路径
  "group": "wiki",                  // null = 按顶层子目录自动
  "conflictMode": "incremental",
  "conflictSuffix": "_{n}",
  "vector": true,
  "chunkSize": null,                // null = 1000（数据源自己持有，不写进 group-index.source）
  "chunkOverlap": null,             // null = 150
  "createdAt": 1760900000000,
  "updatedAt": 1760900000000,
  "lastSync": {
    "at": 1760900000000,
    "durationMs": 42000,
    "state": "ok",                     // ok | partial | failed | cancelled
    "params": { "group": "wiki", "conflictMode": "incremental", "vector": true },
    "result": { "files": { "scanned": 128, "completed": 123, "skipped": 4, "incomplete": 1 },
                "failures": [{ "path": "docs/auth/oauth.md", "reason": "向量化超时" }] },
    "seenRels": ["docs/auth/oauth.md", "…"],   // 候选基线：本次全量扫描的 rel（Q14）
    "pendingDelete": {
      "token": "a1b2c3d4e5f60718",     // 候选指纹（sha256 前 16 位）；total>0 即有（含超限）
      "computedAt": 1760900000000,
      "total": 12,
      "overLimit": false,              // true = >500，需分批删除（Q15）
      "eligibleCount": 120,            // 候选基线内文档数（闸门 B 分母 / 页面比例口径）
      "items": [
        { "group": "wiki/old", "relation": "legacy", "sourcePath": "old/legacy.md" }  // 上限 500
      ],
      "stale": false,                  // 源目录不可读 / 本次未重算
      "staleReason": null,             // source-missing | source-unreadable | not-recomputed
      "blocked": null                  // EMPTY_SOURCE | GATE_COORD | GATE_SCALE | ERROR
    }
  }
}
```

- 落点理由：与 `getKbDir(scope)` 同生命周期 → `ki scope delete` 级联、`export`/`backup` 天然覆盖；**不进** `config.yaml`（全局单文件、并发写风险、含密钥）
- **不写** `group-index.json.source`（Q-C）：数据源与一次性导入源隔离；`chunkSize/chunkOverlap` 只存本文件
- **候选所有权**（Q14）：`seenRels` 只在 `state ∈ {ok, partial}` 时更新；失败/取消保留上一版并标 `stale`
- 提示：恢复快照到另一台机器后 `dir` 大概率失效 → 全部 `missing`，同步时一次性汇总，不逐条刷屏

---

## 7. 待确认

| ID | 问题 | 结论 | 影响 |
|---|---|---|---|
| ~~**Q-C**~~ | ~~`group-index.json.source` 是否沿用现状写入？~~ | **已定（2026-10-21）：不写** —— 数据源与一次性导入源隔离；`remove` 也不清空历史 source 块。代价见 §3 影响面 | 已关闭；7 处消费方看不到数据源，重建类回退默认切分参数 |
| ~~Q-D~~ | ~~删除占比 > 20% 时是否要 `--yes`~~ | **已定（2026-10-21）**：删除改由页面显式勾选 + 就地二次确认，20% 降级为确认文案里的提示 | 已关闭 |
| ~~Q-E~~ | ~~`sync` 缺省是否同步全部？~~ | **已定（2026-10-20）：不支持 `--all`，必须显式 `--scope`** | 已关闭 |

---

## 8. 删除的安全设计（同步不删，删除是显式动作）

**三段解耦**

| 阶段 | 触发 | 是否写库 |
|---|---|---|
| ① 导入 | `ki datasource sync --scope X` | 写（幂等 upsert） |
| ② 算候选 | 同一次 `sync`（纯计算） | 不写；结果存 `lastSync.pendingDelete` |
| ③ 删除 | 页面「删除所选」/ `ki datasource prune --yes` | 写（`executeBatchDelete`） |

**② 候选阶段：闸门只决定"候选是否可用"，不影响导入**

| 层级 | 条件 | 行为 |
|---|---|---|
| 中止该源 | 目录不存在 / 不可读 | `missing`，不产候选（**绝不当成 0 文件**）；保留上次候选并标 `stale` |
| 不产候选 | 本次扫描 0 个可导入文件 | `EMPTY_SOURCE`；`seenRels` 不更新 |
| 不产候选 | 路径重合率 < 0.8 或删除占比 > 0.8（分母 = 本数据源基线内文档数） | `GATE_COORD` / `GATE_SCALE` |
| 正常（超限） | 候选 > 500 篇 | 仍写 `pendingDelete`（`overLimit:true` + 前 500 条 + **token**）；页面分批删除 |
| 正常 | 以上均不命中 | 写入 `pendingDelete { token, items, computedAt }` |

> **候选范围**：`eligibleRels（上一版 seenRels）∩ 库中 sourcePath` − 本次扫描 —— 不是全 scope 差集（Q14）。

**③ 删除阶段：服务端强制规则**

| 规则 | 说明 |
|---|---|
| 重算 | 服务端按**当前源目录**重算候选，不信任前端清单；扫描扩展名与导入**同源**（`resolveImportExtensions`） |
| token | 与同步时写入的指纹比对；失配 → 409 `PRUNE_TOKEN_STALE`（提示"源目录已变化，请重新同步"）。**超限时也有 token** |
| 重算后再校验 | 重算结果同样过一次双闸门（500 不再阻断，改为 `selected ≤ 500` 的分批约束） |
| selected | 只接受「前端所选 ∩ **重算返回的可见 items**」；`selected > 500` → 400 |
| 源文件 | **强制 `wikiDelete:false`** —— 只删知识库记录，不动源目录文件（设计 S-03 D6） |
| 鉴权 | `scopeAllowed`；远程 token 需该 scope 授权 |
| 回执 | `{ deleted, failed[] }` + 剩余 `pendingDelete`（新 token / total / overLimit），支持"继续删除" |

> **不可逆**：删除是物理删除（无回收站）。页面必须就地二次确认（篇数 + 不可恢复），确认前零请求。
> **20% 阈值降级**：不再是 CLI 的 `--yes` 门，改为二次确认框里的提示文案（「本次将删除库内 X%，超过 20%」）。

## 9. 负向需求

1. **目录失效时仍会算候选** → 不可读必须报错中止，禁止降级为"0 个文件"（同步虽不删，但错误候选会诱导用户在页面点击删除）。
2. **`add` 改路径**（旧路径文档仍在库）→ 下次同步会把它们全部列进待删候选（不会自动删）⇒ 改路径必须 `--force` 并预告候选规模；改 `--group` 则旧 group 文档保留且重复。
3. **同步中途 Ctrl+C** → 已导入部分保留，`lastSync.state = cancelled`，绝不写 `ok`。
4. **待删 > 500 篇** → 分批删除（每次 ≤500，删完刷新继续），不依赖"按 Group 删除"；页面必须常显「已显示 500 / 共 N」，否则用户以为删完了。
5. **`suffix` 策略 + 反复同步** → `_1 _2 _3` 文档爆炸 ⇒ `add` 时提示副作用。
6. **scope 不存在/未注册**（strict 模式）→ `add` 时 fail-loud，列出可用 scope。
7. **CLI 同步与 Web 导入同 scope** → `SCOPE_OPERATION_BUSY` 明确文案 + 建议等待。
8. **`remove` 后文档残留** → 文案必须写明"仅取消登记，库内 N 篇文档保留"。
9. **备份跨机恢复** → 全部 `missing`，一次性汇总；不在日志里逐条刷屏。
10. **页面只读导致"看得见改不了"** → 空态与详情页给出**纯文本**的 add/sync 命令说明（不提供复制按钮，R9 已作废），否则页面无任何引导。
11. **`remove` 后历史 `source` 块仍在** → 迁移提示会再次提示"检测到历史导入目录"。这是**预期**（数据源从未写它、也不该清它）；文档与页面文案必须说明，避免被当成"取消登记失效"。
12. **候选混入其他通道的文档** → 若不用 `seenRels` 收窄，`--group` 留空时 Web 上传 / 一次性导入的文档会被列为待删（双闸门拦不住）⇒ 候选所有权必须按 Q14 实现。
13. **扩展名口径分叉** → 候选重算与导入必须共用 `resolveImportExtensions`，否则 token 恒失配、且可能把仍在本地的大批文件判成已删。
12. **删除时目录已变** → 前端清单是同步那一刻的快照；服务端必须重算 + token 校验，失配 409（`PRUNE_TOKEN_STALE`），不得照旧清单删。
13. **页面删除与同步并发** → 同一 scope 的 prune 与 sync 都走 scope 写锁，冲突时明确文案，不静默失败。

---

## 10. 界面预期（2026-10-21 定稿）

**总览统计条（替换第 4 卡）**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Scopes       │ KB 文档      │ 向量层       │ 数据源       │
│ 4            │ 627          │ 4            │ 2            │
│ KB 4 · 向量 4│              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**数据源列表（一行一 scope，无复制、无动作列）**
```
┌ 数据源 ───────────────────────────────────── 共 2 个 · 1 个超过 24h 未同步 ┐
│ ⓘ 数据源只能通过命令行登记与同步（一次一个），本页只读        │
├──────────┬──────────────┬──────────┬─────────────────────┬─────────┬──────┤
│ Scope    │ 源目录        │ 落点      │ 上次同步              │ 状态     │ 待删  │
│ default  │ ~/docs/wiki   │ wiki/    │ 2026-10-21 09:12:30  │ ✓ 成功   │ 3    │
│ monitot  │ ~/docs/api    │ API接口…  │ 2026-10-15 11:20:05  │ ⚠ 部分失败│ —   │
├──────────┴──────────────┴──────────┴─────────────────────┴─────────┴──────┤
│ 第 1 / 1 页 · 共 2 个                                   每页 [10▾] 条  ‹ › │
└───────────────────────────────────────────────────────────────────────────┘
                                        ① 点行 → 右侧抽屉展示同步详情
```

> 2026-10-21 用户定稿：列表改全宽六列；`上次同步` 为**绝对时间**；**分页默认 10，可选 50/100**；点行开右侧抽屉（不再左右分栏）。

**数据源详情（与任务详情同构 + 待删除段）**
```
┌ ← 数据源 ──────────────────────────────────────────────────┐
│ DETAIL                                     [⚠ 部分失败]   │
│ 数据源同步                                                 │
├────────────────────────────────────────────────────────────┤
│ ── 同步参数 ──                                            │
│   知识库       monitot                                     │
│   源目录       /Users/me/docs/api                          │
│   落点 Group   wiki/API接口文档                            │
│   同名策略     覆盖已有文档（overwrite）                    │
├────────────────────────────────────────────────────────────┤
│ ── 执行结果 ──                                            │
│   扫描 128 · 新增 3 · 更新 120 · 跳过 4 · 失败 1           │
│   ▶ 失败明细 1 条                                          │
├────────────────────────────────────────────────────────────┤
│ ── 待删除 12 篇 ─────── 由 2026-10-14 09:12 同步算出 ─────┤
│   ☐ 全选（12）                        [删除所选 0 篇]      │
│   ☐ wiki/old                                       1 篇    │
│      ☐ old/legacy.md                                      │
│   ☐ wiki/deprecated                                11 篇   │
│      ☐ deprecated/a.md                                    │
│      ☐ deprecated/b.md                                    │
│   ⓘ 删除不可恢复；执行时按当前源目录重新校验，变了会拒绝    │
├────────────────────────────────────────────────────────────┤
│ ── 时间 ──                                                │
│   上次同步     2026-10-14 09:12 · 用时 42s                 │
└────────────────────────────────────────────────────────────┘
```

## 11. 关键假设

| ID | 假设 | 错了会怎样 | 验证 |
|---|---|---|---|
| A1 | 数据源 = **本地目录**（不含 git/url/远程） | 需加 `type` 字段与分支，R1/R2 参数翻倍 | 已确认（用户 Q5 语境为"目录导入"） |
| A2 | 同步语义 = 对该目录执行 `ki import` 全量幂等扫描 + **计算候选（不删除）** | 若要"只扫变更"，需引入 mtime/size 水位线（未完成清单 + `onlyRelPaths` 已可用，但需新调度） | 现有 import 已幂等，够用 |
| A3 | 页面不提供登记与同步，**仅允许删除待删候选** | 若还要求网页登记/同步，需补对应写接口与鉴权 | 用户已明确（Q12 / Q13） |
| A4 | 数据源数 = 有数据源的 scope 数 | 若改为"所有 scope 数"则与 Scopes 卡重复 | Q4 已定"替换" |

---

## 12. 下一步

1. ~~裁决 Q-C~~ → **已定（2026-10-21）：数据源同步不写 `source` 块**；同时关闭 Q14（候选所有权）与 Q15（超限分批删除）。
2. **设计已按裁决修订**（`design/`，2026-10-21）：S-01 登记与存储 / S-02 同步与候选 / S-03 删除链路 / S-04 只读接口 / S-05 前端页面；见 `DESIGN.md` §5「裁决与需求回写清单」。
3. 实施按 `plan-track` 建档；中复杂度（新持久化实体 + 3 个 HTTP 接口 + 新页面 + 打通 prune 的 CLI 入口 + 三处共享改动：`import.ts` 两个开关、`import-prune.ts` 两个可选参数、`resolveImportExtensions` 抽公共）。
4. 实施前**必须实测**的两项（设计阶段仍是代码直读，未运行验证）：
   - 改 `--group` 后旧文档的真实归属（推演 P12：覆盖旧记录 vs 落新组，未验证）；
   - 候选 >500 的分批删除全链路（含 token 换发与 409 时序）。
