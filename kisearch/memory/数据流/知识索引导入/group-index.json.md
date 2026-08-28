---
groupPath: 数据流/知识索引导入
relation: group-index.json
exportedAt: "2026-08-28T04:31:34.207Z"
---
【数据流｜group-index.json】
- 实体类型：group 层级树 JSON
- 生产方：handleDirectImport @ src/lib/import.ts（第 3 步建树）
- 消费方：group 树查询、export 子树收集、delete-group 级联
- 业务用途：维护知识库 group 层级结构，支撑树形浏览与子树操作
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md