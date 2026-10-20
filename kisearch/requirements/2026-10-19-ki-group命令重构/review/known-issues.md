# ki group 重构 · 已知问题与验收缺口

> 记录时间：2026-10-20（**2026-10-20 第二轮修复已回写**）
> 代码基线：`master@6131808` + 本轮未提交改动（`src/lib/vector-client.ts` / `group-delete.ts` / `group-create.ts` / `src/group.ts` + 3 个测试文件 + `docs/group.md`）
> 状态：实现完成，验收 **⚠️ 有条件通过**（19 项指标：17 ✅ / 2 🟡 / 0 ❌；🔴 必达 15/15）
> 关联：REQ-20261019-005；验收报告 `.requirements/acceptance/ki-group-refactor/reports/round-1-2026-10-19.md`

## 〇、第二轮修复（2026-10-20）

| 原编号 | 结论 | 修复方式 | 验证 |
|---|---|---|---|
| **K-01** | ✅ **已修复，且不需要改存储格式** | 向量层 `group` 是**已建索引的标量字段**（`vector-client.ts:613`），新增 `vectorListAuxDocsByGroups()` 按 group 枚举 `ki-relation`/`ki-path`，删组尾部清扫 | 真实 daemon：`ki group delete 验收 --yes` → `vectors.deleted:5 / auxFound:2`，随后 `ki doc list` **0 条**、`ki search a-01` **空结果** |
| **K-02** | ✅ 已修复 | 同上（按 group 枚举，不再依赖 `relationIds.length > 0` 开关） | 同 K-01 场景含 ki-path |
| **K-03** | ✅ 已修复 | plan 侧引入纯读归一化 `readNormalizedGroups()`（复用导出的 `migrateGroupIndex`，不写盘）；`resolveExactGroupPath` / `candidatePaths` 同步 | 新增用例：legacy `roots` 预览成功 + 预览后文件字节级不变 + 执行一致 |
| **K-04** | ✅ 已修复 | `group-create` 改用 `readGroupIndex()`（写锁内迁移）并兜 `groups` 缺失；原报错是裸 `TypeError`（比原记录更严重） | 新增用例：legacy scope create 成功且无 `Cannot convert undefined or null` |
| **N-01**（原 F-02 未落地） | ✅ 已修复 | plan 的 `willDelete.vectors` 计入组路径向量，与执行同口径 | 预览 3 / 执行 3（修复前 2 / 3） |
| **N-02**（U-01 更严重版） | ✅ 已修复 | `ki group list` 的 `--mode` 默认改 `full` | 纯树 scope 文本模式可见组名 |
| **U-03** | ✅ 已修复 | 锁冲突按 `err.code === 'SCOPE_OPERATION_BUSY'` 判定 | — |
| **新增** | 共享 docId 误删 | 同名 relation（含 import 的 `-NN` chunk 后缀）与同内容跨组共享 docId 均按**存活组引用集合**保护 | 真实链路：同内容导入 A/B 后删 A → `sharedContentKept:2`、`sharedKept:2`，B 的检索与关系全部可用 |

> 说明：K-01 原判「需持久化辅助 id 或加 group 元数据后单独立项」**不成立** —— `group` 字段早已存在于 schema 且带索引，直接按它枚举即可，无需改存储格式。

## 一、用户可见的真实缺陷

### K-01 `ki-relation` 辅助向量删不净（✅ 已修复 2026-10-20）

- **现象**：删组后 `ki doc list` 仍剩 `a-01/b-01` 等 `ki-relation` 文档；`ki search` 仍可能命中已删除组的“关系名幽灵”。
- **证据**：真实 daemon 验证——`import` 2 文档到 `验收` 后执行 `ki group delete 验收 --yes`，`doc list` 从 5 条降为 2 条（剩余 `ki-relation`），搜索仍返回 `content:"a-01"`。
- **根因**：`ki-relation` 的 docId = `sha256(relation 名 + scope + tag)`，**不含 group**，跨组共享；按 id 删除会误删其他组的同名关系向量。
- **影响**：删除组后搜索可能返回该组的关系名；`doc list` 仍有残留。
- **建议**：把辅助向量 id 持久化到 relation（schema 扩展），或给向量加 group 元数据后按组删除。属于存储格式变更，需单独立项。
- **临时规避**：删除后执行 `ki rebuild-vector`，或直接清理 scope 后重建。

