---
groupPath: 项目踩坑点
relation: ki bulk_sync_relation 自动补建 Group 树
exportedAt: "2026-10-16T03:52:14.870Z"
---
**ki_bulk_sync_relation 自动补建 Group 树**

- 现象：使用 ki_bulk_sync_relation 时无需先调用 ki_manage_index_create 创建 Group——该工具会自动补建缺失的 Group 路径（schema 描述：自动补建 Group 树）
- 正确做法：直接批量写入（group 支持 / 层级嵌套，如 接口信息/新模块），缺父组自动创建
- 仍需 index_create 的场景：仅建空组不写入、或单条 ki_sync_relation（未确认其是否也自动建组，保险起见单条写新组前可先 bulk 一次）
- 来源：用户指正（2026-10-15）