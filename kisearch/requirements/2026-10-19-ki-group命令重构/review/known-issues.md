# ki group 重构 · 已知问题与验收缺口

> 记录时间：2026-10-20
> 代码基线：`master@fb6a5da` + 未提交工作区改动
> 状态：实现完成，验收 **⚠️ 有条件通过**（19 项指标：17 ✅ / 2 🟡 / 0 ❌；🔴 必达 15/15）
> 关联：REQ-20261019-005；验收报告 `.requirements/acceptance/ki-group-refactor/reports/round-1-2026-10-19.md`

## 一、用户可见的真实缺陷

### K-01 `ki-relation` 辅助向量删不净（未修，P1）

- **现象**：删组后 `ki doc list` 仍剩 `a-01/b-01` 等 `ki-relation` 文档；`ki search` 仍可能命中已删除组的“关系名幽灵”。
- **证据**：真实 daemon 验证——`import` 2 文档到 `验收` 后执行 `ki group delete 验收 --yes`，`doc list` 从 5 条降为 2 条（剩余 `ki-relation`），搜索仍返回 `content:"a-01"`。
- **根因**：`ki-relation` 的 docId = `sha256(relation 名 + scope + tag)`，**不含 group**，跨组共享；按 id 删除会误删其他组的同名关系向量。
- **影响**：删除组后搜索可能返回该组的关系名；`doc list` 仍有残留。
- **建议**：把辅助向量 id 持久化到 relation（schema 扩展），或给向量加 group 元数据后按组删除。属于存储格式变更，需单独立项。
- **临时规避**：删除后执行 `ki rebuild-vector`，或直接清理 scope 后重建。

### K-02 组只有路径向量、无内容向量时残留（未修，P2 边界）

- **现象**：`ki-path` 清理以 `relationIds.length > 0` 为开关；若某组只有路径向量（导入失败、历史残留），路径幽灵不会被删。
- **影响**：低概率；搜索可能命中组路径。
- **建议**：后续改为按“该组是否存在路径向量”探测（需向量查询能力），或与 K-01 一并做归属方案。

### K-03 legacy `roots` 结构的预览/执行不一致（未修，P2 老数据）

- **现象**：`planGroupDelete` 纯读 `groups`，legacy `roots` 数据预览报 `GROUP_NOT_FOUND`；`executeGroupDelete` 会先 `readGroupIndex` 迁移再执行，能成功。
- **影响**：老 scope 上“预览说没有、执行却删了”，用户无法预判。
- **建议**：为预览提供一个纯读的 `roots → groups` 归一化函数（不写盘），或启动时统一迁移。

### K-04 `ki group create` 不触发 legacy 迁移（未修，P2 老数据）

- **现象**：create 直接读写 `groups`，legacy `roots` 保留，可能出现 `roots` + `groups` 双格式并存。
- **影响**：老 scope 上树结构可能分叉。
- **建议**：create 入口与 execute 一样先调用一次 `readGroupIndex`（写锁内迁移），或明确拒绝未迁移 scope。

## 二、已修复、但值得留档的缺陷

| # | 问题 | 修复 |
|---|---|---|
| F-01 | 删组只删内容向量，未删 `ki-path` 路径向量，搜索仍命中已删组 | 按 `generateDocId(buildGroupPathContent(group), scope, 'ki-path')` 补删 |
| F-02 | 预览 `willDelete.vectors` 只统计内容向量，实际执行多删路径向量 | 预览也计入路径向量（`test/delete-group` 期望改为 3，7/7 通过） |
| F-03 | 无向量的组删组时仍重算路径 id 并调用 `vectorDelete`，在临时 config 下初始化向量引擎挂起（0% CPU，11 分钟） | 仅 `relationIds` 非空时才补路径 id；`group-key-invariant` 8.7s 正常退出 |
| F-04 | 文档级硬删按 `<sourceDir>/<group>/<relation>.md` 定位，平铺导入的 `sourcePath=a.md` 找不到文件 | 优先 `rel.sourcePath`，缺失才回退命名约定；不符报 `source-mismatch` |
| F-05 | 预览 `emptyParents` 把目标子树自身算成“其他路径”，恒为空 | 排除 `target` 及其子树后再判断 |
| F-06 | `ki group list --json` 只读 relations 分片，纯树组不出现 | 合并 group-index 树路径 ∪ relations 键 |
| F-07 | 预览在 legacy 数据上会触发迁移写盘 | 预览改纯 `readJson`；迁移只在执行写锁内做 |
| F-08 | `group-create` 锁冲突无 `SCOPE_OPERATION_BUSY` code | catch 补 code |

## 三、边界与 UX 缺口（未修，非阻断）

| # | 问题 | 性质 | 建议 |
|---|---|---|---|
| U-01 | `ki group list` 默认 `mode=hot`，纯树组只显示统计、不显示树 | UX | 命令名是 `list`，可考虑默认 `full`，或在无 relation 时自动补树 |
| U-02 | 删除唯一子组后空父自动清理，MCP 再删父返回 `GROUP_NOT_FOUND` | 设计行为 | 在结果里返回 `prunedParents`，让调用方知道父组已空删 |
| U-03 | 锁冲突 code 靠 `message.includes('正在写入')` 判定 | 脆弱实现 | 改为按 `err.code === 'SCOPE_OPERATION_BUSY'` |
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

1. **K-01 / K-02**：辅助向量归属方案，单独立项（唯一用户可见残留）。
2. **K-03 / K-04**：legacy `roots` 归一化，避免老数据预览/创建分叉。
3. **U-01 / U-02 / U-03**：低成本 UX 与健壮性修正。
4. **A-01 ~ A-05**：验收与交付缺口补齐后再申请“完全通过”。

> 当前不建议把状态改为“已验收”：K-01 会让用户在删除组后仍搜到内容，属于功能语义残留。