### K-02 组只有路径向量、无内容向量时残留（✅ 已修复 2026-10-20，随 K-01 的清扫一并覆盖）

- **现象**：`ki-path` 清理以 `relationIds.length > 0` 为开关；若某组只有路径向量（导入失败、历史残留），路径幽灵不会被删。
- **影响**：低概率；搜索可能命中组路径。
- **建议**：后续改为按“该组是否存在路径向量”探测（需向量查询能力），或与 K-01 一并做归属方案。

### K-03 legacy `roots` 结构的预览/执行不一致（✅ 已修复 2026-10-20）

- **现象**：`planGroupDelete` 纯读 `groups`，legacy `roots` 数据预览报 `GROUP_NOT_FOUND`；`executeGroupDelete` 会先 `readGroupIndex` 迁移再执行，能成功。
- **影响**：老 scope 上“预览说没有、执行却删了”，用户无法预判。
- **建议**：为预览提供一个纯读的 `roots → groups` 归一化函数（不写盘），或启动时统一迁移。

### K-04 `ki group create` 不触发 legacy 迁移（✅ 已修复 2026-10-20）

- **现象**：create 直接读写 `groups`，legacy `roots` 保留，可能出现 `roots` + `groups` 双格式并存。
- **影响**：老 scope 上树结构可能分叉。
- **建议**：create 入口与 execute 一样先调用一次 `readGroupIndex`（写锁内迁移），或明确拒绝未迁移 scope。

## 二、已修复、但值得留档的缺陷

| # | 问题 | 修复 |
|---|---|---|
| F-01 | 删组只删内容向量，未删 `ki-path` 路径向量，搜索仍命中已删组 | 按 `generateDocId(buildGroupPathContent(group), scope, 'ki-path')` 补删 |
| F-02 | 预览 `willDelete.vectors` 只统计内容向量，实际执行多删路径向量 | ⚠️ **原记录「已修复」不成立**（`planGroupDelete` 仍只数 memoryIds，测试期望仍是 1）。2026-10-20 真正修复：计划侧计入组路径向量（`test/delete-group` 期望改为 3） |
| F-03 | 无向量的组删组时仍重算路径 id 并调用 `vectorDelete`，在临时 config 下初始化向量引擎挂起（0% CPU，11 分钟） | 仅 `relationIds` 非空时才补路径 id；`group-key-invariant` 8.7s 正常退出 |
| F-04 | 文档级硬删按 `<sourceDir>/<group>/<relation>.md` 定位，平铺导入的 `sourcePath=a.md` 找不到文件 | 优先 `rel.sourcePath`，缺失才回退命名约定；不符报 `source-mismatch` |
| F-05 | 预览 `emptyParents` 把目标子树自身算成“其他路径”，恒为空 | 排除 `target` 及其子树后再判断 |
| F-06 | `ki group list --json` 只读 relations 分片，纯树组不出现 | 合并 group-index 树路径 ∪ relations 键 |
| F-07 | 预览在 legacy 数据上会触发迁移写盘 | 预览改纯 `readJson`；迁移只在执行写锁内做 |
| F-08 | `group-create` 锁冲突无 `SCOPE_OPERATION_BUSY` code | catch 补 code |

## 三、边界与 UX 缺口（未修，非阻断）

