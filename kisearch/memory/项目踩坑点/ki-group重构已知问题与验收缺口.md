---
groupPath: 项目踩坑点
relation: ki-group重构已知问题与验收缺口
exportedAt: "2026-10-19T16:12:19.907Z"
---
# ki group 重构 · 已知问题与验收缺口（2026-10-20）

详细清单：`CodeWikiHub/kisearch/requirements/2026-10-19-ki-group命令重构/review/known-issues.md`。REQ-20261019-005 v16。验收状态：⚠️ 有条件通过（19 项：17 ✅ / 2 🟡 / 0 ❌；🔴 15/15）。

## 未修的真实缺陷
- **K-01 `ki-relation` 辅助向量残留（P1）**：删组后 `doc list` 仍剩 `a-01/b-01`，`ki search` 仍可能命中已删组的关系名。根因：docId = sha256(relation 名 + scope + tag)，不含 group、跨组共享，按 id 删会误删他组。需持久化 aux ids 或给向量加 group 元数据（schema 变更）。
- **K-02 只有路径向量的组残留（P2 边界）**：`ki-path` 清理以 relationIds 非空为开关；仅路径向量时不会被删。
- **K-03 legacy `roots` 预览/执行不一致（P2 老数据）**：预览纯读 `groups` 报 NOT_FOUND，执行会先迁移再成功。
- **K-04 `ki group create` 不触发 legacy 迁移（P2 老数据）**：可能 `roots` + `groups` 双格式并存。

## 已修复（留档）
- F-01 补删 `ki-path` 路径向量（此前搜索命中已删组）。
- F-02 预览 `willDelete.vectors` 计入路径向量（此前少报）。
- F-03 无向量组不再初始化向量引擎（此前 `group-key-invariant` 0% CPU 挂起 11 分钟）。
- F-04 文档级硬删优先 `rel.sourcePath` 定位（平铺导入此前 `file-not-found`）。
- F-05 预览 `emptyParents` 排除目标子树。
- F-06 `group list --json` 合并树路径（纯树组此前不出现）。
- F-07 预览改纯 `readJson`，迁移只在执行写锁内。
- F-08 `group-create` 补 `SCOPE_OPERATION_BUSY` code。

## UX / 边界（未修）
- U-01 `ki group list` 默认 `mode=hot`，纯树组不显示树。
- U-02 空父自动清理后，MCP 再删父返回 GROUP_NOT_FOUND。
- U-03 锁 code 靠 message.includes('正在写入') 判定，文案改则失效。
- U-04 `--json --with-counts` O(组数) 分片读（文档已标慢路径）。
- U-05 预览/执行两次独立操作，期间新增 relation 也会被 `--yes` 删除。
- U-06 预览/执行结果无 `mode` 字段。

## 验收/交付缺口
- A-01 M-09“迁移中”错误出口未实测。
- A-02 M-10 文档样例未逐字段 diff。
- A-03 T-02 万级删除耗时无基线。
- A-04 T-04 外部 MCP 客户端迁移说明未落文档。
- A-05 T-05 用户级 skill 不在 git、无发布流程。

## 建议顺序
K-01/K-02 辅助向量归属方案 → K-03/K-04 legacy 归一化 → U-01/U-02/U-03 → A-01~A-05。当前不应改状态为“已验收”。