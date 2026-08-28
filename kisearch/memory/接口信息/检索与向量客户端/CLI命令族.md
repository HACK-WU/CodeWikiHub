---
groupPath: 接口信息/检索与向量客户端
relation: CLI命令族
exportedAt: "2026-08-28T08:32:14.069Z"
---
检索与向量客户端对外 CLI（全部输出 JSON，失败退出码 1）：
- `ki search <query>`（-s/--scope -q/--query --limit 10 --threshold 0 --tags --original）：语义检索；query 支持位置参数（REQ-12，--query 保留兼容）。默认搜全部=单次多 tag OR（1 次 embedding）；--original 才返回 local KB 文件级原文（REQ-09）。
- `ki store <text>`（-s/--scope -t/--text --tags ki-search）：单条向量存储；text 支持位置参数。只写向量层。
- `ki bulk_store --input <file>`（-s/--scope）：批量**向量层**存储；输入必须是 JSON 数组，每项 {text, tags?}；缺 text → 整体报错「第 N 条缺少 text 字段」。**不写 relations-cache/local KB/group 树，勿用于写知识记忆**。
- `ki doc list`（-s/--scope --limit 10 --tags --full）：列出向量文档（content 默认截断 200 字，--full 显示完整；顺序不保证）。
- `ki doc delete <docid...>`（-s/--scope --yes）：按 docid 删除；**无 --yes 仅预览并拒绝**（requireConfirm + willDelete 预览）；跨 scope 的 id 进 scopeMismatch 跳过。只删向量层不联动 KB。
- `ki tag list`（-s/--scope --scan-limit 10000）：列出 tag（含文档数，近似，truncated 标志）。
注意：ki doc 无 MCP 暴露（管理面仅 CLI）。