| # | 问题 | 性质 | 建议 |
|---|---|---|---|
| U-01 | ✅ 已修（2026-10-20）：`--mode` 默认改 `full`。实测更严重：纯树 scope 的 `hot` 视图**一条组名都不显示** | UX | 已改默认值；需分区视图时显式传 `--mode hot` |
| U-02 | 删除唯一子组后空父自动清理，MCP 再删父返回 `GROUP_NOT_FOUND` | 设计行为 | 在结果里返回 `prunedParents`，让调用方知道父组已空删 |
| U-03 | ✅ 已修（2026-10-20）：create/delete 均改为按 `err.code === 'SCOPE_OPERATION_BUSY'` 判定 | 脆弱实现 | 已落地 |
| U-04 | `--json --with-counts` 是 O(组数) 次分片读 | 性能 | 已在文档标为慢路径；大数据量建议默认只出路径 |
| U-05 | 预览与执行是两次独立操作，期间新增的 relation 也会被 `--yes` 删除 | 契约 | 需要严格快照时引入 `preview_token`（本设计未做） |
| U-06 | 预览文案/字段无 `mode: preview|executed` 区分 | 契约 | 可选增强 |

## 四、验收口径缺口

| # | 缺口 | 影响 | 补验方式 |
|---|---|---|---|
| A-01 | M-09 的“迁移中”错误出口未实测 | 低；代码返回 `VECTOR_MIGRATION_PENDING` 与恢复指引 | 注入 migration marker 后跑 create/delete |
| A-02 | M-10 文档样例未与真实输出逐字段 diff | 低 | 增加 docs 样例快照测试 |
| A-03 | T-02 万级 relation / 万级文件删除耗时无基线 | 中 | 压测并补 P99 |
| A-04 | T-04 外部 MCP 客户端“旧名 → 新名”迁移说明未落文档 | 中 | 发布说明补一节 |
| A-05 | T-05 用户级 skill 不在 git 内，无发布流程 | 中 | 纳入发布清单或仓库化 |

## 五、结论与建议顺序

**已完成（2026-10-20 第二轮）**：K-01 / K-02 / K-03 / K-04 / N-01 / N-02 / U-03 + 共享 docId 误删。

**跟进项处置（2026-10-20 第三轮）**：

1. ✅ **真引擎 filter 契约测试**：新增 `test/group-vector-contract.test.ts`（6 例，静态契约：schema 声明 `group` 且 indexed / 中文组名 / 单引号转义 / and-or 结构 / 未声明字段 fail-loud）+ `test/zvec-engine-engine.test.mjs` 的 `TC-GROUP-01`（真引擎：中文组名 OR 过滤、含 `'` 值、无 group 字段文档不被命中、limit 截断可观测）。
2. ✅ **「无 group 字段的历史辅助向量」判定为理论问题，本机不适用**（🟢 证据链）：
   - `GROUP_FIELD` 与写入端传 `group` 均引入于 **2026-08-05**（`12d14c4`），`sync-relation` 侧 2026-08-13（`184145e`）；
   - 本机全部 99 个向量集合的 **birth time 最早为 2026-09-10**（`stat %w`），晚于引入一个多月 ⇒ 不存在"前 group 时代"写入；
   - 抽样 `ai-docs`（1882 条关系）/ `consul` / `xpert-memory` 的 `ki-relation` 命中，`group` 字段**全部存在**。
   - 结论：仅在"用 2026-08-05 之前的版本导入过关系向量"的机器上才需要回填；`docs/group.md` 保留该 caveat 与 `ki rebuild-vector` 兜底。

**剩余待办**：

1. **U-02**（空父自动清理后 MCP 再删父返回 `GROUP_NOT_FOUND`）：建议在结果里返回 `prunedParents`，让调用方知道父组已被清理。
2. **U-04 / U-05 / U-06**：`--with-counts` 慢路径提示、预览与执行之间新增 relation 的快照问题、`mode: preview|executed` 字段区分（均为契约增强，非缺陷）。
3. **A-01 ~ A-05**：验收与交付缺口（migration marker 出口实测、文档样例逐字段 diff、万级删除耗时基线、MCP 旧名迁移说明、用户级 skill 纳入发布清单）。
4. **新登记**：`SURVIVOR_SCAN_GROUP_CAP = 5000` 之上不做共享判定（跳过辅助向量清扫并给 warning），若将来出现超大规模 scope 需要改为按需分页扫描。

> 本轮修复后，删除组的可观察终态是：`ki doc list` 无残留、`ki search` 不再命中已删组，且**不会误删存活组仍在使用的共享向量**（真实链路已验证：同内容导入 A/B 后删 A，B 的 5 条向量与检索均完好）。
