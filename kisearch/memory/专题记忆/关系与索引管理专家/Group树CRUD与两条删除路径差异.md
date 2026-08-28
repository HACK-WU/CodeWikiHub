---
groupPath: 专题记忆/关系与索引管理专家
relation: Group树CRUD与两条删除路径差异
exportedAt: "2026-08-28T07:38:41.827Z"
---
src/manage-index.ts 纯函数：executeManageCreate（findContainer 定位父容器，失败用 resolveGroupPath 补全——不传 scope 无向量兜底）、executeListScopes（磁盘已初始化 ∪ 配置已注册，返回 {scope,topGroups,registered,initialized}）、executeManageDeleteEmpty（三重空性检查：子节点 / relation 数 / local KB 条目，仅限空节点）。
**两条删除路径语义不同，易误用**：
- `ki manage-index --action delete --force`（cascadeDeleteGroupData）：删树节点 + 前缀匹配清 cache 键 + 聚合 memoryId 一次 vectorDelete + 删 local KB，**不清理 wiki 文件**。
- `ki delete-relation -g <group>`（executeDeleteGroup）：清向量 + cache + rmSync 删 KB 子树 + wiki 目录移入回收站 + removeGroupNode 删树节点（子空则级联清父）——更彻底，推荐。
MCP 只暴露空节点删除（ki_manage_index_delete），级联删除不通过 MCP 暴露（NEG-15 决策：不可逆且无二次确认交互）。