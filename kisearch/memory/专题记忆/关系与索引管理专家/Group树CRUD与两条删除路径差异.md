---
groupPath: 专题记忆/关系与索引管理专家
relation: Group树CRUD与两条删除路径差异
exportedAt: "2026-10-20T06:23:16.194Z"
---
`ki group` 命令族（2026-10 重构；`manage-index` / `query-group` 已下线，零兼容，误用会直接报错并提示等价命令）：
- `ki group list [--scope]`：列组树（复用旧 executeQueryGroup 实现），**只读**，不写 cache。
- `ki group create "<path>"`：建组；findContainer 定位父容器，失败用 resolveGroupPath 补全（不传 scope 时无向量兜底）。
- `ki group delete "<path>" [--yes]`：**缺省只预览（零写入），`--yes` 才执行**。实现在 src/lib/group-delete.ts：scope 写锁 + 迁移守卫 + 两段元数据提交窗口；清 relations 分片（含子组）/ `kb/{scope}/{group}/`（含 assets）/ group-index 树节点 / dense 向量 / FTS；向量或 FTS 失败**不抛错**，以 `degraded` + `orphanIds` 透出；**不触碰 source.dir 下的 wiki 文件，无回收站**。辅助向量（`ki-relation` / `ki-path`）按向量文档上的 `group` 标量字段枚举清扫，跨组共享的确定性 docId 受保护（`sharedKept` / `sharedContentKept`）。
- 文档级 `ki delete-relation` 现在**只删单条**（`-g` + `-r` 两者必填）；只给 `-g` 会报错并提示改用 `ki group delete`（D2 决策：删组入口唯一）。
- MCP 只暴露 `ki_group_list` / `ki_group_create` / `ki_group_delete_empty`（仅空节点删除）；级联删组不通过 MCP 暴露（NEG-15：不可逆且无二次确认交互）。
- 历史误记（2026-10-20 订正）：旧记载「`ki manage-index --action delete --force` 与 `ki delete-relation -g` 两条删组路径」均已失效，勿再引用。